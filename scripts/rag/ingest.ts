import { resolve } from "node:path";
import { query } from "../../lib/db";
import { chunkExtractedDocument } from "./chunk";
import { embedText, embeddingToPgVector } from "./embed";
import { extractDocument } from "./extract";
import { inventoryDocuments } from "./inventory";
import type { QueryRunner, RagChunk, RagExtractedDocument } from "./types";

function sanitizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\u0000/g, "");
}

export type IngestOptions = {
  rootDir: string;
  dryRun?: boolean;
  chunkTokens?: number;
  overlapTokens?: number;
  batchSize?: number;
  maxRetries?: number;
  resume?: boolean;
  only?: string;
  embedder?: (text: string) => Promise<number[]>;
  progress?: (event: IngestProgressEvent) => void;
  queryRunner?: QueryRunner;
};

export type IngestReport = {
  rootDir: string;
  dryRun: boolean;
  documents: number;
  extracted: number;
  chunks: number;
  embeddings: number;
  skipped: number;
  resumed: number;
};

type DocumentIdRow = { id: string };
type SourcePathRow = { source_path: string };

export type IngestProgressEvent = {
  stage: "resume" | "extract" | "documents" | "chunks";
  completed: number;
  total: number;
  sourcePath?: string;
  status?: string;
};

const DEFAULT_BATCH_SIZE = 16;
const DEFAULT_MAX_ATTEMPTS = 1;

export async function ingestDocuments(options: IngestOptions): Promise<IngestReport> {
  const rootDir = resolve(options.rootDir);
  const dryRun = options.dryRun ?? false;
  const queryRunner: QueryRunner = options.queryRunner ?? (query as unknown as QueryRunner);
  const batchSize = positiveInt(options.batchSize, DEFAULT_BATCH_SIZE);
  const maxAttempts = positiveInt(options.maxRetries, DEFAULT_MAX_ATTEMPTS);
  const fullInventory = await inventoryDocuments(rootDir);
  const inventory = options.only
    ? fullInventory.filter((doc) => {
        const needle = options.only!.toLowerCase();
        return doc.sourcePath.toLowerCase().includes(needle);
      })
    : fullInventory;
  const resumedSources = options.resume && !dryRun ? await loadResumedSources(inventory, queryRunner, maxAttempts) : new Set<string>();
  const pendingInventory = inventory.filter((doc) => !resumedSources.has(doc.sourcePath));
  options.progress?.({ stage: "resume", completed: resumedSources.size, total: inventory.length });

  const extracted: RagExtractedDocument[] = [];
  for (const batch of batches(pendingInventory, batchSize)) {
    const batchResults = await Promise.all(batch.map((doc) => extractDocument(doc)));
    for (const result of batchResults) {
      extracted.push(result);
      options.progress?.({
        stage: "extract",
        completed: extracted.length,
        total: pendingInventory.length,
        sourcePath: result.sourcePath,
        status: result.status,
      });
    }
  }

  const chunks = extracted
    .filter((doc) => doc.status === "ready")
    .flatMap((doc) =>
      chunkExtractedDocument(doc, {
        targetTokens: options.chunkTokens,
        overlapTokens: options.overlapTokens,
      }),
    );
  const embeddings: number[][] = [];
  if (options.embedder) {
    for (let i = 0; i < chunks.length; i += 1) {
      embeddings.push(await options.embedder(chunks[i].content));
      options.progress?.({ stage: "chunks", completed: i + 1, total: chunks.length });
    }
  } else {
    for (const chunk of chunks) embeddings.push(embedText(chunk.content));
  }

  if (!dryRun) {
    await writeToDatabase(extracted, chunks, embeddings, queryRunner, {
      batchSize,
      maxAttempts,
      progress: options.progress,
    });
  }

  return {
    rootDir,
    dryRun,
    documents: inventory.length,
    extracted: extracted.filter((doc) => doc.status === "ready").length,
    chunks: chunks.length,
    embeddings: embeddings.length,
    skipped: extracted.filter((doc) => doc.status !== "ready").length,
    resumed: resumedSources.size,
  };
}

