type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function shouldLog() {
  return process.env.APP_LOG_ENABLED !== "0";
}

export function createTraceId(prefix = "trace") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  if (!shouldLog()) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function safeErrorName(error: unknown) {
  if (error instanceof Error) return error.name;
  return typeof error;
}

