import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { inflateRawSync } from "node:zlib";
import { resolve as resolvePath } from "node:path";
import type { RagExtractedDocument, RagInventoryDocument } from "./types";

type ExtractInput = Pick<RagInventoryDocument, "sourcePath" | "sourceType"> &
  Partial<Omit<RagInventoryDocument, "sourcePath" | "sourceType">>;

const execFileAsync = promisify(execFile);
const MIN_EXTRACTED_TEXT_LENGTH = 24;

export async function extractDocument(input: ExtractInput): Promise<RagExtractedDocument> {
  const doc: RagInventoryDocument = {
    title: input.title ?? input.sourcePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "untitled",
    bytes: input.bytes ?? 0,
    modifiedAt: input.modifiedAt ?? new Date(0).toISOString(),
    ...input,
  };

  const cached = await tryReadMdCache(doc.sourcePath);
  if (cached) {
    return {
      ...doc,
      status: "ready",
      extractedText: cached.text,
      metadata: { extractor: "md_cache", cachePath: cached.cachePath },
    };
  }

  if (doc.sourceType === "txt" || doc.sourceType === "md") {
    const extractedText = await readFile(doc.sourcePath, "utf8");
    return {
      ...doc,
      status: "ready",
      extractedText: extractedText.trim(),
      metadata: { extractor: "direct_utf8" },
    };
  }

  if (doc.sourceType === "html") {
    const html = await readFile(doc.sourcePath, "utf8");
    return {
      ...doc,
      status: "ready",
      extractedText: extractHtmlText(html),
      metadata: { extractor: "html_fallback" },
    };
  }

  if (doc.sourceType === "pdf") {
    const extraction = await extractPdfText(doc.sourcePath);
    if (extraction.status === "ready") {
      return {
        ...doc,
        status: "ready",
        extractedText: extraction.text,
        metadata: { extractor: extraction.extractor },
      };
    }

    return {
      ...doc,
      status: "needs_ocr",
      extractedText: `[needs_ocr] ${doc.sourcePath} requires OCR because local PDF text extraction returned no usable text.`,
      metadata: { extractor: extraction.extractor, reason: extraction.reason },
    };
  }

  if (doc.sourceType === "docx") {
    const extraction = await extractDocxText(doc.sourcePath);
    if (extraction.status === "ready") {
      return {
        ...doc,
        status: "ready",
        extractedText: extraction.text,
        metadata: { extractor: extraction.extractor },
      };
    }

    return {
      ...doc,
      status: "unsupported",
      extractedText: `[unsupported] ${doc.sourcePath} does not contain extractable DOCX paragraph text.`,
      metadata: { extractor: extraction.extractor, reason: extraction.reason },
    };
  }

  return {
    ...doc,
    status: "unsupported",
    extractedText: `[unsupported] ${doc.sourcePath} is not extracted by the local fallback extractor yet.`,
    metadata: { extractor: "placeholder", reason: "docx_unsupported" },
  };
}

async function tryReadMdCache(sourcePath: string): Promise<{ text: string; cachePath: string } | null> {
  const marker = "research_lab";
  const normalized = sourcePath.replace(/\\/g, "/");
  const idx = normalized.indexOf(`/${marker}/`);
  if (idx < 0) return null;
  const relFromMarker = normalized.slice(idx + 1);
  const projectRoot = normalized.slice(0, idx);
  const cachePath = resolvePath(projectRoot, "research_lab", "rag_cache", relFromMarker) + ".md";
  try {
    const st = await stat(cachePath);
    if (!st.isFile() || st.size < 40) return null;
    const text = await readFile(cachePath, "utf8");
    const trimmed = text.trim();
    if (trimmed.length < 40) return null;
    return { text: trimmed, cachePath };
  } catch {
    return null;
  }
}

async function extractDocxText(sourcePath: string): Promise<
  | { status: "ready"; text: string; extractor: string }
  | { status: "unsupported"; extractor: string; reason: string }
> {
  try {
    const archive = await readFile(sourcePath);
    const documentXml = readZipEntry(archive, "word/document.xml");
    if (!documentXml) {
      return { status: "unsupported", extractor: "docx_xml_fallback", reason: "document_xml_missing" };
    }

    const text = normalizeExtractedText(extractDocxParagraphs(documentXml.toString("utf8")));
    if (hasUsableText(text)) {
      return { status: "ready", text, extractor: "docx_xml_fallback" };
    }

    return { status: "unsupported", extractor: "docx_xml_fallback", reason: "docx_empty_text" };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    return { status: "unsupported", extractor: "docx_xml_fallback", reason: `docx_${code}` };
  }
}

