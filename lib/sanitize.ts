/**
 * Sanitize user-controlled values before interpolating into LLM prompts.
 * Strips control chars, prompt-injection markers, code fences, and caps length.
 */
const INJECTION_PATTERNS = [
  /\bSYSTEM\s*:/gi,
  /\bASSISTANT\s*:/gi,
  /\bUSER\s*:/gi,
  /\bGOREV\s*:/gi,
  /\bSEN\s*:/gi,
  /\bIGNORE\s+(PREVIOUS|ABOVE|ALL)\s+INSTRUCTIONS/gi,
  /\bONCEKI\s+TALIMATLARI/gi,
  /<\|.*?\|>/g,
];

export function sanitizePromptInput(value: unknown, maxLen = 500): string {
  if (typeof value !== "string") return "";
  let out = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/`+/g, "'")
    .replace(/\${/g, "$ {")
    .replace(/[\r\n]+/g, " ");
  for (const pat of INJECTION_PATTERNS) out = out.replace(pat, "[filtered]");
  out = out.trim();
  if (out.length > maxLen) out = out.slice(0, maxLen) + "\u2026";
  return out;
}

type SanitizePromptValueOptions = {
  stringMaxLen?: number;
  maxDepth?: number;
  maxEntries?: number;
};

export function sanitizePromptValue(
  value: unknown,
  options: SanitizePromptValueOptions = {},
  depth = 0,
): unknown {
  const stringMaxLen = options.stringMaxLen ?? 500;
  const maxDepth = options.maxDepth ?? 3;
  const maxEntries = options.maxEntries ?? 20;

  if (typeof value === "string") return sanitizePromptInput(value, stringMaxLen);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean" || value === null) return value;
  if (depth >= maxDepth) return "[truncated]";

  if (Array.isArray(value)) {
    return value
      .slice(0, maxEntries)
      .map((item) => sanitizePromptValue(item, options, depth + 1));
  }

  if (typeof value === "object" && value) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, maxEntries)
        .map(([key, item]) => [
          sanitizePromptInput(key, 64),
          sanitizePromptValue(item, options, depth + 1),
        ]),
    );
  }

  return "";
}
