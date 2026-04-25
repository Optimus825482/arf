import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..");

describe("ogrenci safety guards", () => {
  it("guards pratik endGame with refs so duplicate triggers do not double-save", () => {
    const source = readFileSync(path.join(repoRoot, "app/ogrenci/pratik/page.tsx"), "utf8");

    expect(source).toContain("endGameStartedRef");
    expect(source).toContain("if (endGameStartedRef.current) return;");
    expect(source).toContain("missionSavedRef.current");
    expect(source).toContain("scoreRef.current");
    expect(source).toContain("pendingResultsRef.current");
    expect(source).toContain("const endGame = useCallback(async () =>");
  });

  it("normalizes Firestore student data before storing it as UserData", () => {
    const source = readFileSync(path.join(repoRoot, "app/ogrenci/page.tsx"), "utf8");

    expect(source).toContain("function normalizeStudentData");
    expect(source).toContain("DocumentData");
    expect(source).toContain("const normalizedStudent = normalizeStudentData");
    expect(source).toContain("setStudentData(normalizedStudent)");
    expect(source).not.toContain("setStudentData(d)");
  });
});
