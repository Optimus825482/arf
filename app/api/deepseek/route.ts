import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminDb } from "@/lib/adminAuth";
import { verifyRequest, unauthorized } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { getDifficultyProfile } from "@/lib/commander";
import { deepseekRequestSchema, formatZodError } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { PEDAGOGICAL_BASE } from "@/lib/knowledge/pedagogy";

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

    const settingsSnap = await db.doc("settings/deepseek_api_key").get();
    const dbApiKey = settingsSnap.exists ? (settingsSnap.data()?.value as string) : null;
    const apiKey = process.env.DEEPSEEK_API_KEY || dbApiKey;

    if (!apiKey) {
      return NextResponse.json({ error: "DeepSeek API anahtarı bulunamadı!" }, { status: 400 });
    }

    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: apiKey,
    });

    let struggles = "none";
    if (performanceHistory) {
      const struggleAreas: string[] = [];
      if (typeof performanceHistory.addSubScore === "number" && performanceHistory.addSubScore < 70) struggleAreas.push("toplama/çıkarma");
      if (typeof performanceHistory.mulDivScore === "number" && performanceHistory.mulDivScore < 70) struggleAreas.push("çarpma/bölme");
      if (typeof performanceHistory.speedScore === "number" && performanceHistory.speedScore < 50) struggleAreas.push("hız/reaksiyon süresi");
      if (struggleAreas.length > 0) struggles = struggleAreas.join(", ");
    }

    const difficultyProfile = getDifficultyProfile({
      level,
      metrics: (performanceHistory ?? {}) as Record<string, number>,
    });

    const prompt = `
SEN: ${PEDAGOGICAL_BASE.persona.name}.
ROL: ${PEDAGOGICAL_BASE.persona.role}
GOREV: Seviyesi ${level || 1} olan bir pilot icin "Yeni Nesil" boss matematik problemi uret.
ANALIZ: Zorlandigi alanlar: ${struggles}. Profil: ${difficultyProfile.label}.
PEDAGOJI:
- ${PEDAGOGICAL_BASE.scientificFoundations.visualMathematics.application}
- ${PEDAGOGICAL_BASE.methods.singaporeMath}
- Hata durumunda ogrenciyi destekleyecek ipucu ekle.
SADECE JSON dön:
{
  "question": "Uzay temalı problem metni",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Doğru seçenek",
  "category": "ai_sayi_teorisi | ai_cebir | ai_geometri",
  "explanation": "Çözüm açıklaması",
  "hint": "İpucu"
}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "deepseek-reasoner", // Muhakeme odaklı model
    });

    let content = completion.choices[0].message.content || "{}";
    if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
    else if (content.includes("```")) content = content.split("```")[1].split("```")[0].trim();

    return NextResponse.json(JSON.parse(content));
  } catch (error: unknown) {
    logger.error("DeepSeek Error", error);
    return NextResponse.json({ error: "Soru üretilirken bir hata oluştu." }, { status: 500 });
  }
}
