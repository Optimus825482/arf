import { NextResponse } from "next/server";
import { adminUnavailable, getAdminDb, unauthorized, verifyRequest } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import {
  buildFallbackMissionPack,
  type DailyMissionPack,
  type MissionCard,
  type MissionMode,
} from "@/lib/missions";

async function buildAiMissionPack(payload: {
  apiKey: string;
  username?: string;
  actionPlan?: string;
  learningPath?: string;
  metrics?: Record<string, unknown>;
  level?: number;
  xp?: number;
}) {
  const prompt = `Sen uzay akademisinin komuta yapay zekasisin.
Asagidaki ogrenci icin bugunluk gorev merkezi paketi uret.

Ogrenci:
- Ad: ${payload.username || "Pilot"}
- Seviye: ${payload.level || 1}
- XP: ${payload.xp || 0}
- Aksiyon plani: ${payload.actionPlan || "Yok"}
- Ogrenme yolu: ${payload.learningPath || "Yok"}
- Metrikler: ${JSON.stringify(payload.metrics || {})}

SADECE JSON don.
{
  "title": "kisa bir gorev paketi basligi",
  "commanderNote": "komutandan 1-2 cumlelik briefing",
  "motivationMessage": "gune ozel motive edici mesaj",
  "missions": [
    {
      "id": "focus-drill",
      "title": "gorev adi",
      "mode": "pratik | yildirim | gorev | taktikler",
      "focus": "hedef beceri",
      "difficulty": "kolay | orta | zor | komutanlik sinavi",
      "xpReward": 35,
      "estimatedMinutes": 6,
      "briefing": "gorev oncesi briefing",
      "motivation": "goreve ozel motivasyon",
      "accent": "cyan | red | emerald | purple"
    }
  ]
}`;

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return JSON.parse(data.choices[0]?.message?.content || "{}");
}

export async function GET(req: Request) {
  try {
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 12,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    let db;
    try {
      db = getAdminDb();
    } catch (error) {
      console.error("Missions route admin init failed:", error);
      return adminUnavailable();
    }
    const userRef = db.doc(`users/${authed.uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    const today = new Date().toISOString().split("T")[0];
    const existingPack = userData.dailyMissionPack as DailyMissionPack | undefined;

    if (existingPack?.date === today && existingPack?.missions?.length) {
      return NextResponse.json(existingPack);
    }

    let missionPack = buildFallbackMissionPack({
      username: userData.username,
      actionPlan: userData.actionPlan,
      learningPath: userData.learningPath,
      metrics: userData.metrics,
      level: userData.level,
      xp: userData.xp,
      dailyTasks: userData.dailyTasks,
    });

    let apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      const settingsSnap = await db.doc("settings/deepseek_api_key").get();
      if (settingsSnap.exists && settingsSnap.data()?.value) {
        apiKey = settingsSnap.data()!.value as string;
      }
    }

    if (apiKey) {
      try {
        const aiPack = await buildAiMissionPack({
          apiKey,
          username: userData.username,
          actionPlan: userData.actionPlan,
          learningPath: userData.learningPath,
          metrics: userData.metrics,
          level: userData.level,
          xp: userData.xp,
        });

        missionPack = {
          date: today,
          generatedAt: new Date().toISOString(),
          title: aiPack.title || missionPack.title,
          commanderNote: aiPack.commanderNote || missionPack.commanderNote,
          motivationMessage: aiPack.motivationMessage || missionPack.motivationMessage,
          missions: Array.isArray(aiPack.missions) && aiPack.missions.length
            ? aiPack.missions.map((mission: Partial<MissionCard> & { mode?: MissionMode }) => ({
                id: mission.id || `mission-${Math.random().toString(36).slice(2, 8)}`,
                title: mission.title || "AI Gorevi",
                mode: mission.mode || "pratik",
                route:
                  mission.mode === "yildirim"
                    ? "/ogrenci/yildirim"
                    : mission.mode === "gorev"
                      ? "/ogrenci/gorev"
                      : mission.mode === "taktikler"
                        ? "/ogrenci/taktikler"
                        : "/ogrenci/pratik",
                focus: mission.focus || "Genel beceri",
                difficulty: mission.difficulty || "Orta",
                xpReward: Number(mission.xpReward) || 25,
                estimatedMinutes: Number(mission.estimatedMinutes) || 5,
                briefing: mission.briefing || "Komuta sistemi gorev oncesi hazirlik istiyor.",
                motivation: mission.motivation || "Disiplini koru pilot.",
                accent: mission.accent || "cyan",
              }))
            : missionPack.missions,
        };
      } catch (error) {
        console.error("Mission pack AI fallback used:", error);
      }
    }

    await userRef.set(
      {
        dailyMissionPack: missionPack,
        missionPackGeneratedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json(missionPack);
  } catch (error) {
    console.error("Missions route error:", error);
    return NextResponse.json({ error: "Mission pack could not be created" }, { status: 500 });
  }
}
