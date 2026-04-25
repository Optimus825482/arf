import { embedQuery, getEmbeddingDim } from "../../lib/rag/embeddings";

const DEFAULT_DIMENSIONS = 768;

export function embeddingDimensions(): number {
  return getEmbeddingDim() || DEFAULT_DIMENSIONS;
}

export function embedText(text: string, dimensions = embeddingDimensions()): number[] {
  return embedQuery(text, dimensions);
}

export function embeddingToPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
