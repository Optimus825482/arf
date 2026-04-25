"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-slate-200">
      <div className="glass-panel w-full max-w-md space-y-5 p-8 text-center">
        <AlertTriangle className="mx-auto h-14 w-14 text-secondary" aria-hidden="true" />
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-wide text-white">
            Sistem durdu
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Beklenmeyen bir hata oldu. Veriler korunuyor; ekranı yeniden kurmayı deneyebilirsin.
          </p>
        </div>
        {process.env.NODE_ENV !== "production" && error?.message && (
          <pre className="max-h-28 overflow-auto rounded-xl bg-red-950/20 p-3 text-left text-xs text-red-300/80">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          aria-label="Sayfayı yeniden dene"
          className="neon-btn-blue mx-auto flex items-center gap-2 px-6 py-3"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Yeniden Dene
        </button>
      </div>
    </div>
  );
}
