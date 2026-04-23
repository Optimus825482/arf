import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminDb } from "@/lib/adminAuth";
import { verifyRequest, unauthorized } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { getDifficultyProfile } from "@/lib/commander";
import { deepseekRequestSchema, formatZodError } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const db = getAdminDb();
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();
    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 15,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    let rawBody;
    try { rawBody = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 }); }
    const parsedBody = deepseekRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: `Geçersiz istek: ${formatZodError(parsedBody.error)}` }, { status: 400 });
    }
    const { level, performanceHistory } = parsedBody.data;

    // Get DeepSeek API key from env or Firestore settings
    const settingsSnap = await db.doc("settings/deepseek_api_key").get();
    const dbApiKey = settingsSnap.exists
      ? (settingsSnap.data()?.value as string)
      : null;

    const apiKey = process.env.DEEPSEEK_API_KEY || dbApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "DeepSeek API anahtarı sistemde (.env) veya Veli ayarlarında bulunamadı!",
        },
        { status: 400 },
      );
    }

    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: apiKey,
    });

    // Extract categories student is struggling with from performance metrics
    let struggles = "none";
    if (performanceHistory) {
      const struggleAreas: string[] = [];
      if (
        typeof performanceHistory.addSubScore === "number" && performanceHistory.addSubScore < 70
      ) {
        struggleAreas.push("toplama/çıkarma");
      }
      if (
        typeof performanceHistory.mulDivScore === "number" && performanceHistory.mulDivScore < 70
      ) {
        struggleAreas.push("çarpma/bölme");
      }
      if (
        typeof performanceHistory.speedScore === "number" && performanceHistory.speedScore < 50
      ) {
        struggleAreas.push("hız/reaksiyon süresi");
      }
      if (struggleAreas.length > 0) {
        struggles = struggleAreas.join(", ");
      }
    }

    const difficultyProfile = getDifficultyProfile({
      level,
      metrics: (performanceHistory ?? {}) as Record<string, number>,
    });

    const prompt = `Sen eğlenceli ve cesaretlendirici bir uzay gemisi yapay zekasısın.
Seviyesi ${level || 1} olan bir ilkokul/ortaokul öğrencisi için "Yeni Nesil" diye tabir edilen, okuduğunu anlama problemi tarzında, uzay veya bilim kurgu temalı bir matematik zorluk (boss) problemi üret.
Öğrencinin seviyesi arttıkça sayılar ve sorunun karmaşıklığı 1 adım daha zorlaşmalıdır.

Mevcut Performans Analizi:
- Öğrencinin zorlandığı alanlar: ${struggles}
- Dinamik zorluk profili: ${difficultyProfile.label}
- Zorluk açıklaması: ${difficultyProfile.description}
- Eğer öğrenci bir alanda zorlanıyorsa (başarı < %70), o alanda öğretici ama zorlayıcı bir soru sor.

Zorluk Kurallari:
- adaptive_recovery: soru daha ogretici, tek adim veya kolay iki adim olsun.
- steady_flight: orta zorlukta, dikkat isteyen ama korkutmayan bir problem olsun.
- advanced_ops: daha buyuk sayilar, daha fazla dikkat, 2-3 adimli kurgu kullan.
- commander_trial: kolay kazanilmayacak sekilde, hiz ve islem disiplini gerektiren cok adimli bir problem sor.
- Cocuk dostu kal; zorluk artsa da soru anlasilir olsun.

LÜTFEN SADECE JSON formatında ve aşağıdaki anahtarlarla dön. Category parametresi matematiksel kategoriyi belirtsin (örn: "ai_cebir", "ai_geometri", "ai_sayi_teorisi", "ai_olculer").
{
  "question": "Uzay gemimiz Zork gezegenine...",
  "options": ["12", "14", "16", "18"],
  "correctAnswer": "14",
  "category": "ai_sayi_teorisi",
  "explanation": "Çünkü önce 2 ile 5'i toplarız...",
  "hint": "Gezegene varış süresi toplam yakıtın yarısı kadardır..."
}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "deepseek-chat",
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    logger.error("DeepSeek Error", error, { route: "POST /api/deepseek" });
    const message =
      error instanceof Error
        ? error.message
        : "Yapay Zeka sorusu üretilirken hata oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
