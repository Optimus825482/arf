import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const DEFAULT_EMBED_DIM = 768;

export function getEmbeddingDim(): number {
  const raw = Number.parseInt(process.env.RAG_EMBED_DIM ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_EMBED_DIM;
  return raw;
}

export function embedQuery(text: string, dimensions = getEmbeddingDim()): number[] {
  const runtimeEmbedding = embedWithExternalRuntime(text, dimensions);
  if (runtimeEmbedding) return runtimeEmbedding;

  const dim = Math.max(1, Math.floor(dimensions));
  const vector = Array.from({ length: dim }, () => 0);
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  const tokens = normalized.length > 0 ? normalized.split(" ") : [""];

  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    for (let i = 0; i < digest.length; i += 2) {
      const index = digest[i] % dim;
      const magnitude = digest[i + 1] / 255;
      vector[index] += magnitude * 2 - 1;
    }
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

export function toPgVector(vector: readonly number[]): string {
  return `[${vector.map((value) => Number(value).toFixed(6)).join(",")}]`;
}

export function embedWithExternalRuntime(text: string, dimensions = getEmbeddingDim()): number[] | null {
  const command = process.env.RAG_EMBEDDING_CMD?.trim();
  if (!command) return null;
  const args = process.env.RAG_EMBEDDING_ARGS?.trim()
    ? process.env.RAG_EMBEDDING_ARGS.trim().split(/\s+/)
    : [];

  let stdout: string;
  try {
    stdout = execFileSync(command, args, {
      input: text,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 1024 * 1024 * 32,
      timeout: 60_000,
    });
  } catch (error) {
    const detail = error instanceof Error && error.message ? `: ${error.message}` : "";
    throw new Error(`Embedding runtime failed${detail}`);
  }

  const embedding = parseEmbeddingOutput(stdout);
  validateEmbeddingDimension(embedding, dimensions);
  return embedding;
}

function parseEmbeddingOutput(stdout: string): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new Error("Embedding runtime returned invalid JSON");
  }

  const candidate =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { embedding?: unknown }).embedding)
        ? (parsed as { embedding: unknown[] }).embedding
        : null;

  if (!candidate || !candidate.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("Embedding runtime must return a JSON float array or { embedding: float[] }");
  }

  return candidate;
}

function validateEmbeddingDimension(embedding: readonly number[], dimensions: number) {
  const expected = Math.max(1, Math.floor(dimensions));
  if (embedding.length !== expected) {
    throw new Error(`Embedding dimension mismatch: expected ${expected}, received ${embedding.length}`);
  }
}
