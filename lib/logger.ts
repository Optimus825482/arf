import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === "production";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(isProd ? {} : { stack: err.stack }),
    };
  }
  return { message: String(err) };
}

function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ? { ctx: sanitize(ctx) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

function sanitize(ctx: LogContext): LogContext {
  const out: LogContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v instanceof Error) out[k] = serializeError(v);
    else if (typeof v === "string" && /(api[_-]?key|secret|token|password)/i.test(k)) out[k] = "[REDACTED]";
    else out[k] = v;
  }
  return out;
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => {
    if (!isProd) emit("debug", msg, ctx);
  },
  info: (msg: string, ctx?: LogContext) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit("warn", msg, ctx),
  error: (msg: string, err?: unknown, ctx?: LogContext) =>
    emit("error", msg, { ...(ctx ?? {}), ...(err !== undefined ? { err: serializeError(err) } : {}) }),
};
