import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculateCalibrationMetrics } from "@/lib/seviyeMetrics";

const pageSource = readFileSync("app/ogrenci/seviye/page.tsx", "utf8");

describe("calibration metrics", () => {
  it("keeps mental-math, timing, and length guards in the calibration calculation", () => {
    expect(pageSource).toContain("mentalMathScore");
    expect(pageSource).toContain("Math.min(30000, Math.max(250");

    const metrics = calculateCalibrationMetrics(
      [
        { type: "+", correct: true, time: 1000 },
        { type: "x", correct: true, time: 2000 },
        { type: "mm", correct: false, time: 3000 },
      ],
      3,
    );

    expect(metrics.accuracy).toBe(67);
    expect(metrics.addSubScore).toBe(100);
    expect(metrics.mulDivScore).toBe(100);
    expect(metrics.mentalMathScore).toBe(0);
    expect(metrics.avgTimeMs).toBe(2000);
    expect(() => calculateCalibrationMetrics([{ type: "mm", correct: true, time: 1000 }], 2)).toThrow(
      "Kalibrasyon sonucu eksik veya fazla.",
    );
  });

  it("guards answer UX with a bounded integer input check", () => {
    expect(pageSource).toContain("/^-?\\d{1,6}$/");
    expect(pageSource).toContain("Lütfen en fazla 6 haneli tam sayı gir.");
  });
});
