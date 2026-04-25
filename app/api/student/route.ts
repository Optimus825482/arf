import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminAuth";
import { sanitizePromptInput, sanitizePromptValue } from "@/lib/sanitize";
import { placementPayloadSchema, formatZodError } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRequest, unauthorized, forbidden } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { PEDAGOGICAL_BASE } from "@/lib/knowledge/pedagogy";
import { HyperCognitiveEngine, classifyOutcome } from "@/lib/cognitiveMemory";

const RAG_CONTEXT_MODULE = "../../../lib/rag/context";

function buildLearningRoutePromptSection() {
  const frameworks = PEDAGOGICAL_BASE.scientificFrameworks;
  const metacognition = PEDAGOGICAL_BASE.affectiveMetacognition;
  const strategies = PEDAGOGICAL_BASE.instructionalStrategies;

  return `
ROTA KIMLIGI:
- Rol: ARF Quantum Rota Sistemi, oyun evreni icinde veri temelli gelisim rotasi ureten komuta modulu
- Ton: Destekleyici, oyunlastirilmis ve yargilamayan
- Ses: Pilotun potansiyelini ortaya cikaran sakin komuta merkezi

BILIMSEL ILKELER:
- Noroplastisite: ${frameworks.neuroplasticity.insight} Uygulama: ${frameworks.neuroplasticity.ai_action}
- Gorsel/Uzamsal Matematik: ${frameworks.spatialTemporalReasoning.application}
- Bilissel Yuk: ${frameworks.cognitiveLoadManagement.threshold} durumunda ${frameworks.cognitiveLoadManagement.ai_action}

MUDAHALE KURALLARI:
- Kaygi: ${metacognition.anxiety_management.intervention}
- Frustrasyon: ${metacognition.frustration_loop.intervention}
- Growth Mindset: ${strategies.growthMindsetQuotes.join(" ")}

OGRETIM YONTEMLERI:
- Iskele Kurma: ${strategies.scaffolding.join(" ")}
- Referanslar: ${PEDAGOGICAL_BASE.rag_index.math_mastery}

DIL SINIRI:
- Klinik, mesleki veya resmi degerlendirme otoritesi gibi konusma.
- Ciktilari oyun ici "komuta rotasi", "gorev planı" ve "pilot destek sinyali" diliyle yaz.
`.trim();
}

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
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    let db;
    try {
      db = getAdminDb();
    } catch (error) {
      logger.error("Student route admin init failed", error);
      return NextResponse.json({ error: "Veritabanı bağlantısı hatası" }, { status: 503 });
    }

    const body = await req.json();
    const { uid, action } = body;

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const isDevBypass = authed.uid === "unverified" && process.env.NODE_ENV !== "production";
    const isSelf = authed.uid === uid || isDevBypass;
    
    if (!isSelf) {
      if (action === "reassess" && authed.email) {
        const targetSnap = await db.doc("users/" + uid).get();
        const studentData = targetSnap.exists ? targetSnap.data() : null;
        const parentEmail = studentData?.parentEmail;
        
        if (!parentEmail || parentEmail.toLowerCase() !== authed.email.toLowerCase()) {
          return forbidden();
        }
      } else {
        return forbidden();
      }
    }

    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 20,
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    const userRef = db.doc(`users/${uid}`);

    if (action === "add_xp") {
      const { xpToAdd, type } = body;
      if (typeof xpToAdd !== "number" || !Number.isFinite(xpToAdd) || xpToAdd <= 0 || xpToAdd > 500) {
        return NextResponse.json({ error: "Invalid XP" }, { status: 400 });
      }

      const res = await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        if (!snap.exists) throw new Error("User not found");
        const data = snap.data()!;
        
        const lastUpdate = data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : 0;
        if (Date.now() - lastUpdate < 5000) {
          throw Object.assign(new Error("Veri akışı çok hızlı. Biraz bekle pilot."), { code: 429 });
        }

        const newXp = (data.xp || 0) + xpToAdd;
        const currentLevel = data.level || 1;
        const nextLevelThreshold = currentLevel * 500;
        let newLevel = currentLevel;
        let leveledUp = false;

        if (newXp >= nextLevelThreshold) {
          newLevel = currentLevel + 1;
          leveledUp = true;
        }

        const updateData: Record<string, unknown> = {
          xp: newXp,
          level: newLevel,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (type) {
          const perfRef = userRef.collection("performance").doc(type);
          const pSnap = await t.get(perfRef);
          const pData = pSnap.data() || { correctAttempts: 0, totalAttempts: 0 };
          t.set(perfRef, {
            correctAttempts: pData.correctAttempts + 1,
            totalAttempts: pData.totalAttempts + 1,
            lastAttemptAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }

        t.set(userRef, updateData, { merge: true });
        return { leveledUp, newLevel, newXp };
      });

      return NextResponse.json(res);
    }

    if (action === "placement") {
      const parsedPlacement = placementPayloadSchema.safeParse(body);
      if (!parsedPlacement.success) {
        return NextResponse.json({ error: `Gecersiz placement verisi: ${formatZodError(parsedPlacement.error)}` }, { status: 400 });
      }
      const placementResults = parsedPlacement.data.results;

      let addSubC = 0, addSubT = 0;
      let mulDivC = 0, mulDivT = 0;
      let mmC = 0, mmT = 0;
      let timeT = 0;

      placementResults.forEach((r) => {
        timeT += r.time;
        if (r.type === "+" || r.type === "-") {
          addSubT++;
          if (r.correct) addSubC++;
        } else if (r.type === "x" || r.type === "÷") {
          mulDivT++;
          if (r.correct) mulDivC++;
        } else if (r.type === "mm") {
          mmT++;
          if (r.correct) mmC++;
        }
      });

      const addSubScore = addSubT ? Math.round((addSubC / addSubT) * 100) : 0;
      const mulDivScore = mulDivT ? Math.round((mulDivC / mulDivT) * 100) : 0;
      const mentalMathAccuracy = mmT ? Math.round((mmC / mmT) * 100) : 0;
      const mmAvgTime = mmT ? mmT / placementResults.length : 0;
      const mmSpeedBonus = Math.max(0, 100 - (mmAvgTime - 1500) / 50);

      const mentalMathScore = Math.round(
        mentalMathAccuracy * 0.6 + Math.min(100, mmSpeedBonus) * 0.4,
      );
      const accuracy = Math.round(
        ((addSubC + mulDivC + mmC) / placementResults.length) * 100,
      );
      const avgTimeMs = timeT / placementResults.length;

      let speedScore = Math.round(100 - (avgTimeMs - 2000) / 100);
      if (speedScore > 100) speedScore = 100;
      if (speedScore < 0) speedScore = 0;

      if (placementResults.length < 2) {
        return NextResponse.json({ error: "En az 2 sonuc gerekli" }, { status: 400 });
      }
      const firstHalf = placementResults.slice(0, Math.ceil(placementResults.length / 2));
      const secondHalf = placementResults.slice(Math.ceil(placementResults.length / 2));

      const safeLen = (n: number) => (n > 0 ? n : 1);
      const firstHalfAccuracy = (firstHalf.filter((r) => r.correct).length / safeLen(firstHalf.length)) * 100;
      const secondHalfAccuracy = (secondHalf.filter((r) => r.correct).length / safeLen(secondHalf.length)) * 100;
      const firstHalfSpeed = firstHalf.reduce((acc: number, r) => acc + (Number.isFinite(r.time) ? r.time : 0), 0) / safeLen(firstHalf.length);
      const secondHalfSpeed = secondHalf.reduce((acc: number, r) => acc + (Number.isFinite(r.time) ? r.time : 0), 0) / safeLen(secondHalf.length);
      const safeSpeedRatio = firstHalfSpeed > 0 ? secondHalfSpeed / firstHalfSpeed : 1;

      const concentrationScore = Math.round(
        (secondHalfAccuracy >= firstHalfAccuracy ? 100 : (secondHalfAccuracy / firstHalfAccuracy) * 100) * 0.7 +
        (secondHalfSpeed <= firstHalfSpeed * 1.2 ? 30 : 0)
      );

      const times = placementResults.map((r) => r.time);
      const avgTime = timeT / placementResults.length;
      const variance = times.reduce((acc: number, t: number) => acc + Math.pow(t - avgTime, 2), 0) / times.length;
      const perceptionScore = Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / 100))));

      const l1State = HyperCognitiveEngine.processWorkingMemory(uid, { accuracy, frustrationLevel: 0, fatigueRatio: safeSpeedRatio });
      const mentalState = await HyperCognitiveEngine.getCognitiveContext(uid, {
        accuracy,
        fatigueRatio: safeSpeedRatio,
        frustrationLevel: 0,
        currentFocus: addSubScore < mulDivScore ? "Toplama ve Cikarma" : "Carpma ve Bolme",
      });

      const metrics = {
        accuracy,
        speedScore,
        addSubScore,
        mulDivScore,
        mentalMathScore,
        concentrationScore,
        perceptionScore,
        fatigueRatio: safeSpeedRatio,
        frustrationLevel: l1State.currentAnxietyLevel,
        reflectionLevel: 0
      };

      let level = 1;
      let actionPlan = "";
      let learningPath = "";
      let aiError = false;

      try {
        const apiKey = process.env.DEEPSEEK_API_KEY;

        if (apiKey) {
          const ragContext = await loadPedagogicalRagContext(
            `placement math route accuracy ${accuracy} add_sub ${addSubScore} mul_div ${mulDivScore} mental_math ${mentalMathScore} fatigue ${metrics.fatigueRatio.toFixed(2)}`,
            800,
          );
          const prompt = `
SEN: ARF Quantum Rehberlik Sistemi.
GOREV: Bilissel analiz yap ve gelisim planla.
${buildLearningRoutePromptSection()}

PEDAGOJIK BAGLAM:
- Temel: ${PEDAGOGICAL_BASE.rag_index.learning_sources}
${ragContext ? `- KISA RAG KAYNAKLARI: ${ragContext}` : "- KISA RAG KAYNAKLARI: Yok"}

TELEMETRI:
- Isabet: %${accuracy}
- Hiz: ${speedScore}
- Toplama/Cikarma: %${addSubScore}
- Carpma/Bolme: %${mulDivScore}
- Zihinden Islem: %${mentalMathScore}
- Odak: %${concentrationScore}
- Algisal Tutarlilik: %${perceptionScore}
- Yorulma: ${metrics.fatigueRatio.toFixed(2)}x

HAFIZA:
${sanitizePromptInput(String(mentalState), 2000)}

CIKTI KURALI:
- Asla sert ya da yargilayici olma.
- Mikro-ogrenme, gorsellestirme ve gerekirse mola oner.
- actionPlan en fazla 2 cumle olsun.
- learningPath sirali ve kisa olsun.
- SADECE JSON don.
{
  "recommendedLevel": 1,
  "actionPlan": "tavsiye",
  "learningPath": "konu listesi"
}`;

          const response = await fetch(
            "https://api.deepseek.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "deepseek-v4-pro",
                messages: [{ role: "user", content: prompt }],
              }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
            else if (content.includes("```")) content = content.split("```")[1].split("```")[0].trim();
            
            try {
              const parsed = JSON.parse(content);
              level = parsed.recommendedLevel || 1;
              actionPlan = parsed.actionPlan || "";
              learningPath = parsed.learningPath || "";
            } catch { aiError = true; }
          } else { aiError = true; }
        }
      } catch { aiError = true; }

      if (!actionPlan) {
        if (accuracy >= 80) level = 3;
        else if (accuracy >= 50) level = 2;
        actionPlan = "Temel işlemlerde pratik yapmaya devam et.";
        learningPath = "Toplama -> Çıkarma -> Çarpma";
      }

      const episodicOutcome = classifyOutcome(accuracy);
      await HyperCognitiveEngine.consolidateToEpisodic(uid, l1State, episodicOutcome);
      await userRef.set({
        level,
        xp: (level - 1) * 100 + 50,
        metrics,
        actionPlan,
        learningPath,
        placementDone: true,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return NextResponse.json({ success: true, level, actionPlan, learningPath, aiError });
    }

    if (action === "reassess") {
      const userSnap = await userRef.get();
      if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const u = userSnap.data()!;
      const m = u.metrics || {};
      const currentVersion = u.planVersion || 1;

      const l1State = HyperCognitiveEngine.processWorkingMemory(uid, { accuracy: m.accuracy || 0, fatigueRatio: m.fatigueRatio || 1 });
      const mentalState = await HyperCognitiveEngine.getCognitiveContext(uid, {
        accuracy: m.accuracy || 0,
        fatigueRatio: m.fatigueRatio || 1,
        frustrationLevel: m.frustrationLevel || 0,
      });

      let newActionPlan = u.actionPlan || "";
      let newLearningPath = u.learningPath || "";
      let aiError = false;

      try {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (apiKey) {
          const safeMetrics = sanitizePromptValue(m, {
            stringMaxLen: 128,
            maxDepth: 3,
            maxEntries: 30,
          });
          const safeActionPlan = sanitizePromptInput(u.actionPlan, 1000) || "Yok";
          const safeLearningPath = sanitizePromptInput(u.learningPath, 1000) || "Yok";
          const safeMentalState = sanitizePromptInput(String(mentalState), 2000);
          const ragContext = await loadPedagogicalRagContext(
            `reassess math route metrics ${JSON.stringify(safeMetrics)} action ${safeActionPlan} path ${safeLearningPath}`,
            800,
          );
          const prompt = `
SEN: ARF Quantum Rehberlik Sistemi
GOREV: Mevcut ogrenci planini yeniden degerlendir.
${buildLearningRoutePromptSection()}

PEDAGOJIK BAGLAM:
- Temel: ${PEDAGOGICAL_BASE.rag_index.learning_sources}
${ragContext ? `- KISA RAG KAYNAKLARI: ${ragContext}` : "- KISA RAG KAYNAKLARI: Yok"}

MEVCUT METRIKLER:
${JSON.stringify(safeMetrics, null, 2)}

ONCEKI PLAN:
- Action plan: ${safeActionPlan}
- Learning path: ${safeLearningPath}
- Version: ${currentVersion}

HAFIZA:
${safeMentalState}

CIKTI KURALI:
- actionPlan en fazla 2 cumle olsun
- learningPath sirali ve kisa olsun
- yorulma yuksekse tempo azalt
- sadece JSON don
{
  "actionPlan": "guncel tavsiye",
  "learningPath": "sirali konu listesi"
}`;
          const response = await fetch(
            "https://api.deepseek.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "deepseek-v4-pro",
                messages: [{ role: "user", content: prompt }],
              }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
            try {
              const parsed = JSON.parse(content);
              newActionPlan = parsed.actionPlan;
              newLearningPath = parsed.learningPath;
            } catch (e) {
              logger.error("Reassess JSON parse failed", e);
              aiError = true;
            }
          } else { aiError = true; }
        }
      } catch { aiError = true; }

      const reassessOutcome = classifyOutcome(m.accuracy || 0);
      await HyperCognitiveEngine.consolidateToEpisodic(uid, l1State, reassessOutcome);
      await userRef.set({
        actionPlan: newActionPlan,
        learningPath: newLearningPath,
        planVersion: currentVersion + 1,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return NextResponse.json({ success: true, actionPlan: newActionPlan, learningPath: newLearningPath, aiError });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error("Student route error", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
