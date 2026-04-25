import { describe, expect, it, vi } from "vitest";

const { queryMock, loggerErrorMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  default: {
    query: queryMock,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: loggerErrorMock,
    info: vi.fn(),
  },
}));

import { HyperCognitiveEngine } from "@/lib/cognitiveMemory";

describe("hyper cognitive memory", () => {
  it("marks the L1 profile write as handled and records the classified outcome", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));

    const state = HyperCognitiveEngine.processWorkingMemory("u1", {
      accuracy: 42,
      frustrationLevel: 80,
      fatigueRatio: 1.4,
      currentFocus: "mental-math",
    });
    await Promise.resolve();

    expect(state.currentFocus).toBe("mental-math");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("student_profiles"),
      ["u1", expect.stringContaining("Destek gerekli")],
    );
    expect(loggerErrorMock).toHaveBeenCalledWith("L1 DB Sync Error", expect.any(Error));
  });

  it("updates semantic graph with current L1 cognitive signals", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    await HyperCognitiveEngine.updateSemanticGraph("u1", {
      sessionId: "sess_1",
      currentFocus: "carpim",
      consecutiveErrors: 3,
      currentAnxietyLevel: 75,
      currentFatigueRatio: 1.35,
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("cognitive_nodes"),
      ["focus_carpim", "u1", "Odak: carpim", expect.any(Number)],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("cognitive_nodes"),
      ["risk_stress_fatigue", "u1", "Stres/Yorgunluk Riski", expect.any(Number)],
    );
  });
});
