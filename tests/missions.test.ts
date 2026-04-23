import { describe, expect, it, vi } from "vitest";
import { buildFallbackMissionPack } from "@/lib/missions";

describe("daily mission pack", () => {
  it("creates a three-mission fallback pack", () => {
    const pack = buildFallbackMissionPack({
      username: "Erkan",
      level: 4,
      learningPath: "Toplama -> Carpma",
      metrics: {
        addSubScore: 65,
        mulDivScore: 52,
        speedScore: 48,
        accuracy: 61,
      },
    });

    expect(pack.title).toContain("Erkan");
    expect(pack.missions).toHaveLength(3);
    expect(pack.missions.map((mission) => mission.mode)).toEqual(["pratik", "yildirim", "gorev"]);
  });

  it("uses commander-trial wording for strong students", () => {
    const pack = buildFallbackMissionPack({
      username: "Pilot",
      level: 14,
      learningPath: "Ileri rota",
      metrics: {
        addSubScore: 90,
        mulDivScore: 90,
        speedScore: 88,
        mentalMathScore: 91,
        accuracy: 93,
      },
    });

    expect(pack.motivationMessage).toContain("kanitlamalisin");
    expect(pack.missions[2].difficulty).toMatch(/Komutanl[iı]k/);
  });

  it("stamps the pack with today's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T10:00:00Z"));

    const pack = buildFallbackMissionPack({
      username: "Pilot",
      metrics: {},
    });

    expect(pack.date).toBe("2026-04-23");

    vi.useRealTimers();
  });
});
