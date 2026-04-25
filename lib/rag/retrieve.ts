import { query } from "../db";
import { sanitizePromptInput } from "../sanitize";
import { embedQuery, toPgVector } from "./embeddings";
import type { RagContextMatch, RetrieveRagOptions } from "./types";

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SIMILARITY = 0.35;
const DEFAULT_MAX_CONTEXT_CHARS = 2400;

type RagChunkRow = {
  id: string;
  document_id: string;
  chunk_index: number;
  title: string | null;
  source_path: string;
  source_type: string;
  topic: string | null;
  content: string;
  similarity: string | number | null;
};

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value as number), min), max);
}

function clampFloat(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value as number, min), max);
}

function trimToBudget(text: string, budget: number): string {
  if (budget <= 0) return "";
  const clean = sanitizePromptInput(text, budget);
  return clean.length > budget ? clean.slice(0, budget) : clean;
}

export async function retrieveRagContext(
  input: string,
  options: RetrieveRagOptions = {},
): Promise<RagContextMatch[]> {
  const topK = clampInt(options.topK ?? options.limit, DEFAULT_TOP_K, 1, 12);
  const minSimilarity = clampFloat(options.minSimilarity, DEFAULT_MIN_SIMILARITY, -1, 1);
  const maxContextChars = clampInt(options.maxContextChars ?? options.maxChars, DEFAULT_MAX_CONTEXT_CHARS, 0, 12000);
  const embeddedQuery = toPgVector(embedQuery(input));

  try {
    const result = await query<RagChunkRow>(
      `
        SELECT
          c.id,
          c.document_id,
          c.chunk_index,
          COALESCE(c.title, d.title) AS title,
          d.source_path,
          d.source_type,
          COALESCE(d.topic, c.metadata->>'topic') AS topic,
          c.content,
          1 - (c.embedding <=> $1::vector) AS similarity
        FROM rag_chunks c
        JOIN rag_documents d ON d.id = c.document_id
        WHERE c.embedding IS NOT NULL
          AND 1 - (c.embedding <=> $1::vector) >= $2
        ORDER BY c.embedding <=> $1::vector ASC
        LIMIT $3
      `,
      [embeddedQuery, minSimilarity, topK],
    );

    let remainingChars = maxContextChars;
    const matches: RagContextMatch[] = [];

    for (const row of result.rows) {
      const similarity = Number(row.similarity ?? 0);
      if (similarity < minSimilarity || remainingChars <= 0) continue;

      const content = trimToBudget(row.content, remainingChars);
      if (!content) continue;

      remainingChars -= content.length;
      matches.push({
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        title: sanitizePromptInput(row.title ?? "RAG kaynak", 120),
        sourcePath: sanitizePromptInput(row.source_path, 180),
        sourceType: sanitizePromptInput(row.source_type, 24),
        topic: row.topic ? sanitizePromptInput(row.topic, 80) : null,
        content,
        similarity,
      });
    }

    return matches;
  } catch {
    return [];
  }
}
