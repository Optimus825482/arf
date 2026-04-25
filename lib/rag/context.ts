import { PEDAGOGICAL_BASE } from "../knowledge/pedagogy";
import { sanitizePromptInput } from "../sanitize";
import { retrieveRagContext } from "./retrieve";
import type { BuildPedagogicalRagContextOptions, BuildRagPromptContextOptions, RagContextMatch } from "./types";

const DEFAULT_MAX_CHARS = 2600;

function safeJoin(items: readonly string[], maxLen = 220): string {
  return items.map((item) => sanitizePromptInput(item, maxLen)).filter(Boolean).join(" ");
}

function basename(path: string): string {
  const clean = path.replace(/\\/g, "/");
  return clean.split("/").filter(Boolean).pop() ?? clean;
}

function formatSource(match: RagContextMatch, index: number): string {
  const title = sanitizePromptInput(match.title, 70);
  const source = sanitizePromptInput(`${basename(match.sourcePath)}#${match.chunkIndex}`, 80);
  const topic = match.topic ? ` konu=${sanitizePromptInput(match.topic, 40)}` : "";
  const score = Number.isFinite(match.similarity) ? match.similarity.toFixed(2) : "0.00";
  const content = sanitizePromptInput(match.content, 260);

  return `${index + 1}. ${title} (${source}, skor=${score}${topic}): ${content}`;
}

export function buildRagPromptContext(options: BuildRagPromptContextOptions = {}): string {
  const maxChars = Math.max(200, Math.min(Math.floor(options.maxChars ?? DEFAULT_MAX_CHARS), 6000));
  const frameworks = PEDAGOGICAL_BASE.scientificFrameworks;
  const strategies = PEDAGOGICAL_BASE.instructionalStrategies;
  const metacognition = PEDAGOGICAL_BASE.affectiveMetacognition;
  const matches = options.matches ?? [];

  const sections = [
    "PEDAGOJIK TABAN",
    matches.length === 0 ? "- Eslesen kaynak yok; pedagojik tabani kullan, kaynak uydurma." : "",
    `- Hata: ${sanitizePromptInput(frameworks.neuroplasticity.ai_action, 95)}`,
    `- Gorsel: ${sanitizePromptInput(frameworks.spatialTemporalReasoning.ai_action, 105)}`,
    `- Yuk: ${sanitizePromptInput(frameworks.cognitiveLoadManagement.ai_action, 105)}`,
    `- Kaygi: ${sanitizePromptInput(metacognition.anxiety_management.intervention, 120)}`,
    `- Iskele: ${safeJoin(strategies.scaffolding, 180)}`,
    "",
    "RAG KAYNAKLARI",
    matches.length > 0
      ? matches.map((match, index) => formatSource(match, index)).join("\n")
      : "- Eslesen kaynak yok; pedagojik tabani kullan, kaynak uydurma.",
  ];

  if (options.query) {
    sections.splice(1, 0, `- Sorgu: ${sanitizePromptInput(options.query, 120)}`);
  }

  const context = sections.join("\n").trim();
  return context.length <= maxChars ? context : `${context.slice(0, maxChars - 1).trimEnd()}…`;
}

export function formatRagContextForPrompt(context: string, options: { maxChars?: number } = {}): string {
  const maxChars = Math.max(120, Math.min(Math.floor(options.maxChars ?? DEFAULT_MAX_CHARS), 6000));
  const clean = sanitizePromptInput(context, maxChars);
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1)}…`.slice(0, maxChars);
}

export async function buildPedagogicalRagContext(options: BuildPedagogicalRagContextOptions): Promise<string> {
  const maxChars = options.maxChars ?? options.maxContextChars ?? DEFAULT_MAX_CHARS;
  const matches = await retrieveRagContext(options.query, {
    topK: options.topK ?? options.limit,
    minSimilarity: options.minSimilarity,
    maxContextChars: maxChars,
  });

  return buildRagPromptContext({
    query: options.query,
    matches,
    maxChars,
  });
}

export const buildRagContext = buildPedagogicalRagContext;
export const getRagContext = buildPedagogicalRagContext;
