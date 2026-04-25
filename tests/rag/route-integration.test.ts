import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRoute(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("rag route prompt integration", () => {
  it("adds short fallback-safe RAG context to placement and reassess prompts", () => {
    const source = readRoute("app/api/student/route.ts");

    expect(source).toContain("lib/rag/context");
    expect(source).toContain("loadPedagogicalRagContext");
    expect(source).toMatch(/catch\s*\([^)]*\)\s*\{[\s\S]*?return ""/);
    expect(source).toContain("KISA RAG KAYNAKLARI");
    expect(source).toContain("PEDAGOJIK BAGLAM");
    expect(source).toContain("maxLen = 800");
    expect(source).toContain("sanitizePromptInput(formatted, maxLen)");
  });

  it("adds a parent-facing source-supported recommendation section to briefing prompts", () => {
    const source = readRoute("app/api/deepseek-briefing/route.ts");

    expect(source).toContain("lib/rag/context");
    expect(source).toContain("loadPedagogicalRagContext");
    expect(source).toContain("VELIYE YONELIK KAYNAK DESTEKLI ONERI");
    expect(source).toContain("maxLen = 800");
    expect(source).toContain("sanitizePromptInput(formatted, maxLen)");
  });

  it("adds a compact pedagogical/RAG signal to daily mission generation prompts", () => {
    const source = readRoute("app/api/missions/route.ts");

    expect(source).toContain("lib/rag/context");
    expect(source).toContain("loadPedagogicalRagContext");
    expect(source).toContain("PEDAGOJIK/RAG SINYALI");
    expect(source).toContain("maxLen = 600");
    expect(source).toContain("sanitizePromptInput(formatted, maxLen)");
  });

  it("exposes a protected RAG query endpoint with validation and rate limiting", () => {
    const source = readRoute("app/api/rag/query/route.ts");

    expect(source).toContain("verifyRequest");
    expect(source).toContain("checkRateLimit");
    expect(source).toContain("ragQueryRequestSchema");
    expect(source).toContain("retrieveRagContext");
    expect(source).toContain("buildRagPromptContext");
    expect(source).toContain("NextResponse.json({ ok: true, matches, context })");
  });
});
