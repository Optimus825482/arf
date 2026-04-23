import { NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '@/lib/adminAuth';
import { checkRateLimit, clientKey, rateLimited } from '@/lib/rateLimit';

export async function GET(req: Request) {
  try {
    const authed = await verifyRequest(req);
    if (!authed) return unauthorized();
    const rl = checkRateLimit({ windowMs: 60_000, max: 30, key: clientKey(req, authed.uid) });
    if (!rl.ok) return rateLimited(rl.retryAfter!);

    return NextResponse.json({ sessions: [], message: 'Game sessions are tracked via daily stats.' });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
