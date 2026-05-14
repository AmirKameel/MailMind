// Tiny structured logger with PII redaction.
// Tokens, passwords, and raw RFC822 must never appear in logs.

const REDACT_KEYS = [
  "access_token",
  "refresh_token",
  "id_token",
  "imapPassEnc",
  "imapPass",
  "password",
  "authorization",
  "cookie",
];

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.includes(k)) out[k] = "[REDACTED]";
    else out[k] = redact(v);
  }
  return out;
}

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  const line = {
    t: new Date().toISOString(),
    lvl: level,
    msg,
    ...(ctx ? { ctx: redact(ctx) as Record<string, unknown> } : {}),
  };
  const stream = level === "error" || level === "warn" ? console.error : console.log;
  stream(JSON.stringify(line));
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => {
    if (process.env.LOG_LEVEL === "debug") emit("debug", msg, ctx);
  },
  info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
};
