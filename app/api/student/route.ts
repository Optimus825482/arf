import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRequest, unauthorized, forbidden } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { PEDAGOGICAL_BASE } from "@/lib/knowledge/pedagogy";
import { HyperCognitiveEngine } from "@/lib/cognitiveMemory";


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

    const isSelf = authed.uid === uid || authed.uid === "unverified";
    
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
      if (typeof xpToAdd !== "number") {
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

        const updateData: any = {
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
      const { results } = body;
      if (!Array.isArray(results)) {
        return NextResponse.json({ error: "Results array required" }, { status: 400 });
      }

      let addSubC = 0, addSubT = 0;
      let mulDivC = 0, mulDivT = 0;
      let mmC = 0, mmT = 0;
      let timeT = 0;

      results.forEach((r: any) => {
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
      const mmAvgTime = mmT ? mmT / results.length : 0;
      const mmSpeedBonus = Math.max(0, 100 - (mmAvgTime - 1500) / 50);

      const mentalMathScore = Math.round(
        mentalMathAccuracy * 0.6 + Math.min(100, mmSpeedBonus) * 0.4,
      );
      const accuracy = Math.round(
        ((addSubC + mulDivC + mmC) / results.length) * 100,
      );
      const avgTimeMs = timeT / results.length;

      let speedScore = Math.round(100 - (avgTimeMs - 2000) / 100);
      if (speedScore > 100) speedScore = 100;
      if (speedScore < 0) speedScore = 0;

      const firstHalf = results.slice(0, Math.ceil(results.length / 2));
      const secondHalf = results.slice(Math.ceil(results.length / 2));
      
      type ResultItem = { correct: boolean; time: number };
      const firstHalfAccuracy = (firstHalf.filter((r: ResultItem) => r.correct).length / firstHalf.length) * 100;
      const secondHalfAccuracy = (secondHalf.filter((r: ResultItem) => r.correct).length / secondHalf.length) * 100;
      const firstHalfSpeed = firstHalf.reduce((acc: number, r: ResultItem) => acc + r.time, 0) / firstHalf.length;
      const secondHalfSpeed = secondHalf.reduce((acc: number, r: ResultItem) => acc + r.time, 0) / secondHalf.length;

      const concentrationScore = Math.round(
        (secondHalfAccuracy >= firstHalfAccuracy ? 100 : (secondHalfAccuracy / firstHalfAccuracy) * 100) * 0.7 +
        (secondHalfSpeed <= firstHalfSpeed * 1.2 ? 30 : 0)
      );

      const times = results.map((r: ResultItem) => r.time);
      const avgTime = timeT / results.length;
      const variance = times.reduce((acc: number, t: number) => acc + Math.pow(t - avgTime, 2), 0) / times.length;
      const perceptionScore = Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / 100))));

      const l1State = HyperCognitiveEngine.processWorkingMemory(uid, { accuracy, frustrationLevel: 0, fatigueRatio: secondHalfSpeed / firstHalfSpeed });
      const mentalState = await HyperCognitiveEngine.getCognitiveContext(uid);

      const metrics = {
        accuracy,
        speedScore,
        addSubScore,
        mulDivScore,
        mentalMathScore,
        concentrationScore,
        perceptionScore,
        fatigueRatio: secondHalfSpeed / firstHalfSpeed,
        frustrationLevel: l1State.currentAnxietyLevel,
        reflectionLevel: 0
      };

      let level = 1;
      let actionPlan = "";
      let learningPath = "";
      let aiError = false;

      try {
        let apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          const settingsSnap = await db.doc("settings/deepseek_api_key").get();
          if (settingsSnap.exists) apiKey = settingsSnap.data()?.value;
        }

        if (apiKey) {
          const prompt = `
SEN: ARF Quantum Rehberlik Sistemi.
GÖREV: Bilişsel analiz yap ve gelişim planla.
TELEMETRİ: İsabet %${accuracy}, Hız ${speedScore}, Yorulma ${metrics.fatigueRatio.toFixed(2)}x, Odak %${concentrationScore}.
HAFIZA: ${mentalState}
SADECE JSON dön: { "recommendedLevel": 1-5, "actionPlan": "tavsiye", "learningPath": "konu listesi" }`;

          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "deepseek-reasoner",
              messages: [{ role: "user", content: prompt }]
            })
          });

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
            } catch (e) { aiError = true; }
          } else { aiError = true; }
        }
      } catch (e) { aiError = true; }

      if (!actionPlan) {
        if (accuracy >= 80) level = 3;
        else if (accuracy >= 50) level = 2;
        actionPlan = "Temel işlemlerde pratik yapmaya devam et.";
        learningPath = "Toplama -> Çıkarma -> Çarpma";
      }

      await HyperCognitiveEngine.consolidateToEpisodic(uid, l1State, "neutral");
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
      const mentalState = await HyperCognitiveEngine.getCognitiveContext(uid);

      let newActionPlan = u.actionPlan || "";
      let newLearningPath = u.learningPath || "";
      let aiError = false;

      try {
        let apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          const settingsSnap = await db.doc("settings/deepseek_api_key").get();
          if (settingsSnap.exists) apiKey = settingsSnap.data()?.value;
        }
        if (apiKey) {
          const prompt = `REASSESS: Metrikler ${JSON.stringify(m)}, Hafıza: ${mentalState}. SADECE JSON.`;
          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "deepseek-reasoner", messages: [{ role: "user", content: prompt }] })
          });

          if (response.ok) {
            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            if (content.includes("```json")) content = content.split("```json")[1].split("```")[0].trim();
            const parsed = JSON.parse(content);
            newActionPlan = parsed.actionPlan;
            newLearningPath = parsed.learningPath;
          } else { aiError = true; }
        }
      } catch (e) { aiError = true; }

      await HyperCognitiveEngine.consolidateToEpisodic(uid, l1State, "neutral");
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
