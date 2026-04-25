import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  query: queryMock,
}));

import { chunkExtractedDocument } from "../../scripts/rag/chunk";
import { embedText } from "../../scripts/rag/embed";
import { extractDocument } from "../../scripts/rag/extract";
import { ingestDocuments } from "../../scripts/rag/ingest";
import { inventoryDocuments } from "../../scripts/rag/inventory";
import type { QueryRunner } from "../../scripts/rag/types";
import { verifyRetrievalSmoke } from "../../scripts/rag/verify";

afterEach(() => {
  vi.unstubAllEnvs();
  queryMock.mockReset();
});

function simpleTextPdf(text: string) {
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 64 >>
stream
BT
/F1 12 Tf
72 720 Td
(${text}) Tj
ET
endstream
endobj
%%EOF`;
}

function simpleDocx(paragraphs: string[]) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs
      .map((paragraph) => `<w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>`)
      .join("\n")}
  </w:body>
</w:document>`;

  return storedZip("word/document.xml", Buffer.from(documentXml, "utf8"));
}

function storedZip(fileName: string, data: Buffer) {
  const name = Buffer.from(fileName, "utf8");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt32LE(0, 10);
  local.writeUInt32LE(0, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const centralOffset = local.length + name.length + data.length;
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt32LE(0, 12);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([local, name, data, central, name, end]);
}

describe("rag local ingestion core", () => {
  it("inventories supported source documents in deterministic order", async () => {
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    await writeFile(join(root, "beta.md"), "# Basamak degeri\n\nRitmik sayma.");
    await writeFile(join(root, "alpha.txt"), "Toplama stratejileri");
    await writeFile(join(root, "lesson.html"), "<main>Kesir stratejileri</main>");
    await writeFile(join(root, "ignored.png"), "binary");

    const docs = await inventoryDocuments(root);

    expect(docs.map((doc) => doc.sourcePath)).toEqual([
      join(root, "alpha.txt"),
      join(root, "beta.md"),
      join(root, "lesson.html"),
    ]);
    expect(docs.map((doc) => doc.sourceType)).toEqual(["txt", "md", "html"]);
  });

  it("extracts plain text, html text, text pdfs, docx paragraphs and safe placeholders", async () => {
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    const txtPath = join(root, "strategy.txt");
    const htmlPath = join(root, "lesson.html");
    const pdfPath = join(root, "text.pdf");
    const scanPath = join(root, "scan.pdf");
    const docxPath = join(root, "guide.docx");
    const invalidDocxPath = join(root, "invalid.docx");
    await writeFile(txtPath, "Carpma icin parcalama stratejisi.");
    await writeFile(
      htmlPath,
      "<!doctype html><head><title>Ignore</title><style>.x{}</style></head><main><h1>Toplama &amp; cikarma</h1><script>bad()</script><p>Somut model&nbsp;kullan.</p></main>",
    );
    await writeFile(pdfPath, simpleTextPdf("Toplama stratejileri icin metin tabanli PDF icerigi."));
    await writeFile(scanPath, "%PDF-1.4");
    await writeFile(
      docxPath,
      simpleDocx(["Toplama &amp; cikarma icin birinci paragraf.", "Kesir modelleri icin ikinci paragraf."]),
    );
    await writeFile(invalidDocxPath, "PK");

    vi.stubEnv("MARKITDOWN_CMD", "__missing_markitdown_for_test__");

    await expect(extractDocument({ sourcePath: txtPath, sourceType: "txt" })).resolves.toMatchObject({
      status: "ready",
      extractedText: "Carpma icin parcalama stratejisi.",
    });
    await expect(extractDocument({ sourcePath: htmlPath, sourceType: "html" })).resolves.toMatchObject({
      status: "ready",
      extractedText: "Toplama & cikarma\nSomut model kullan.",
      metadata: { extractor: "html_fallback" },
    });
    await expect(extractDocument({ sourcePath: pdfPath, sourceType: "pdf" })).resolves.toMatchObject({
      status: "ready",
      extractedText: "Toplama stratejileri icin metin tabanli PDF icerigi.",
      metadata: { extractor: "pdf_literal_fallback" },
    });
    await expect(extractDocument({ sourcePath: scanPath, sourceType: "pdf" })).resolves.toMatchObject({
      status: "needs_ocr",
      extractedText: expect.stringContaining("needs_ocr"),
      metadata: { reason: expect.stringContaining("markitdown") },
    });
    await expect(extractDocument({ sourcePath: docxPath, sourceType: "docx" })).resolves.toMatchObject({
      status: "ready",
      extractedText: "Toplama & cikarma icin birinci paragraf.\nKesir modelleri icin ikinci paragraf.",
      metadata: { extractor: "docx_xml_fallback" },
    });
    await expect(extractDocument({ sourcePath: invalidDocxPath, sourceType: "docx" })).resolves.toMatchObject({
      status: "unsupported",
      extractedText: expect.stringContaining("unsupported"),
    });
  });

  it("chunks text deterministically and classifies topics", () => {
    const extracted = {
      sourcePath: "/docs/math.md",
      sourceType: "md" as const,
      title: "Math",
      status: "ready" as const,
      extractedText: "Toplama stratejileri bolum 1.\n\nCarpma ve bolme stratejileri bolum 2.",
      metadata: {},
    };

    const first = chunkExtractedDocument(extracted, { targetTokens: 4, overlapTokens: 1 });
    const second = chunkExtractedDocument(extracted, { targetTokens: 4, overlapTokens: 1 });

    expect(first).toEqual(second);
    expect(first.map((chunk) => chunk.chunkIndex)).toEqual([0, 1, 2]);
    expect(first[0]).toMatchObject({ topic: "arithmetic", tokenEstimate: 4 });
  });

  it("creates deterministic local embeddings with env-configurable dimensions", () => {
    vi.stubEnv("RAG_EMBED_DIM", "8");

    const one = embedText("Ayni metin");
    const two = embedText("Ayni metin");
    const other = embedText("Baska metin");

    expect(one).toEqual(two);
    expect(one).toHaveLength(8);
    expect(other).toHaveLength(8);
    expect(one).not.toEqual(other);
  });

  it("uses an external embedding runtime when configured", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "3");
    vi.stubEnv("RAG_EMBED_MODEL_PATH", "/models/embeddinggemma-300m.gguf");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    const runtimePath = join(root, "embed-runtime.js");
    await writeFile(
      runtimePath,
      `#!/usr/bin/env node
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const text = Buffer.concat(chunks).toString("utf8");
  if (!process.env.RAG_EMBED_MODEL_PATH || !text.includes("Ayni metin")) process.exit(2);
  process.stdout.write(JSON.stringify({ embedding: [0.25, -0.5, 1] }));
});
`,
    );
    await chmod(runtimePath, 0o755);
    vi.stubEnv("RAG_EMBEDDING_CMD", runtimePath);

    expect(embedText("Ayni metin")).toEqual([0.25, -0.5, 1]);
  });

  it("fails clearly when the external embedding dimension is unexpected", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "3");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    const runtimePath = join(root, "embed-runtime.js");
    await writeFile(
      runtimePath,
      `#!/usr/bin/env node
process.stdin.resume();
process.stdin.on("end", () => process.stdout.write(JSON.stringify([0.25, -0.5])));
`,
    );
    await chmod(runtimePath, 0o755);
    vi.stubEnv("RAG_EMBEDDING_CMD", runtimePath);

    expect(() => embedText("Ayni metin")).toThrow(
      "Embedding dimension mismatch: expected 3, received 2",
    );
  });

  it("ingests in dry-run without database writes", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "6");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    await writeFile(join(root, "guide.md"), "# Toplama\n\nToplama ve cikarma icin kisa rehber.");

    const report = await ingestDocuments({ rootDir: root, dryRun: true, chunkTokens: 8 });

    expect(report.dryRun).toBe(true);
    expect(report.documents).toBe(1);
    expect(report.chunks).toBeGreaterThan(0);
    expect(report.embeddings).toBe(report.chunks);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("writes ready and skipped documents in one transaction with rollback on failure", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "6");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    await writeFile(join(root, "guide.md"), "# Toplama\n\nToplama ve cikarma icin kisa rehber.");
    await writeFile(join(root, "invalid.docx"), "PK");

    const calls: Array<{ text: string; params?: readonly unknown[] }> = [];
    const queryRunner = vi.fn(async (text: string, params?: readonly unknown[]) => {
      calls.push({ text, params });
      if (text.includes("INSERT INTO rag_documents")) {
        return { rows: [{ id: `doc-${calls.filter((call) => call.text.includes("INSERT INTO rag_documents")).length}` }] };
      }
      return { rows: [] };
    });

    const report = await ingestDocuments({ rootDir: root, queryRunner: queryRunner as unknown as QueryRunner, chunkTokens: 8 });

    expect(report).toMatchObject({ dryRun: false, documents: 2, extracted: 1, skipped: 1 });
    expect(calls[0].text).toBe("BEGIN");
    expect(calls.at(-1)?.text).toBe("COMMIT");
    expect(calls.some((call) => /ingestion_status/.test(call.text))).toBe(true);
    expect(calls.some((call) => /last_ingested_at/.test(call.text))).toBe(true);
    expect(calls.some((call) => call.text.includes("DELETE FROM rag_chunks"))).toBe(true);

    const skippedInsert = calls.find(
      (call) => call.text.includes("INSERT INTO rag_documents") && call.params?.includes("unsupported"),
    );
    expect(skippedInsert).toBeTruthy();

    const failingCalls: Array<string> = [];
    const failingRunner = vi.fn(async (text: string) => {
      failingCalls.push(text);
      if (text.includes("INSERT INTO rag_documents")) return { rows: [{ id: "doc-fail" }] };
      if (text.includes("INSERT INTO rag_chunks")) throw new Error("chunk insert failed");
      return { rows: [] };
    });

    await expect(
      ingestDocuments({ rootDir: root, queryRunner: failingRunner as unknown as QueryRunner, chunkTokens: 8 }),
    ).rejects.toThrow("chunk insert failed");
    expect(failingCalls[0]).toBe("BEGIN");
    expect(failingCalls).toContain("ROLLBACK");
    expect(failingCalls).not.toContain("COMMIT");
  });

  it("persists documents and chunks in one transaction with status metadata", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "6");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    const guidePath = join(root, "guide.md");
    const scanPath = join(root, "scan.pdf");
    await writeFile(guidePath, "# Toplama\n\nToplama ve cikarma icin kisa rehber.");
    await writeFile(scanPath, "%PDF-1.4");
    vi.stubEnv("MARKITDOWN_CMD", "__missing_markitdown_for_test__");

    const queryRunner = vi.fn(async (text: string, params?: readonly unknown[]) => {
      if (text.includes("INSERT INTO rag_documents")) {
        return { rows: [{ id: params?.[0] === guidePath ? "doc-ready" : "doc-skipped" }] };
      }
      return { rows: [] };
    });

    const report = await ingestDocuments({ rootDir: root, chunkTokens: 8, queryRunner: queryRunner as unknown as QueryRunner });

    expect(report).toMatchObject({ dryRun: false, documents: 2, extracted: 1, skipped: 1 });
    const calls = queryRunner.mock.calls.map(([text]) => text);
    expect(calls[0]).toBe("BEGIN");
    expect(calls.at(-1)).toBe("COMMIT");
    expect(calls.filter((text) => text.includes("INSERT INTO rag_documents"))).toHaveLength(2);
    expect(calls.filter((text) => text === "DELETE FROM rag_chunks WHERE document_id = $1")).toHaveLength(2);

    const documentUpserts = queryRunner.mock.calls.filter(([text]) => text.includes("INSERT INTO rag_documents"));
    expect(documentUpserts[0][0]).toContain("ingestion_status");
    expect(documentUpserts[0][0]).toContain("last_ingested_at");
    expect(documentUpserts[1][1]).toEqual(
      expect.arrayContaining([
        scanPath,
        "needs_ocr",
        expect.stringContaining('"extractionStatus":"needs_ocr"'),
        0,
      ]),
    );

    const chunkInserts = queryRunner.mock.calls.filter(([text]) => text.includes("INSERT INTO rag_chunks"));
    expect(chunkInserts.length).toBe(report.chunks);
    expect(chunkInserts.every(([, params]) => params?.[0] === "doc-ready")).toBe(true);
  });

  it("rolls back the ingestion transaction when a database write fails", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "6");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    await writeFile(join(root, "guide.md"), "# Toplama\n\nToplama ve cikarma icin kisa rehber.");

    const queryRunner = vi.fn(async (text: string) => {
      if (text.includes("INSERT INTO rag_documents")) {
        return { rows: [{ id: "doc-ready" }] };
      }
      if (text === "DELETE FROM rag_chunks WHERE document_id = $1") {
        throw new Error("delete failed");
      }
      return { rows: [] };
    });

    await expect(
      ingestDocuments({ rootDir: root, chunkTokens: 8, queryRunner: queryRunner as unknown as QueryRunner }),
    ).rejects.toThrow("delete failed");
    expect(queryRunner.mock.calls.map(([text]) => text)).toEqual([
      "BEGIN",
      expect.stringContaining("INSERT INTO rag_documents"),
      "DELETE FROM rag_chunks WHERE document_id = $1",
      "ROLLBACK",
    ]);
  });

  it("resumes completed sources, retries transient writes and emits progress", async () => {
    vi.stubEnv("RAG_EMBED_DIM", "6");
    const root = await mkdtemp(join(tmpdir(), "arf-rag-"));
    const donePath = join(root, "done.md");
    const todoPath = join(root, "todo.md");
    await writeFile(donePath, "# Done\n\nOnceki ingestion tamamlandi.");
    await writeFile(todoPath, "# Todo\n\nYeni ingestion icin kisa rehber.");

    const progress: unknown[] = [];
    let chunkInsertAttempts = 0;
    const queryRunner = vi.fn(async (text: string, params?: readonly unknown[]) => {
      if (text.includes("SELECT source_path FROM rag_documents")) {
        return { rows: [{ source_path: donePath }] };
      }
      if (text.includes("INSERT INTO rag_documents")) return { rows: [{ id: "doc-todo" }] };
      if (text.includes("INSERT INTO rag_chunks")) {
        chunkInsertAttempts += 1;
        if (chunkInsertAttempts === 1) throw new Error("temporary chunk failure");
      }
      return { rows: [] };
    });

    const report = await ingestDocuments({
      rootDir: root,
      queryRunner: queryRunner as unknown as QueryRunner,
      batchSize: 1,
      maxRetries: 2,
      resume: true,
      progress: (event) => progress.push(event),
      chunkTokens: 8,
    });

    expect(report).toMatchObject({ documents: 2, resumed: 1, extracted: 1, skipped: 0 });
    expect(chunkInsertAttempts).toBe(2);
    expect(progress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "resume", completed: 1, total: 2 }),
        expect.objectContaining({ stage: "extract", completed: 1, total: 1 }),
        expect.objectContaining({ stage: "documents", completed: 1, total: 1 }),
        expect.objectContaining({ stage: "chunks", completed: report.chunks, total: report.chunks }),
      ]),
    );
  });

  it("reports retrieval smoke counts with injectable query runner", async () => {
    const queryRunner = vi.fn().mockResolvedValueOnce({
      rows: [{ title: "Guide", source_path: "/docs/guide.md", chunk_index: 0, content: "Toplama rehberi" }],
    });

    const report = await verifyRetrievalSmoke("toplama", { queryRunner, limit: 1 });

    expect(report).toEqual({
      query: "toplama",
      ok: true,
      matches: 1,
      top: [{ title: "Guide", sourcePath: "/docs/guide.md", chunkIndex: 0 }],
    });
  });
});
