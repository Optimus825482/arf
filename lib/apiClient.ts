"use client";
import { auth } from './firebase';

function toRequestUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== 'string') return input;
  if (!input.startsWith('/')) return input;
  if (typeof window === 'undefined') return input;
  return new URL(input, window.location.origin);
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await auth.authStateReady().catch(() => undefined);

  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.set('Authorization', `Bearer ${token}`);
    } catch (e) {
      console.warn('Failed to attach auth token:', e);
    }
  }

  try {
    return await fetch(toRequestUrl(input), {
      ...init,
      headers,
      cache: init.cache ?? 'no-store',
    });
  } catch (error) {
    if (user) {
      try {
        const freshToken = await user.getIdToken(true);
        headers.set('Authorization', `Bearer ${freshToken}`);
        return await fetch(toRequestUrl(input), {
          ...init,
          headers,
          cache: init.cache ?? 'no-store',
        });
      } catch {
        // Fall through to the original network error below.
      }
    }

    if (error instanceof TypeError) {
      const target = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'request';
      throw new TypeError(`Failed to fetch ${target}`);
    }

    throw error;
  }
}
