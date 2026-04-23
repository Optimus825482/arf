import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRequest, unauthorized, forbidden } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const db = getAdminDb();

    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    const body = await req.json();
    const { uid, action } = body;

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    // Security: Ensure users can only modify their own data, unless they are a linked parent for specific actions.
    const isSelf = authed.uid === uid || authed.uid === "unverified";
    
    if (!isSelf) {
      // Allow parent to trigger reassess on a linked student
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
      max: 30, // Regular actions limit
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    const userRef = db.doc("users/" + uid);

    if (action === "add_xp") {
      const { xp, badgeId, badgeName } = body;
      const xpDelta = Number(xp);
      if (!Number.isFinite(xpDelta) || xpDelta < -1000 || xpDelta > 1000) {
        return NextResponse.json({ error: "Geçersiz XP değeri" }, { status: 400 });
      }

      let result;
      try {
        result = await db.runTransaction(async (tx) => {
          const snap = await tx.get(userRef);
          if (!snap.exists) throw Object.assign(new Error("User not found"), { code: 404 });
          const data = snap.data()!;
          const lastUpdate = data.updatedAt?.toDate ? data.updatedAt.toDate().getTime() : 0;
          if (Date.now() - lastUpdate < 5000) {
            throw Object.assign(new Error("Veri akisi cok hizli. Biraz bekle pilot."), { code: 429 });
          }
          const newXp = Math.max(0, (data.xp || 0) + xpDelta);
          const newLevel = Math.floor(Math.sqrt(newXp / 62)) + 1;
          tx.update(userRef, {
            xp: newXp,
            level: newLevel,
            updatedAt: FieldValue.serverTimestamp(),
          });
          if (badgeId) {
            const badgeRef = db.doc("users/" + uid + "/badges/" + badgeId);
            tx.set(badgeRef, {
              badgeId,
              name: badgeName || badgeId,
              earnedAt: FieldValue.serverTimestamp(),
            });
          }
          return { newXp, newLevel };
        });
      } catch (e) {
        const code: number = (e && typeof e === 'object' && 'code' in e && typeof (e as {code?:unknown}).code === 'number' ? (e as {code:number}).code : 500);
        const msg = e instanceof Error ? e.message : "XP güncellenemedi";
        return NextResponse.json({ error: msg }, { status: code });
      }

      return NextResponse.json({ success: true, newLevel: result.newLevel, newXp: result.newXp });
    }

    if (action === "placement") {
      const { results } = body;
      let addSubC = 0,
        addSubT = 0,
        mulDivC = 0,
        mulDivT = 0,
        mmC = 0,
        mmT = 0,
        mmTime = 0,
        timeT = 0;
      let level = 1;
      let actionPlan = "";
      let learningPath = "";
      let aiError = false;

      if (results && results.length > 0) {
        type PlacementResult = { type: string; correct: boolean; time: number };
        results.forEach((r: PlacementResult) => {
          timeT += r.time;
          if (r.type === "+" || r.type === "-") {
            addSubT++;
            if (r.correct) addSubC++;
          }
          if (r.type === "x" || r.type === "÷") {
            mulDivT++;
            if (r.correct) mulDivC++;
          }
          if (r.type === "mm") {
            mmT++;
            mmTime += r.time;
            if (r.correct) mmC++;
          }
        });

        const addSubScore = addSubT ? Math.round((addSubC / addSubT) * 100) : 0;
        const mulDivScore = mulDivT ? Math.round((mulDivC / mulDivT) * 100) : 0;
        const mentalMathAccuracy = mmT ? (mmC / mmT) * 100 : 0;
        const mmAvgTime = mmT ? mmTime / mmT : 5000;
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

        // Konsantrasyon: Test sonuna doğru doğruluk veya hız düşüşü
        const concentrationScore = Math.round(
          (secondHalfAccuracy >= firstHalfAccuracy ? 100 : (secondHalfAccuracy / firstHalfAccuracy) * 100) * 0.7 +
          (secondHalfSpeed <= firstHalfSpeed * 1.2 ? 30 : 0)
        );

        // İşlem Algılama: Ortalama hızın tutarlılığı
        const times = results.map((r: ResultItem) => r.time);
        const avgTime = timeT / results.length;
        const variance = times.reduce((acc: number, t: number) => acc + Math.pow(t - avgTime, 2), 0) / times.length;
        const perceptionScore = Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / 100))));

        const metrics = {
          accuracy,
          speedScore,
          addSubScore,
          mulDivScore,
          mentalMathScore,
          concentrationScore,
          perceptionScore,
          fatigueRatio: secondHalfSpeed / firstHalfSpeed
        };

        try {
          let apiKey = process.env.DEEPSEEK_API_KEY;
          if (!apiKey) {
            const settingsRef = db.doc("settings/deepseek_api_key");
            const settingsSnap = await settingsRef.get();
            if (settingsSnap.exists && settingsSnap.data()?.value) {
              apiKey = settingsSnap.data()!.value;
            }
          }

          if (apiKey) {
            const prompt = `
Öğrenci matematik seviye tespit testini bitirdi. Veriler:
- Genel Doğruluk: %${accuracy}
- İşlem Hızı Puanı: ${speedScore}/100
- Toplama/Çıkarma Hakimiyeti: %${addSubScore}
- Çarpma/Bölme (Çarpım Tablosu): %${mulDivScore}
- Zihinden İşlem Kapasitesi: %${mentalMathScore}
- Konsantrasyon ve Odaklanma (Test sonu performansı): %${concentrationScore}
- İşlem Algılama ve Tepki Hızı Tutarlılığı: %${perceptionScore}
- Yorulma Endeksi: ${metrics.fatigueRatio.toFixed(2)}x (1'den büyükse sona doğru yavaşlamış)

Bu verilere dayanarak öğrencinin öğrenme karakterini analiz et. 
Örn: "Çarpım tablosunda hızlı ama test sonunda konsantrasyonu dağılıyor" veya "İşlem algılaması çok yüksek ama bölme işlemlerinde kararsız kalıyor."

Lütfen AŞAĞIDAKİ JSON FORMATINDA cevap ver.
{
  "recommendedLevel": (1-5),
  "actionPlan": "Öğrencinin bilişsel ve pratik durumuna özel 1-2 cümlelik tavsiye",
  "learningPath": "Gelişim için izlemesi gereken sıralı kavramlar"
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
                  model: "deepseek-chat",
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.7,
                }),
              },
            );

            if (response.ok) {
              const data = await response.json();
              let content = data.choices[0].message.content.trim();
              if (content.startsWith("```json")) {
                content = content
                  .replace(/^```json/, "")
                  .replace(/```$/, "")
                  .trim();
              } else if (content.startsWith("```")) {
                content = content
                  .replace(/^```/, "")
                  .replace(/```$/, "")
                  .trim();
              }
              
              try {
                const parsed = JSON.parse(content);
                level = parsed.recommendedLevel || 1;
                actionPlan = parsed.actionPlan || "";
                learningPath = parsed.learningPath || "";
              } catch (parseErr) {
                aiError = true;
                logger.error("DeepSeek JSON Parse Hatası (Placement)", parseErr, { content });
              }
            } else {
              aiError = true;
              const errorText = await response.text();
              logger.error("DeepSeek API Hatası (HTTP)", undefined, { status: response.status, body: errorText });
            }
          } else {
            aiError = true;
            logger.warn("DeepSeek API Key bulunamadı (Placement)");
          }
        } catch (e) {
          aiError = true;
          logger.error("DeepSeek API Çağrı Hatası (Placement):", e);
        }

        if (!actionPlan) {
          // Fallback logic
          if (accuracy >= 90 && mulDivScore >= 80) level = 4;
          else if (accuracy >= 80 && mulDivScore >= 60) level = 3;
          else if (accuracy >= 50) level = 2;
          else level = 1;
          
          actionPlan = "Temel işlemlerde hız ve doğruluk üzerine çalışmaya devam etmelisin.";
          learningPath = "Toplama/Çıkarma -> Çarpma Tablosu -> Bölme Temelleri";
        }

        await userRef.set(
          {
            level,
            xp: (level - 1) * 100 + 50,
            metrics,
            actionPlan,
            learningPath,
            planUpdatedAt: FieldValue.serverTimestamp(),
            placementDone: true,
            planVersion: 1,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      return NextResponse.json({
        success: true,
        level,
        actionPlan,
        learningPath,
        aiError,
      });
    }

    if (action === "reassess") {
      const userSnap = await userRef.get();
      if (!userSnap.exists)
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      const u = userSnap.data()!;
      const m = u.metrics || {};
      const currentXp = u.xp || 0;
      const currentLevel = u.level || 1;
      const currentVersion = u.planVersion || 1;

      // Performans alt-koleksiyonundan güncel başarım oranları
      const perfSnap = await db
        .collection("users/" + uid + "/performance")
        .get();
      const perfSummary: Record<
        string,
        { correct: number; total: number; pct: number }
      > = {};
      perfSnap.forEach((d) => {
        const p = d.data();
        const correct = p.correctAttempts || 0;
        const total = p.totalAttempts || 0;
        perfSummary[d.id] = {
          correct,
          total,
          pct: total ? Math.round((correct / total) * 100) : 0,
        };
      });

      let newActionPlan = u.actionPlan || "";
      let newLearningPath = u.learningPath || "";
      let aiError = false;

      try {
        let apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          const settingsRef = db.doc("settings/deepseek_api_key");
          const settingsSnap = await settingsRef.get();
          if (settingsSnap.exists && settingsSnap.data()?.value)
            apiKey = settingsSnap.data()!.value;
        }
        if (apiKey) {
          const prompt = `Öğrenci gelişim raporu yeniden değerlendirmesi.
Güncel metrikler: Doğruluk %${m.accuracy ?? 0}, Hız ${m.speedScore ?? 0}, Toplama/Çıkarma %${m.addSubScore ?? 0}, Çarpma/Bölme %${m.mulDivScore ?? 0}, Zihinden %${m.mentalMathScore ?? 0}
Seviye: ${currentLevel}, Toplam XP: ${currentXp}, Plan versiyonu: ${currentVersion}
Kategorik performans: ${JSON.stringify(perfSummary)}
Önceki plan: "${u.actionPlan || "-"}"

Bu bilgilere göre, öğrencinin SON döneminde gelişen/gerileyen alanları tespit et ve GÜNCEL bir odak planı üret. Önceki plandan farklı ve kişiye özel olsun. SADECE JSON dön:
{
  "actionPlan": "1-2 cümle — bu dönem odaklanılacak konular ve neden",
  "learningPath": "önerilen sıralı konu listesi, ok (->) ile ayrılmış"
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
                model: "deepseek-chat",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8,
                response_format: { type: "json_object" },
              }),
            },
          );
          if (response.ok) {
            try {
              const data = await response.json();
              const parsed = JSON.parse(data.choices[0].message.content || "{}");
              if (parsed.actionPlan) newActionPlan = parsed.actionPlan;
              if (parsed.learningPath) newLearningPath = parsed.learningPath;
            } catch (parseErr) {
              aiError = true;
              logger.error("DeepSeek JSON Parse Hatası (Reassess)", parseErr);
            }
          } else {
            aiError = true;
            const errorText = await response.text();
            logger.error("DeepSeek API Hatası (Reassess HTTP)", undefined, { status: response.status, body: errorText });
          }
        } else {
          aiError = true;
        }
      } catch (e) {
        aiError = true;
        logger.error("Reassess AI error", e);
      }

      // Plan geçmişini koru
      const historyRef = db.doc(
        "users/" + uid + "/planHistory/" + currentVersion,
      );
      await historyRef.set({
        version: currentVersion,
        actionPlan: u.actionPlan || "",
        learningPath: u.learningPath || "",
        metrics: m,
        level: currentLevel,
        xp: currentXp,
        archivedAt: FieldValue.serverTimestamp(),
      });

      await userRef.update({
        actionPlan: newActionPlan,
        learningPath: newLearningPath,
        planUpdatedAt: FieldValue.serverTimestamp(),
        planVersion: currentVersion + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        actionPlan: newActionPlan,
        learningPath: newLearningPath,
        version: currentVersion + 1,
        aiError,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update";
    logger.error("Student route error", error);
    return NextResponse.json({ 
      error: "Sunucu hatası oluştu", 
      details: process.env.NODE_ENV === "development" ? msg : undefined 
    }, { status: 500 });
  }
}
