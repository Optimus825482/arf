#!/usr/bin/env node

import { getLlama, resolveModelFile, LlamaLogLevel } from "node-llama-cpp";
import { homedir } from "node:os";
import { join } from "node:path";

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

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function resolveModel(modelRef) {
  if (modelRef.startsWith("hf:")) {
    return await resolveModelFile(modelRef, modelCacheDir);
  }
  return modelRef;
}

const input = (await readStdin()).trim();
if (!input) {
  console.error("No input text received on stdin");
  process.exit(1);
}

const llama = await getLlama({
  build: "autoAttempt",
  logLevel: LlamaLogLevel.error,
});

const modelPath = await resolveModel(model);
const loadedModel = await llama.loadModel({ modelPath });
const context = await loadedModel.createEmbeddingContext();
const trainContextSize = loadedModel.trainContextSize || 2048;
const tokenLimit = Number.isFinite(maxInputTokens) && maxInputTokens > 0
  ? Math.min(maxInputTokens, trainContextSize - 8)
  : trainContextSize - 8;
const tokens = loadedModel.tokenize(input);
const safeInput = tokens.length > tokenLimit
  ? loadedModel.detokenize(tokens.slice(0, tokenLimit))
  : input;
const embedding = await context.getEmbeddingFor(safeInput);

console.log(JSON.stringify(Array.from(embedding.vector)));

await context.dispose();
await loadedModel.dispose();
await llama.dispose();
