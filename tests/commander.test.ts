import { describe, expect, it } from "vitest";
import { getCommanderProgress, getDifficultyProfile } from "@/lib/commander";

describe("commander system", () => {
  it("returns commander_trial for strong high-level students", () => {
    const profile = getDifficultyProfile({
      level: 12,
      metrics: {
        accuracy: 92,
        speedScore: 88,
        mentalMathScore: 86,
      },
    });

    expect(profile.tier).toBe("commander_trial");
    expect(profile.intensity).toBe(4);
  });

  it("returns adaptive_recovery for weak performance", () => {
    const profile = getDifficultyProfile({
      level: 2,
      metrics: {
        accuracy: 35,
        speedScore: 28,
        mentalMathScore: 20,
      },
    });

    expect(profile.tier).toBe("adaptive_recovery");
    expect(profile.label).toContain("Toparlanma");
  });

  it("marks commander progress eligible only when all checks pass", () => {
    const progress = getCommanderProgress({
      level: 10,
      xp: 1500,
      dailyTasks: { count: 3 },
      metrics: {
        accuracy: 90,
        speedScore: 85,
        mentalMathScore: 80,
      },
    });

    expect(progress.eligible).toBe(true);
    expect(progress.progress).toBe(100);
    expect(progress.checks.every((item) => item.passed)).toBe(true);
  });

  it("shows next blocking requirement when not eligible", () => {
    const progress = getCommanderProgress({
      level: 7,
      xp: 800,
      dailyTasks: { count: 1 },
      metrics: {
        accuracy: 70,
        speedScore: 60,
        mentalMathScore: 55,
      },
    });

    expect(progress.eligible).toBe(false);
    expect(progress.nextStep).toContain("Rütbe");
  });
});
