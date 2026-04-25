import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("rag database schema", () => {
  it("declares ingestion status, ingestion timestamp and metadata GIN index", async () => {
    const sql = await readFile(join(process.cwd(), "init-db.sql"), "utf8");

    expect(sql).toMatch(/ingestion_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i);
    expect(sql).toMatch(/last_ingested_at\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE/i);
    expect(sql).toMatch(/idx_rag_chunks_metadata_gin[\s\S]+USING\s+GIN\s*\(metadata\)/i);
  });
});
