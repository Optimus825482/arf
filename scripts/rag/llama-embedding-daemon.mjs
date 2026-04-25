#!/usr/bin/env node

import { getLlama, resolveModelFile, LlamaLogLevel } from "node-llama-cpp";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const DEFAULT_MODEL_URI =
  "hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf";
const model =
  process.env.RAG_EMBEDDING_MODEL_PATH ||
  process.env.RAG_EMBEDDING_MODEL_URI ||
  process.env.QMD_EMBED_MODEL ||
  DEFAULT_MODEL_URI;
const modelCacheDir =
  process.env.RAG_MODELS_DIR || join(homedir(), ".cache", "qmd", "models");
const maxInputTokens = Number.parseInt(process.env.RAG_EMBED_MAX_INPUT_TOKENS ?? "", 10);

async function resolveModel(modelRef) {
  if (modelRef.startsWith("hf:")) return await resolveModelFile(modelRef, modelCacheDir);
  return modelRef;
}

const llama = await getLlama({ build: "autoAttempt", logLevel: LlamaLogLevel.error });
const modelPath = await resolveModel(model);
const loadedModel = await llama.loadModel({ modelPath });
const context = await loadedModel.createEmbeddingContext();
const trainContextSize = loadedModel.trainContextSize || 2048;
const tokenLimit = Number.isFinite(maxInputTokens) && maxInputTokens > 0
  ? Math.min(maxInputTokens, trainContextSize - 8)
  : trainContextSize - 8;

process.stdout.write(JSON.stringify({ ready: true, dim: loadedModel.embeddingVectorSize ?? null }) + "\n");

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of rl) {
  if (!line) continue;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({ error: "invalid json" }) + "\n");
    continue;
  }
  const id = req.id;
  const text = typeof req.text === "string" ? req.text : "";
  if (!text) {
    process.stdout.write(JSON.stringify({ id, error: "empty text" }) + "\n");
    continue;
  }
  try {
    const tokens = loadedModel.tokenize(text);
    const safeInput = tokens.length > tokenLimit
      ? loadedModel.detokenize(tokens.slice(0, tokenLimit))
      : text;
    const embedding = await context.getEmbeddingFor(safeInput);
    process.stdout.write(JSON.stringify({ id, embedding: Array.from(embedding.vector) }) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({ id, error: String(error?.message ?? error) }) + "\n");
  }
}

await context.dispose();
await loadedModel.dispose();
await llama.dispose();
