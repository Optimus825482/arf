import { query } from "../../lib/db";
import type { QueryRunner } from "./types";

type VerifyOptions = {
  queryRunner?: QueryRunner;
  limit?: number;
};

type RetrievalRow = {
  title: string;
  source_path: string;
  chunk_index: number;
  content: string;
};

export async function verifyRetrievalSmoke(search: string, options: VerifyOptions = {}) {
  const limit = options.limit ?? 5;
  const queryRunner: QueryRunner = options.queryRunner ?? (query as unknown as QueryRunner);
  const result = await queryRunner<RetrievalRow>(
    `SELECT d.title, d.source_path, c.chunk_index, c.content
     FROM rag_chunks c
     JOIN rag_documents d ON d.id = c.document_id
     WHERE c.content ILIKE $1 OR d.title ILIKE $1 OR d.topic ILIKE $1
     ORDER BY d.updated_at DESC, c.chunk_index ASC
     LIMIT $2`,
    [`%${search}%`, limit],
  );

  return {
    query: search,
    ok: result.rows.length > 0,
    matches: result.rows.length,
    top: result.rows.map((row: RetrievalRow) => ({
      title: row.title,
      sourcePath: row.source_path,
      chunkIndex: row.chunk_index,
    })),
  };
}

if (process.argv[1]?.endsWith("verify.ts")) {
  verifyRetrievalSmoke(process.argv.slice(2).join(" ") || "toplama")
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
