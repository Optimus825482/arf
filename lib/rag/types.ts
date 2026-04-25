export type RagSourceType = "pdf" | "docx" | "md" | "txt" | "html" | string;

export type RagContextMatch = {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string;
  sourcePath: string;
  sourceType: RagSourceType;
  topic: string | null;
  content: string;
  similarity: number;
};

export type RetrieveRagOptions = {
  topK?: number;
  limit?: number;
  minSimilarity?: number;
  maxContextChars?: number;
  maxChars?: number;
};

export type BuildRagPromptContextOptions = {
  query?: string;
  matches?: RagContextMatch[];
  maxChars?: number;
};

export type BuildPedagogicalRagContextOptions = {
  query: string;
  limit?: number;
  topK?: number;
  minSimilarity?: number;
  maxChars?: number;
  maxContextChars?: number;
};
