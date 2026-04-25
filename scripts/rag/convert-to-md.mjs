#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename } from "node:path";
import { dirname, join, relative, resolve, extname } from "node:path";

const projectRoot = resolve(new URL("../..", import.meta.url).pathname.replace(/^\//, ""));
const DEFAULT_ROOTS = [
  "research_lab/matematik_belgeler_2",
  "research_lab/Matematik_Egitimi_Belgeleri",
];
const CACHE_ROOT = resolve(projectRoot, "research_lab", "rag_cache");
const MARKITDOWN = process.env.MARKITDOWN_CMD || "markitdown";
const SUPPORTED = new Set([".pdf", ".html", ".htm", ".docx", ".txt", ".md"]);

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyFlag = args.indexOf("--only");
const onlySubstr = onlyFlag >= 0 ? (args[onlyFlag + 1] || "").toLowerCase() : null;
const roots = args.filter((a) => !a.startsWith("--") && a !== (onlyFlag >= 0 ? args[onlyFlag + 1] : ""));
const effectiveRoots = roots.length > 0 ? roots : DEFAULT_ROOTS;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (SUPPORTED.has(extname(entry).toLowerCase())) acc.push(full);
  }
  return acc;
}

function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
}

function cachePaths(sourcePath) {
  const rel = relative(projectRoot, sourcePath).replace(/\\/g, "/");
  const base = join(CACHE_ROOT, rel);
  return { mdPath: `${base}.md`, metaPath: `${base}.meta.json` };
}

function detectMagicExt(sourcePath) {
  try {
    const fd = readFileSync(sourcePath).slice(0, 8);
    if (fd.length >= 4 && fd[0] === 0x25 && fd[1] === 0x50 && fd[2] === 0x44 && fd[3] === 0x46) return ".pdf";
    if (fd.length >= 4 && fd[0] === 0x50 && fd[1] === 0x4b && fd[2] === 0x03 && fd[3] === 0x04) return ".docx";
  } catch {}
  return null;
}

function looksLikePdfStreamLeak(text) {
  const head = text.slice(0, 200);
  if (/^\s*%PDF-/.test(head)) return true;
  const endstream = (text.match(/endstream/g) || []).length;
  const endobj = (text.match(/endobj/g) || []).length;
  if (endstream >= 3 || endobj >= 5) return true;
  // High ratio of replacement characters / non-printable suggests garbled binary
  const nonPrintable = (text.match(/[\u0000-\u0008\u000E-\u001F\uFFFD]/g) || []).length;
  if (nonPrintable / Math.max(1, text.length) > 0.02) return true;
  return false;
}

function runMarkitdown(sourcePath) {
  const ext = extname(sourcePath).toLowerCase();
  const magic = detectMagicExt(sourcePath);
  let invokePath = sourcePath;
  let tempPath = null;
  if (magic && magic !== ext) {
    tempPath = join(tmpdir(), `mdconv-${process.pid}-${Date.now()}-${basename(sourcePath, ext)}${magic}`);
    copyFileSync(sourcePath, tempPath);
    invokePath = tempPath;
  }
  try {
    const res = spawnSync(MARKITDOWN, [invokePath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
      timeout: 120_000,
    });
    if (res.status !== 0) {
      return { ok: false, error: (res.stderr || "markitdown failed").toString().trim().slice(0, 500) };
    }
    const text = (res.stdout || "").trim();
    if (!text || text.length < 80) return { ok: false, error: "empty or too-short output (likely needs_ocr)" };
    if (looksLikePdfStreamLeak(text)) return { ok: false, error: "pdf-stream leakage in output (binary not parsed)" };
    return { ok: true, text, magicOverride: magic && magic !== ext ? magic : null };
  } finally {
    if (tempPath) {
      try { unlinkSync(tempPath); } catch {}
    }
  }
}

function processOne(sourcePath) {
  const { mdPath, metaPath } = cachePaths(sourcePath);
  const hash = fileHash(sourcePath);
  if (!force && existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      if (meta.fileHash === hash) return { status: "cached", sourcePath };
    } catch {}
  }
  mkdirSync(dirname(mdPath), { recursive: true });
  const started = Date.now();
  const result = runMarkitdown(sourcePath);
  const elapsedMs = Date.now() - started;
  if (!result.ok) {
    const meta = { sourcePath, fileHash: hash, status: "needs_ocr", error: result.error, elapsedMs };
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    return { status: "needs_ocr", sourcePath, error: result.error, elapsedMs };
  }
  writeFileSync(mdPath, result.text, "utf8");
  const meta = {
    sourcePath,
    fileHash: hash,
    status: "ok",
    chars: result.text.length,
    magicOverride: result.magicOverride || null,
    elapsedMs,
    convertedAt: new Date().toISOString(),
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  return { status: "ok", sourcePath, chars: result.text.length, elapsedMs };
}

function collect() {
  const files = [];
  for (const r of effectiveRoots) {
    const abs = resolve(projectRoot, r);
    if (!existsSync(abs)) continue;
    walk(abs, files);
  }
  return onlySubstr ? files.filter((f) => f.toLowerCase().includes(onlySubstr)) : files;
}

const files = collect();
console.error(`[md-cache] ${files.length} files queued (roots=${effectiveRoots.join(",")}${onlySubstr ? `, only=${onlySubstr}` : ""})`);

const summary = { ok: 0, needs_ocr: 0, cached: 0, total: files.length, totalMs: 0 };
const failures = [];
const startedAll = Date.now();
for (let i = 0; i < files.length; i += 1) {
  const f = files[i];
  const r = processOne(f);
  summary[r.status] += 1;
  summary.totalMs += r.elapsedMs || 0;
  const idx = String(i + 1).padStart(String(files.length).length, " ");
  console.error(`[md-cache] ${idx}/${files.length} ${r.status.padEnd(10)} ${r.elapsedMs ?? 0}ms  ${relative(projectRoot, f)}`);
  if (r.status === "needs_ocr") failures.push({ sourcePath: f, error: r.error });
}
summary.wallMs = Date.now() - startedAll;
console.log(JSON.stringify({ summary, failures }, null, 2));
