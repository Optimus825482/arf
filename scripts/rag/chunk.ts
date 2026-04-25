import { createHash } from "node:crypto";
import type { RagChunk, RagExtractedDocument } from "./types";

type ChunkOptions = {
  targetTokens?: number;
  overlapTokens?: number;
};

type ChunkInput = Pick<
  RagExtractedDocument,
  "sourcePath" | "sourceType" | "title" | "status" | "extractedText" | "metadata"
>;

const TOPIC_RULES: Array<[string, RegExp]> = [
  ["arithmetic", /toplama|cikarma|carpma|bolme|ritmik|sayi|basamak|kesir|aritmetik/i],
  ["pedagogy", /ogren|ipucu|rehber|strateji|scaffold|mindset|bilissel/i],
  ["assessment", /test|olcme|degerlendirme|rubrik|sinav/i],
];

export function classifyTopic(text: string): string {
  const match = TOPIC_RULES.find(([, pattern]) => pattern.test(text));
  return match?.[0] ?? "general";
}

export function estimateTokens(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function chunkExtractedDocument(
  doc: ChunkInput,
  options: ChunkOptions = {},
): RagChunk[] {
  const targetTokens = Math.max(1, options.targetTokens ?? 320);
  const overlapTokens = Math.max(0, Math.min(options.overlapTokens ?? 40, targetTokens - 1));
  const words = doc.extractedText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: RagChunk[] = [];
  const step = targetTokens - overlapTokens;

  for (let start = 0; start < words.length; start += step) {
    const content = words.slice(start, start + targetTokens).join(" ");
    const chunkIndex = chunks.length;
    const topic = classifyTopic(`${doc.title} ${content}`);
    const id = createHash("sha256")
      .update(`${doc.sourcePath}:${chunkIndex}:${content}`)
      .digest("hex")
      .slice(0, 24);

    chunks.push({
      id,
      sourcePath: doc.sourcePath,
      sourceType: doc.sourceType,
      chunkIndex,
      title: doc.title,
      content,
      tokenEstimate: estimateTokens(content),
      topic,
      metadata: {
        extractionStatus: doc.status,
        sourceMetadata: doc.metadata,
      },
    });

    if (start + targetTokens >= words.length) break;
  }

  return chunks;
}
