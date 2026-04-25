export type RagSourceType = "txt" | "md" | "html" | "pdf" | "docx";

export type RagInventoryDocument = {
  sourcePath: string;
  sourceType: RagSourceType;
  title: string;
  bytes: number;
  modifiedAt: string;
};

export type RagExtractionStatus = "ready" | "needs_ocr" | "unsupported";

export type RagExtractedDocument = RagInventoryDocument & {
  status: RagExtractionStatus;
  extractedText: string;
  metadata: Record<string, unknown>;
};

export type RagChunk = {
  id: string;
  sourcePath: string;
  sourceType: RagSourceType;
  chunkIndex: number;
  title: string;
  content: string;
  tokenEstimate: number;
  topic: string;
  metadata: Record<string, unknown>;
};

export type QueryRunner = <T = Record<string, unknown>>(
  text: string,
  params?: readonly unknown[],
) => Promise<{ rows: T[] }>;
