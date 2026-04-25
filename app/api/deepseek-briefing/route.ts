import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAdminDb } from "@/lib/adminAuth";
import { verifyRequest, unauthorized, forbidden } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { briefingRequestSchema, formatZodError } from "@/lib/schemas";
import { PEDAGOGICAL_BASE } from "@/lib/knowledge/pedagogy";
import { sanitizePromptInput } from "@/lib/sanitize";

const RAG_CONTEXT_MODULE = "../../../lib/rag/context";

async function loadPedagogicalRagContext(query: string, maxLen = 800) {
  try {
    const ragModule = await import(RAG_CONTEXT_MODULE);
    const builder =
      ragModule.buildPedagogicalRagContext ||
      ragModule.buildRagContext ||
      ragModule.getRagContext;

    if (typeof builder !== "function") return "";

    const result = await builder({
      query: sanitizePromptInput(query, 240),
      limit: 3,
      maxChars: maxLen,
    });
    const formatter = ragModule.formatRagContextForPrompt;
    const formatted = typeof formatter === "function"
      ? formatter(result, { maxChars: maxLen })
      : result;

    if (typeof formatted === "string") {
      return sanitizePromptInput(formatted, maxLen);
    }

    const record = formatted && typeof formatted === "object"
      ? formatted as Record<string, unknown>
      : {};
    const direct =
      typeof record.promptContext === "string" ? record.promptContext :
      typeof record.context === "string" ? record.context :
      typeof record.text === "string" ? record.text :
      "";
    if (direct) return sanitizePromptInput(direct, maxLen);

    const sources = Array.isArray(record.sources) ? record.sources.slice(0, 3) : [];
    return sanitizePromptInput(
      sources.map((source) => {
        const item = source && typeof source === "object" ? source as Record<string, unknown> : {};
        return [
          typeof item.title === "string" ? item.title : "",
          typeof item.content === "string" ? item.content : "",
          typeof item.summary === "string" ? item.summary : "",
        ].filter(Boolean).join(": ");
      }).filter(Boolean).join(" | "),
      maxLen,
    );
  } catch (error) {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const db = getAdminDb();
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();
    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 10,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    let rawBody;
    try { rawBody = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 }); }
    const parsed = briefingRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Öğrenci verisi eksik/hatalı: " + formatZodError(parsed.error) }, { status: 400 });
    }
    const { studentId, performance, level, xp } = parsed.data;
    const studentName = sanitizePromptInput(parsed.data.studentName, 128) || "Pilot";
    const actionPlan = sanitizePromptInput(parsed.data.actionPlan, 2000);
    const learningPath = sanitizePromptInput(parsed.data.learningPath, 2000);
    const badges = (parsed.data.badges || []).map((b: string) => sanitizePromptInput(b, 64)).filter(Boolean);

    // Security check: Ensure parent is linked to this student
    const isDevBypass = authed.uid === "unverified" && process.env.NODE_ENV !== "production";
    if (!isDevBypass) {
      const parentSnap = await db.doc(`parents/${authed.uid}`).get();
      const parentData = parentSnap.data();
      if (!parentData?.linkedPilots?.includes(studentId)) {
        return forbidden();
      }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "DeepSeek API anahtarı ayarlanmamış" },
        { status: 401 },
      );
    }

    const accuracy =
      performance["classic"]?.totalAttempts > 0
        ? Math.round(
            (performance["classic"].correctAttempts /
              performance["classic"].totalAttempts) *
              100,
          )
        : 0;
    const addSub =
      performance["add_sub"]?.totalAttempts > 0
        ? Math.round(
            (performance["add_sub"].correctAttempts /
              performance["add_sub"].totalAttempts) *
              100,
          )
        : 0;
    const mulDiv =
      performance["mul_div"]?.totalAttempts > 0
        ? Math.round(
            (performance["mul_div"].correctAttempts /
              performance["mul_div"].totalAttempts) *
              100,
          )
        : 0;

    const frameworks = PEDAGOGICAL_BASE.scientificFrameworks;
    const strategies = PEDAGOGICAL_BASE.instructionalStrategies;
    const ragContext = await loadPedagogicalRagContext(
      `parent briefing math support accuracy ${accuracy} add_sub ${addSub} mul_div ${mulDiv} action ${actionPlan} path ${learningPath}`,
      800,
    );

    const prompt = `
	Aşağıda ${studentName} adlı öğrencinin uzay akademisi simülasyonundaki istatistikleri ve sistem tarafından atanan planlar verilmiştir.
		Sen ARF Görev Gözlem Sistemi kimliğinde, oyun evrenine uygun ve veri temelli bir komuta raporu hazırlıyorsun.
	Rapor ebeveyne yönelik olacak; güçlü yönleri, gelişim alanlarını ve evde uygulanabilir küçük destek önerilerini içersin.
	Dil sakin, yapıcı, teşvik edici ve uzay/bilimkurgu konseptine uygun olsun. Klinik, mesleki veya resmi değerlendirme otoritesi gibi konuşma; sistem içi "Gözcü Notu" dili kullan.
	Komuta ilkeleri:
	- ${frameworks.cognitiveLoadManagement.ai_action}
	- ${frameworks.neuroplasticity.ai_action}
	- ${frameworks.spatialTemporalReasoning.application}
	- ${strategies.scaffolding.join(" ")}

Veriler:
- Seviye: ${level || 1}
- XP (Deneyim Puanı): ${xp || 0}
- Genel İsabet Oranı: %${accuracy}
- Kalkan Yönetimi (Toplama/Çıkarma) Başarısı: %${addSub}
- İtki Sistemleri (Çarpma/Bölme) Başarısı: %${mulDiv}
- Kazanılan Nişanlar: ${badges && badges.length > 0 ? badges.join(", ") : "Henüz kazanılmadı"}

Komuta Sistemi Notları:
- Stratejik Plan: ${actionPlan || "Henüz atanmadı"}
- Öğrenme Yolu: ${learningPath || "Henüz belirlenmedi"}

VELIYE YONELIK KAYNAK DESTEKLI ONERI:
- Pedagojik dayanak: ${PEDAGOGICAL_BASE.rag_index.learning_sources}
${ragContext ? `- Kısa kaynak sinyali: ${ragContext}` : "- Kısa kaynak sinyali: Yok"}
- Bu bölümü kesin yargı gibi değil, evde denenebilir küçük destek önerisi olarak yaz.

Lütfen raporu kısa paragraflar halinde yaz ve markdown kullanarak okunabilirliği artır. Raporun sonunda ebeveyne "Gözcü Notu" başlığıyla kısa bir özet ekle.
`.trim();
const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "deepseek-v4-pro", // Muhakeme odaklı model (Think özelliği aktif)
    messages: [{ role: "user", content: prompt }],
  }),
});

if (!response.ok) {
  const errText = await response.text();
  logger.error("DeepSeek API Hatası:", errText);
  return NextResponse.json(
    { error: "Komuta raporu hazırlanamadı." },
    { status: 500 },
  );
}

const data = await response.json();

// Muhakeme (Think) sürecini logla
if (data.choices[0].message.reasoning_content) {
  logger.info("Veli Brifingi Muhakeme Süreci (Think):", { reasoning: data.choices[0].message.reasoning_content });
}

const briefing = data.choices[0]?.message?.content;


    if (!briefing) {
      return NextResponse.json(
        { error: "Komuta raporu boş döndü." },
        { status: 500 },
      );
    }

    await db.doc(`users/${studentId}`).set(
      {
        lastBriefing: briefing,
        lastBriefingAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ briefing });
  } catch (error) {
    logger.error("Briefing error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