async function writeToDatabase(
  docs: RagExtractedDocument[],
  chunks: RagChunk[],
  embeddings: number[][],
  queryRunner: QueryRunner,
  options: {
    batchSize: number;
    maxAttempts: number;
    progress?: (event: IngestProgressEvent) => void;
  },
) {
  const documentIds = new Map<string, string>();

  await queryRunner("BEGIN");
  try {
    let completedDocuments = 0;
    for (const batch of batches(docs, options.batchSize)) {
      for (const doc of batch) {
      const docChunks = chunks.filter((chunk) => chunk.sourcePath === doc.sourcePath);
      const result = await queryWithRetry<DocumentIdRow>(
        queryRunner,
        `INSERT INTO rag_documents (
          source_path, source_type, title, topic, authors, publication_year,
          doi, metadata, extracted_text, summary, chunk_count, ingestion_status, last_ingested_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT (source_path) DO UPDATE SET
          source_type = EXCLUDED.source_type,
          title = EXCLUDED.title,
          topic = EXCLUDED.topic,
          authors = EXCLUDED.authors,
          publication_year = EXCLUDED.publication_year,
          doi = EXCLUDED.doi,
          metadata = EXCLUDED.metadata,
          extracted_text = EXCLUDED.extracted_text,
          summary = EXCLUDED.summary,
          chunk_count = EXCLUDED.chunk_count,
          ingestion_status = EXCLUDED.ingestion_status,
          last_ingested_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          doc.sourcePath,
          doc.sourceType,
          sanitizeText(doc.title),
          docChunks[0]?.topic ?? "general",
          JSON.stringify([]),
          null,
          null,
          JSON.stringify({ ...doc.metadata, extractionStatus: doc.status, ingestionStatus: doc.status }),
          sanitizeText(doc.extractedText),
          sanitizeText(doc.extractedText).slice(0, 280),
          docChunks.length,
          doc.status,
        ],
        options.maxAttempts,
      );
      documentIds.set(doc.sourcePath, result.rows[0]?.id);
      completedDocuments += 1;
      options.progress?.({
        stage: "documents",
        completed: completedDocuments,
        total: docs.length,
        sourcePath: doc.sourcePath,
        status: doc.status,
      });
      }
    }

    for (const doc of docs) {
      const documentId = documentIds.get(doc.sourcePath);
      if (documentId) {
        await queryWithRetry(queryRunner, "DELETE FROM rag_chunks WHERE document_id = $1", [documentId], options.maxAttempts);
      }
    }

    let completedChunks = 0;
    for (const batch of batches(chunks.map((chunk, index) => ({ chunk, index })), options.batchSize)) {
      for (const { chunk, index } of batch) {
      const documentId = documentIds.get(chunk.sourcePath);
      if (!documentId) continue;

      await queryWithRetry(
        queryRunner,
        `INSERT INTO rag_chunks (
          document_id, chunk_index, title, content, token_estimate, metadata, embedding
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::vector)`,
        [
          documentId,
          chunk.chunkIndex,
          sanitizeText(chunk.title),
          sanitizeText(chunk.content),
          chunk.tokenEstimate,
          JSON.stringify({ ...chunk.metadata, topic: chunk.topic, localChunkId: chunk.id }),
          embeddingToPgVector(embeddings[index]),
        ],
        options.maxAttempts,
      );
      completedChunks += 1;
      }
      options.progress?.({ stage: "chunks", completed: completedChunks, total: chunks.length });
    }

    await queryRunner("COMMIT");
  } catch (error) {
    await queryRunner("ROLLBACK");
    throw error;
  }
}

async function loadResumedSources(
  inventory: { sourcePath: string }[],
  queryRunner: QueryRunner,
  maxAttempts: number,
): Promise<Set<string>> {
  if (inventory.length === 0) return new Set();
  const result = await queryWithRetry<SourcePathRow>(
    queryRunner,
    `SELECT source_path FROM rag_documents
     WHERE source_path = ANY($1::text[])
       AND ingestion_status IN ('ready', 'needs_ocr', 'unsupported')
       AND last_ingested_at IS NOT NULL`,
    [inventory.map((doc) => doc.sourcePath)],
    maxAttempts,
  );
  return new Set(result.rows.map((row) => row.source_path));
}

async function queryWithRetry<T = Record<string, unknown>>(
  queryRunner: QueryRunner,
  text: string,
  params: readonly unknown[] | undefined,
  maxAttempts: number,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await queryRunner<T>(text, params);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
    }
  }
  throw lastError;
}

function batches<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function positiveInt(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(1, Math.floor(value));
}

function readArgs(argv: string[]) {
  return {
    rootDir: argv.find((arg) => !arg.startsWith("--")) ?? "docs",
    dryRun: argv.includes("--dry-run"),
    batchSize: Number.parseInt(argv[argv.indexOf("--batch-size") + 1] ?? "", 10) || undefined,
    maxRetries: Number.parseInt(argv[argv.indexOf("--max-retries") + 1] ?? "", 10) || undefined,
    resume: argv.includes("--resume"),
  };
}

if (process.argv[1]?.endsWith("ingest.ts")) {
  ingestDocuments(readArgs(process.argv.slice(2)))
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
