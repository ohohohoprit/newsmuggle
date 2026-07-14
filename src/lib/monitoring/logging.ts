/**
 * Structured logging — JSON-formatted logs with correlation IDs,
 * log levels, and optional external sink integration.
 *
 * Env vars for external sinks (optional, plug in later):
 *   - LOG_SINK_URL    (HTTP POST endpoint for log aggregation)
 *   - LOG_LEVEL       (minimum level to log: debug|info|warn|error)
 *
 * In production, set LOG_LEVEL=info and LOG_SINK_URL to your log
 * aggregator (Datadog, Logtail, Grafana Loki, etc.).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (env && env in LEVEL_PRIORITY) return env as LogLevel;
  return 'debug'; // default: log everything in dev
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  workspaceId?: string;
  ip?: string;
  [key: string]: unknown;
}

/**
 * Structured log entry — JSON-serializable for log aggregators.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Log a structured message. Outputs to console (always) + external
 * sink (if configured, best-effort).
 */
export function structuredLog(
  level: LogLevel,
  category: string,
  context: LogContext & { message?: string } = {},
): void {
  if (!shouldLog(level)) return;

  const message = context.message ?? category;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...context,
  };
  delete (entry as Record<string, unknown>).message;
  entry.message = message;

  // Console output (human-readable in dev, JSON in prod)
  if (process.env.NODE_ENV === 'production') {
    const json = JSON.stringify(entry);
    if (level === 'error') console.error(json);
    else if (level === 'warn') console.warn(json);
    else console.log(json);
  } else {
    // Dev: colored, human-readable
    const prefix = `[${level.toUpperCase()}] [${category}]`;
    const ctx = { ...context };
    delete ctx.message;
    const ctxStr = Object.keys(ctx).length > 0 ? ' ' + JSON.stringify(ctx) : '';
    const msg = `${prefix} ${message}${ctxStr}`;
    if (level === 'error') console.error(msg);
    else if (level === 'warn') console.warn(msg);
    else console.log(msg);
  }

  // External sink (best-effort, non-blocking)
  sendToSink(entry).catch(() => {});
}

/**
 * Send log entry to external sink (if configured).
 * Non-blocking — never fails the caller.
 */
async function sendToSink(entry: LogEntry): Promise<void> {
  const sinkUrl = process.env.LOG_SINK_URL;
  if (!sinkUrl) return;

  try {
    await fetch(sinkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
  } catch {
    // best-effort — don't fail if sink is unavailable
  }
}

/**
 * Convenience loggers.
 */
export const log = {
  debug: (category: string, context?: LogContext) => structuredLog('debug', category, context ?? {}),
  info: (category: string, context?: LogContext) => structuredLog('info', category, context ?? {}),
  warn: (category: string, context?: LogContext) => structuredLog('warn', category, context ?? {}),
  error: (category: string, context?: LogContext) => structuredLog('error', category, context ?? {}),
};
