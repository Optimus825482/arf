import { NextResponse } from "next/server";
import { adminUnavailable, getAdminDb, unauthorized, verifyRequest } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import {
  buildFallbackMissionPack,
  type DailyMissionPack,
  type MissionCard,
  type MissionMode,
} from "@/lib/missions";
import { sanitizePromptInput, sanitizePromptValue } from "@/lib/sanitize";
import { PEDAGOGICAL_BASE } from "@/lib/knowledge/pedagogy";

const RAG_CONTEXT_MODULE = "../../../lib/rag/context";

async function loadPedagogicalRagContext(query: string, maxLen = 600) {
  try {
    const ragModule = await import(RAG_CONTEXT_MODULE);
    const builder =
      ragModule.buildPedagogicalRagContext ||
      ragModule.buildRagContext ||
      ragModule.getRagContext;

    if (typeof builder !== "function") return "";

    const result = await builder({
      query: sanitizePromptInput(query, 220),
      limit: 2,
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

    const sources = Array.isArray(record.sources) ? record.sources.slice(0, 2) : [];
    return sanitizePromptInput(
      sources.map((source) => {
        const item = source && typeof source === "object" ? source as Record<string, unknown> : {};
        return [
          typeof item.title === "string" ? item.title : "",
          typeof item.summary === "string" ? item.summary : "",
          typeof item.content === "string" ? item.content : "",
        ].filter(Boolean).join(": ");
      }).filter(Boolean).join(" | "),
      maxLen,
    );
  } catch {
    return "";
  }
}

async function buildAiMissionPack(payload: {
  apiKey: string;
  username?: string;
  actionPlan?: string;
  learningPath?: string;
  metrics?: Record<string, unknown>;
  level?: number;
  xp?: number;
}) {
  const username = sanitizePromptInput(payload.username, 64) || "Pilot";
  const actionPlan = sanitizePromptInput(payload.actionPlan, 1000) || "Yok";
  const learningPath = sanitizePromptInput(payload.learningPath, 1000) || "Yok";
  const metrics = sanitizePromptValue(payload.metrics || {}, {
    stringMaxLen: 128,
    maxDepth: 3,
    maxEntries: 30,
  });
  const ragContext = await loadPedagogicalRagContext(
    `daily mission math practice action ${actionPlan} path ${learningPath} metrics ${JSON.stringify(metrics)}`,
    600,
  );
  const prompt = `Sen uzay akademisinin komuta yapay zekasisin.
Asagidaki ogrenci icin bugunluk gorev merkezi paketi uret.

Ogrenci:
- Ad: ${username}
- Seviye: ${payload.level || 1}
- XP: ${payload.xp || 0}
- Aksiyon plani: ${actionPlan}
- Ogrenme yolu: ${learningPath}
- Metrikler: ${JSON.stringify(metrics)}

PEDAGOJIK/RAG SINYALI:
- Temel: ${PEDAGOGICAL_BASE.rag_index.math_mastery}
${ragContext ? `- Kisa kaynak: ${ragContext}` : "- Kisa kaynak: Yok"}
- Gorevleri mikro-ogrenme, gorsellestirme ve dusuk bilissel yuk ilkelerine gore kisa tut.

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
      "accent": "cyan | red | cyan | cyan"
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
      model: "deepseek-v4-pro", // Stratejik görev planlaması için R1 modeline geçildi
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  let content = data.choices[0]?.message?.content || "{}";
  
  // Markdown JSON bloklarını temizle
  if (content.startsWith("```json")) {
    content = content.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (content.startsWith("```")) {
    content = content.replace(/^```/, "").replace(/```$/, "").trim();
  }

  return JSON.parse(content);
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

    const apiKey = process.env.DEEPSEEK_API_KEY;

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