function readZipEntry(archive: Buffer, targetName: string) {
  let offset = 0;
  while (offset <= archive.length - 46) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const fileName = archive.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    if (fileName === targetName) {
      if (archive.readUInt32LE(localHeaderOffset) !== 0x04034b50) return undefined;

      const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = archive.subarray(dataStart, dataStart + compressedSize);

      if (method === 0) return compressed;
      if (method === 8) return inflateRawSync(compressed);
      return undefined;
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return undefined;
}

function extractDocxParagraphs(xml: string) {
  const paragraphs: string[] = [];
  for (const match of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    const paragraphXml = match[0]
      .replace(/<w:tab\b[^>]*\/>/g, " ")
      .replace(/<w:br\b[^>]*\/>/g, "\n");
    const text = [...paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((part) => decodeHtmlEntities(part[1] ?? ""))
      .join("");

    if (text.trim()) paragraphs.push(text);
  }

  return paragraphs.join("\n\n");
}

async function extractPdfText(sourcePath: string): Promise<
  | { status: "ready"; text: string; extractor: string }
  | { status: "needs_ocr"; extractor: string; reason: string }
> {
  const markitdown = await extractPdfWithMarkitdown(sourcePath);
  if (markitdown.status === "ready") return markitdown;

  const raw = await readFile(sourcePath);
  const fallbackText = normalizeExtractedText(extractPdfLiteralText(raw));
  if (hasUsableText(fallbackText) && !looksLikePdfStreamLeak(fallbackText)) {
    return { status: "ready", text: fallbackText, extractor: "pdf_literal_fallback" };
  }

  return {
    status: "needs_ocr",
    extractor: markitdown.extractor,
    reason: markitdown.reason,
  };
}

async function extractPdfWithMarkitdown(sourcePath: string): Promise<
  | { status: "ready"; text: string; extractor: string }
  | { status: "needs_ocr"; extractor: string; reason: string }
> {
  const command = process.env.MARKITDOWN_CMD ?? "markitdown";
  try {
    const { stdout } = await execFileAsync(command, [sourcePath], {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
    });
    const text = normalizeExtractedText(stdout);
    if (looksLikePdfStreamLeak(text)) {
      return { status: "needs_ocr", extractor: "markitdown", reason: "pdf_binary_leak" };
    }
    if (hasUsableText(text)) {
      return { status: "ready", text, extractor: "markitdown" };
    }
    return { status: "needs_ocr", extractor: "markitdown", reason: "pdf_empty_text" };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
    return { status: "needs_ocr", extractor: "markitdown", reason: `markitdown_${code}` };
  }
}

function extractPdfLiteralText(buffer: Buffer) {
  const content = buffer.toString("latin1");
  const fragments: string[] = [];

  for (const match of content.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    fragments.push(decodePdfLiteral(match[0].replace(/\)\s*Tj$/, "").slice(1)));
  }

  for (const match of content.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    const arrayContent = match[1] ?? "";
    const text = [...arrayContent.matchAll(/\((?:\\.|[^\\)])*\)/g)]
      .map((part) => decodePdfLiteral(part[0].slice(1, -1)))
      .join("");
    if (text) fragments.push(text);
  }

  return fragments.join("\n");
}

function decodePdfLiteral(value: string) {
  return value.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_match, escape: string) => {
    if (/^[0-7]+$/.test(escape)) {
      return String.fromCharCode(Number.parseInt(escape, 8));
    }
    return (
      {
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
        "(": "(",
        ")": ")",
        "\\": "\\",
      }[escape] ?? escape
    );
  });
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasUsableText(text: string) {
  return text.replace(/\s/g, "").length >= MIN_EXTRACTED_TEXT_LENGTH;
}

function looksLikePdfStreamLeak(text: string): boolean {
  const head = text.slice(0, 200);
  if (/^\s*%PDF-/.test(head)) return true;
  const endstream = (text.match(/endstream/g) || []).length;
  const endobj = (text.match(/endobj/g) || []).length;
  if (endstream >= 3 || endobj >= 5) return true;
  const nonPrintable = (text.match(/[\u0000-\u0008\u000E-\u001F\uFFFD]/g) || []).length;
  if (nonPrintable / Math.max(1, text.length) > 0.02) return true;
  return false;
}

function extractHtmlText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|hr)\b[^>]*>/gi, "\n")
      .replace(/<\/(p|div|section|article|main|header|footer|aside|nav|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, value: string) => {
    const lower = value.toLowerCase();
    if (lower.startsWith("#x")) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (lower.startsWith("#")) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return (
      {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
      }[lower] ?? entity
    );
  });
}
