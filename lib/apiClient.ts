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
  const buildHeaders = async (forceRefresh = false) => {
    const headers = new Headers(init.headers || {});
    if (user) {
      try {
        const token = await user.getIdToken(forceRefresh);
        headers.set('Authorization', `Bearer ${token}`);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to attach auth token:', e);
        }
      }
    }
    return headers;
  };

  const doFetch = async (forceRefresh = false) => {
    const headers = await buildHeaders(forceRefresh);
    return fetch(toRequestUrl(input), {
      ...init,
      headers,
      cache: init.cache ?? 'no-store',
    });
  };

  try {
    const response = await doFetch(false);

    if ((response.status === 401 || response.status === 403) && user) {
      response.body?.cancel();
      return await doFetch(true);
    }

    return response;
  } catch (error) {
    if (user) {
      try {
        return await doFetch(true);
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
