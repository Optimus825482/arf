import { NextResponse } from "next/server";
import { getAdminDb, unauthorized, verifyRequest } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import type { DailyMissionPack } from "@/lib/missions";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();

    const rl = checkRateLimit({
      windowMs: 60_000,
      max: 5, // Reduced from 20 to 5 per minute for mission completions
      key: clientKey(req, authed.uid),
    });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    const { missionId, score = 0, xpEarned = 0, success = true, mode } = await req.json();
    if (!missionId) {
      return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.doc(`users/${authed.uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.data() || {};

    // --- Cheat Protection: Rapid-fire check ---
    const lastProgress = userData.dailyMissionProgress;
    if (lastProgress?.updatedAt) {
      const lastUpdate = new Date(lastProgress.updatedAt).getTime();
      const elapsed = Date.now() - lastUpdate;
      if (elapsed < 15000) { // At least 15 seconds between mission completions
        return NextResponse.json(
          { error: "Komuta merkezi veri akis hizini supheli buldu. Biraz yavasla pilot." },
          { status: 429 }
        );
      }
    }
    // ------------------------------------------

    const today = new Date().toISOString().split("T")[0];
    const missionPack = userData.dailyMissionPack as DailyMissionPack | undefined;

    if (!missionPack?.missions?.length || missionPack.date !== today) {
      return NextResponse.json({ error: "No active mission pack found" }, { status: 404 });
    }

    const targetMission = missionPack.missions.find((mission) => mission.id === missionId);
    const firstCompletion = targetMission ? !targetMission.completedAt : false;
    const missionBonusXp = firstCompletion && success ? 15 : 0;

    const updatedMissions = missionPack.missions.map((mission) =>
      mission.id === missionId
        ? {
            ...mission,
            completedAt: mission.completedAt || new Date().toISOString(),
            success,
          }
        : mission,
    );

    const completedCount = updatedMissions.filter((mission) => mission.completedAt).length;
    const totalCount = updatedMissions.length;
    const allCompleted = completedCount === totalCount;

    const updates: Record<string, unknown> = {
      dailyMissionPack: {
        ...missionPack,
        missions: updatedMissions,
      },
      dailyMissionProgress: {
        date: today,
        completedCount,
        totalCount,
        lastCompletedMissionId: missionId,
        lastCompletedMode: mode || null,
        lastScore: score,
        lastXpEarned: xpEarned,
        missionBonusXp,
        allCompleted,
        updatedAt: new Date().toISOString(),
      },
    };

    if (missionBonusXp > 0) {
      const currentXp = userData.xp || 0;
      const newXp = currentXp + missionBonusXp;
      const newLevel = Math.floor(Math.sqrt(newXp / 62)) + 1;
      updates.xp = newXp;
      updates.level = newLevel;
      updates.updatedAt = FieldValue.serverTimestamp();
    }

    if (allCompleted) {
      updates.dailyMissionReport = {
        date: today,
        title: "Gun Sonu Komutan Raporu",
        summary: success
          ? "Bugunku gorev zinciri tamamlandi. Sistem seni disiplinli ve istikrarli olarak isaretledi."
          : "Gorev zinciri tamamlandi ancak kritik hata kayitlari var. Yarin daha temiz bir operasyon bekleniyor.",
        totalMissions: totalCount,
        completedCount,
        totalEarnedXp: xpEarned + missionBonusXp,
        updatedAt: new Date().toISOString(),
      };
    }

    await userRef.set(updates, { merge: true });

    return NextResponse.json({ success: true, completedCount, totalCount, missionBonusXp, allCompleted });
  } catch (error) {
    console.error("Mission completion route error:", error);
    return NextResponse.json({ error: "Mission completion failed" }, { status: 500 });
  }
}
