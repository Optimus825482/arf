import { NextResponse } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/adminAuth";
import { checkRateLimit, clientKey, rateLimited } from "@/lib/rateLimit";
import { buildRagPromptContext } from "@/lib/rag/context";
import { retrieveRagContext } from "@/lib/rag/retrieve";
import { formatZodError, ragQueryRequestSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const authed = await verifyRequest(req);
  if (!authed) return unauthorized();

  const rl = checkRateLimit({
    windowMs: 60_000,
    max: 20,
    key: clientKey(req, authed.uid),
  });
  if (!rl.ok) return rateLimited(rl.retryAfter!);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Gecersiz JSON." }, { status: 400 });
  }

  const parsed = ragQueryRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: `Gecersiz istek: ${formatZodError(parsed.error)}` }, { status: 400 });
  }

  const { query, maxContextChars, ...retrieveOptions } = parsed.data;
  const matches = await retrieveRagContext(query, {
    ...retrieveOptions,
    maxContextChars,
  });
  const context = buildRagPromptContext({
    query,
    matches,
    maxChars: maxContextChars,
  });

  return NextResponse.json({ ok: true, matches, context });
}
