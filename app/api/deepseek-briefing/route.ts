import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAdminDb } from "@/lib/adminAuth";
import { verifyRequest, unauthorized, forbidden } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { briefingRequestSchema, formatZodError } from "@/lib/schemas";
import { PEDAGOGICAL_BASE } from "@/lib/knowledge/pedagogy";

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
    const { studentId, studentName, performance, badges, level, xp, actionPlan, learningPath } = parsed.data;

    // Security check: Ensure parent is linked to this student
    if (authed.uid !== "unverified") {
      const parentSnap = await db.doc(`parents/${authed.uid}`).get();
      const parentData = parentSnap.data();
      if (!parentData?.linkedPilots?.includes(studentId)) {
        return forbidden();
      }
    }

    let apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      const settingsSnap = await db.doc("settings/deepseek_api_key").get();
      if (settingsSnap.exists && settingsSnap.data()?.value) {
        apiKey = settingsSnap.data()!.value;
      }
    }

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

    const prompt = `
Aşağıda ${studentName} adlı öğrencinin uzay akademisi simülasyonundaki istatistikleri ve sistem tarafından atanan planlar verilmiştir.
Sen ${PEDAGOGICAL_BASE.persona.role} kimliğinde, profesyonel ve şefkatli bir pedagogsun.
Rapor ebeveyne yönelik olacak; güçlü yönleri, gelişim alanlarını ve evde uygulanabilir küçük destek önerilerini içersin.
Dil profesyonel, yapıcı, teşvik edici ve uzay/bilimkurgu konseptine uygun olsun.
Pedagojik ilkeler:
- ${PEDAGOGICAL_BASE.scientificFoundations.cognitiveLoadTheory.application}
- ${PEDAGOGICAL_BASE.scientificFoundations.growthMindset.application}
- ${PEDAGOGICAL_BASE.methods.singaporeMath}

Veriler:
- Seviye: ${level || 1}
- XP (Deneyim Puanı): ${xp || 0}
- Genel İsabet Oranı: %${accuracy}
- Kalkan Yönetimi (Toplama/Çıkarma) Başarısı: %${addSub}
- İtki Sistemleri (Çarpma/Bölme) Başarısı: %${mulDiv}
- Kazanılan Nişanlar: ${badges && badges.length > 0 ? badges.join(", ") : "Henüz kazanılmadı"}

Yapay Zeka Değerlendirmeleri:
- Stratejik Plan: ${actionPlan || "Henüz atanmadı"}
- Öğrenme Yolu: ${learningPath || "Henüz belirlenmedi"}

Lütfen raporu kısa paragraflar halinde yaz ve markdown kullanarak okunabilirliği artır. Raporun sonunda ebeveyne "Gözcü Notu" başlığıyla kısa bir özet ekle.
`.trim();
const response = await fetch(
  "https://api.deepseek.com/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-reasoner", // Muhakeme odaklı model (Think özelliği aktif)
      messages: [{ role: "user", content: prompt }],
    }),
  },
);

if (!response.ok) {
  const errText = await response.text();
  logger.error("DeepSeek API Hatası:", errText);
  return NextResponse.json(
    { error: "Yapay zeka ile iletişim kurulamadı." },
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
        { error: "Yapay zeka analizi boş döndü." },
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
