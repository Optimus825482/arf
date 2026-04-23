import "server-only";

interface EnvReport {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates required env vars at startup. Call once from a root server
 * component / route so misconfigured prod deploys fail loudly instead of
 * silently serving 500s.
 */
export function validateEnv(): EnvReport {
  const missing: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
  const hasApplicationDefaultCreds = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.K_SERVICE,
  );

  // Firebase Admin is required for any API that uses getAdminDb()
  if (!hasServiceAccount && !hasApplicationDefaultCreds) {
    if (isProd) {
      missing.push(
        "Firebase Admin credentials (FIREBASE_SERVICE_ACCOUNT or platform ADC)",
      );
    } else {
      warnings.push(
        "Firebase Admin credentials missing (admin APIs disabled)",
      );
    }
  } else {
    if (hasServiceAccount) {
      try {
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
      } catch {
        missing.push("FIREBASE_SERVICE_ACCOUNT (invalid JSON)");
      }
    }
  }

  // AI keys — at least one must exist for the AI features
  if (!process.env.DEEPSEEK_API_KEY && !process.env.GEMINI_API_KEY) {
    warnings.push("No AI API key configured (DEEPSEEK_API_KEY / GEMINI_API_KEY). AI features will 400.");
  }

  if (isProd && process.env.ALLOW_UNVERIFIED_AUTH === "true") {
    missing.push("ALLOW_UNVERIFIED_AUTH must not be 'true' in production");
  }

  if (isProd && !process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push("UPSTASH_REDIS_REST_URL missing — rate limiter is in-memory only (per-instance).");
  }

  return { ok: missing.length === 0, missing, warnings };
}

let _checked = false;

/** Idempotent: runs once per server process. Throws in prod on missing vars. */
export function ensureEnv(): void {
  if (_checked) return;
  _checked = true;
  const report = validateEnv();
  for (const w of report.warnings) console.warn(`[env] ${w}`);
  if (!report.ok) {
    const msg = `Missing required env: ${report.missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.error(`[env] ${msg}`);
  }
}
