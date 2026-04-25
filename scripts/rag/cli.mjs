#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { startEmbeddingDaemon } from "./embedding-daemon-client.mjs";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const buildRoot = join(projectRoot, ".tmp", "rag-cli");

const COMMANDS = new Set(["inventory", "ingest", "verify"]);
const VALUE_FLAGS = new Set([
  "--batch-size",
  "--chunk-tokens",
  "--limit",
  "--max-retries",
  "--only",
  "--overlap-tokens",
  "--query",
  "-q",
]);
const DEFAULT_ROOTS = [
  "research_lab/matematik_belgeler_2",
  "research_lab/Matematik_Egitimi_Belgeleri",
  "docs",
].filter((path) => existsSync(join(projectRoot, path)));

function printUsage() {
  console.log(`Usage:
  npm run rag:inventory -- [--json] [root ...]
  npm run rag:ingest -- [--dry-run] [--resume] [--progress] [--daemon] [--only substr] [--batch-size n] [--max-retries n] [--chunk-tokens n] [--overlap-tokens n] [root ...]
  npm run rag:verify -- --query "toplama stratejileri" [--limit n]

Direct:
  node scripts/rag/cli.mjs inventory [root ...]
  node scripts/rag/cli.mjs ingest --dry-run [root ...]
  node scripts/rag/cli.mjs verify --query "toplama"`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function buildScripts() {
  const tscBin = join(projectRoot, "node_modules", "typescript", "bin", "tsc");
  if (!existsSync(tscBin)) {
    fail("typescript bulunamadi. Once npm install calistirin.");
  }

  const result = spawnSync(process.execPath, [tscBin, "-p", "tsconfig.rag.json"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail("RAG CLI build basarisiz oldu.");
  }
}

function readFlag(args, names, fallback) {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) {
      return args[index + 1] ?? fallback;
    }
  }
  return fallback;
}

function positionalArgs(args) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const next = args[index + 1];
      if (VALUE_FLAGS.has(arg) && next && !next.startsWith("--")) index += 1;
      continue;
    }
    values.push(arg);
  }
  return values;
}

function numberFlag(args, names, fallback) {
  const raw = readFlag(args, names);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function rootsFromArgs(args) {
  const roots = positionalArgs(args);
  return roots.length > 0 ? roots : DEFAULT_ROOTS;
}

function summarizeByType(documents) {
  return documents.reduce((summary, doc) => {
    summary[doc.sourceType] = (summary[doc.sourceType] ?? 0) + 1;
    return summary;
  }, {});
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function runInventory(args, modules) {
  const roots = rootsFromArgs(args);
  if (roots.length === 0) fail("Envanter icin kok klasor bulunamadi.");

  const batches = await Promise.all(
    roots.map(async (root) => ({
      rootDir: resolve(projectRoot, root),
      documents: await modules.inventory.inventoryDocuments(resolve(projectRoot, root)),
    })),
  );
  const documents = batches.flatMap((batch) => batch.documents);
  const report = {
    command: "inventory",
    roots: batches.map((batch) => batch.rootDir),
    documents: documents.length,
    byType: summarizeByType(documents),
  };

  if (args.includes("--json")) {
    printJson({ ...report, documentList: documents });
    return;
  }

  printJson(report);
}

async function runIngest(args, modules) {
  const roots = rootsFromArgs(args);
  if (roots.length === 0) fail("Ingestion icin kok klasor bulunamadi.");

  const useDaemon = args.includes("--daemon");
  let daemon = null;
  let embedder;
  if (useDaemon) {
    console.error("[rag] embedding daemon starting...");
    const started = Date.now();
    daemon = startEmbeddingDaemon({ cwd: projectRoot });
    await daemon.ready;
    console.error(`[rag] daemon ready in ${Date.now() - started} ms`);
    embedder = (text) => daemon.embed(text);
  }

  const reports = [];
  for (const root of roots) {
    reports.push(
      await modules.ingest.ingestDocuments({
        rootDir: resolve(projectRoot, root),
        dryRun: args.includes("--dry-run"),
        resume: args.includes("--resume"),
        batchSize: numberFlag(args, ["--batch-size"], undefined),
        maxRetries: numberFlag(args, ["--max-retries"], undefined),
        chunkTokens: numberFlag(args, ["--chunk-tokens"], undefined),
        overlapTokens: numberFlag(args, ["--overlap-tokens"], undefined),
        only: readFlag(args, ["--only"], undefined),
        embedder,
        progress: args.includes("--progress")
          ? (event) => {
              if (event.sourcePath) {
                const rel = event.sourcePath.replace(projectRoot + "\\", "").replace(projectRoot + "/", "");
                const idx = String(event.completed).padStart(String(event.total).length, " ");
                const status = event.status ? ` [${event.status}]` : "";
                console.error(`[${event.stage}] ${idx}/${event.total}${status} ${rel}`);
              } else {
                console.error(`[${event.stage}] ${event.completed}/${event.total}`);
              }
            }
          : undefined,
      }),
    );
  }

  if (daemon) await daemon.close();

  printJson({
    command: "ingest",
    reports,
    totals: reports.reduce(
      (totals, report) => ({
        documents: totals.documents + report.documents,
        extracted: totals.extracted + report.extracted,
        chunks: totals.chunks + report.chunks,
        embeddings: totals.embeddings + report.embeddings,
        skipped: totals.skipped + report.skipped,
        resumed: totals.resumed + report.resumed,
      }),
      { documents: 0, extracted: 0, chunks: 0, embeddings: 0, skipped: 0, resumed: 0 },
    ),
  });
}

async function runVerify(args, modules) {
  const query = readFlag(args, ["--query", "-q"], positionalArgs(args).join(" ")) || "toplama";
  const limit = numberFlag(args, ["--limit"], 5);
  printJson(await modules.verify.verifyRetrievalSmoke(query, { limit }));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!COMMANDS.has(command) || args.includes("--help")) {
    printUsage();
    process.exit(args.includes("--help") || !command ? 0 : 1);
  }

  buildScripts();

  const require = createRequire(import.meta.url);
  const modules = {
    inventory: require(join(buildRoot, "scripts", "rag", "inventory.js")),
    ingest: require(join(buildRoot, "scripts", "rag", "ingest.js")),
    verify: require(join(buildRoot, "scripts", "rag", "verify.js")),
  };

  if (command === "inventory") await runInventory(args, modules);
  if (command === "ingest") await runIngest(args, modules);
  if (command === "verify") await runVerify(args, modules);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
