import { NextResponse } from "next/server";
import OpenAI from "openai";
import { verifyRequest, unauthorized } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { getDifficultyProfile } from "@/lib/commander";
import { deepseekRequestSchema, formatZodError } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();
    
    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 15,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    let rawBody;
    try { 
        rawBody = await req.json(); 
    } catch { 
        return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 }); 
    }
    
    const parsedBody = deepseekRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: `Geçersiz istek: ${formatZodError(parsedBody.error)}` }, { status: 400 });
    }
    
    const { level, performanceHistory } = parsedBody.data;

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "DeepSeek API anahtarı bulunamadı!" }, { status: 400 });
    }

    const openai = new OpenAI({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: apiKey,
    });

    let struggles = "yok";
    if (performanceHistory) {
      const areas: string[] = [];
      if (performanceHistory.addSubScore && performanceHistory.addSubScore < 70) areas.push("toplama/çıkarma");
      if (performanceHistory.mulDivScore && performanceHistory.mulDivScore < 70) areas.push("çarpma/bölme");
      if (areas.length > 0) struggles = areas.join(", ");
    }

    const difficultyProfile = getDifficultyProfile({
      level: level || 1,
      metrics: performanceHistory ?? {},
    });

    const prompt = `
SEN: ARF Uzay Gemisi Yapay Zekası.
GÖREV: Seviyesi ${level || 1} olan bir pilot için "Yeni Nesil" boss matematik problemi üret.
ANALİZ: Zorlandığı alanlar: ${struggles}. Profil: ${difficultyProfile.label}.

LÜTFEN SADECE JSON formatında ve aşağıdaki anahtarlarla dön:
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
      model: "deepseek-v4-pro", // Muhakeme odaklı model
    });

    let content = completion.choices[0].message.content || "{}";
    
    // JSON temizleme (Markdown bloklarını kaldır)
    if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
        content = content.split("```")[1].split("```")[0].trim();
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (error: unknown) {
    logger.error("DeepSeek Error", error);
    return NextResponse.json({ error: "Yapay Zeka hatası" }, { status: 500 });
  }
}
