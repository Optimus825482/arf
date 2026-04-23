import 'server-only';
import { NextResponse } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key: string;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

function inMemoryCheck({ windowMs, max, key }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
        if (buckets.size < MAX_KEYS) break;
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= max) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}

/**
 * Durable rate limiter: uses Upstash Redis when UPSTASH_REDIS_REST_URL is set
 * (multi-instance safe), otherwise falls back to in-memory (single instance).
 *
 * Upstash is called via the REST API (fetch) — no dependency needed.
 */
async function upstashCheck({ windowMs, max, key }: RateLimitOptions): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return inMemoryCheck({ windowMs, max, key });

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const fullKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;

  try {
    // Pipelined INCR + EXPIRE
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', fullKey],
        ['EXPIRE', fullKey, windowSec, 'NX'],
      ]),
      // Fail fast — don't let rate limiter block requests on network issues
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return inMemoryCheck({ windowMs, max, key });
    const data = (await res.json()) as Array<{ result: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    if (count > max) {
      return { ok: false, retryAfter: windowSec };
    }
    return { ok: true };
  } catch {
    // Fail open to in-memory — never fail a legitimate request because Redis hiccups
    return inMemoryCheck({ windowMs, max, key });
  }
}

export async function checkRateLimitAsync(opts: RateLimitOptions): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL) return upstashCheck(opts);
  return inMemoryCheck(opts);
}

/** Synchronous API (in-memory only). Kept for backward compatibility. */
export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  return inMemoryCheck(opts);
}

export function clientKey(req: Request, uid?: string): string {
  if (uid) return `u:${uid}`;
  const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anon';
  return `ip:${fwd.split(',')[0].trim()}`;
}

export function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
