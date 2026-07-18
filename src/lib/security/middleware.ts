/**
 * Security middleware helpers — reusable functions for route handlers.
 *
 * These are NOT Next.js middleware (which runs on every request but
 * can't easily access the DB). Instead, they're helper functions that
 * route handlers call to apply rate limiting, request logging, and
 * structured error wrapping.
 *
 * Usage in a route handler:
 *   export async function POST(req: Request) {
 *     const guard = await applySecurity(req, { routeKey: 'tool:run', requireAuth: true });
 *     if (guard.error) return guard.error;
 *     // ... business logic
 *     return wrapResponse(data);
 *   }
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { checkRateLimit, isBlocked } from '@/lib/security/rate-limit';
import { recordRequest, isFlagged } from '@/lib/security/abuse';
import { recordSecurityEvent } from '@/lib/security/events';
import { structuredLog } from '@/lib/monitoring/logging';
import { RateLimitExceededError, BlockedRequestError } from '@/lib/security/errors';

// ===== Correlation ID =====

const CORRELATION_ID_HEADER = 'x-correlation-id';

export function getCorrelationId(req: Request): string {
  return req.headers.get(CORRELATION_ID_HEADER) ?? generateCorrelationId();
}

function generateCorrelationId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function setCorrelationId(res: NextResponse, id: string): void {
  res.headers.set(CORRELATION_ID_HEADER, id);
}

// ===== Client info extraction =====

export function getClientInfo(req: Request): { ip: string | null; userAgent: string | null } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : null;
  const userAgent = req.headers.get('user-agent');
  return { ip, userAgent };
}

// ===== Security guard =====

export interface SecurityGuardOptions {
  /** Rate limit route key (e.g. 'tool:run', 'auth:login'). */
  routeKey?: string;
  /** Whether authentication is required. */
  requireAuth?: boolean;
  /** Whether to record the request for abuse detection. */
  recordForAbuse?: boolean;
  /** The route path for logging (defaults to URL pathname). */
  route?: string;
}

export interface SecurityGuardResult {
  allowed: boolean;
  error?: NextResponse;
  userId?: string;
  workspaceId?: string;
  correlationId: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
}

/**
 * Apply security checks to a request. Returns a guard result that
 * route handlers use to decide whether to proceed.
 *
 * Checks performed (in order):
 *   1. Rate limiting (if routeKey provided)
 *   2. Abuse detection (if recordForAbuse)
 *   3. Authentication (if requireAuth)
 *   4. Blocked check (abuse flags)
 */
export async function applySecurity(
  req: Request,
  opts: SecurityGuardOptions = {},
): Promise<SecurityGuardResult> {
  const correlationId = getCorrelationId(req);
  const { ip, userAgent } = getClientInfo(req);
  const route = opts.route ?? new URL(req.url).pathname;

  // Log the request
  structuredLog('info', 'request', {
    correlationId,
    method: req.method,
    route,
    ip: ip ?? undefined,
    userAgent: userAgent ?? undefined,
  });

  // 1. Check if blocked (abuse flag)
  if (ip) {
    const flagged = await isFlagged({ ip });
    if (flagged.blocked && flagged.blockedUntil) {
      structuredLog('warn', 'blocked_request', { correlationId, ip, blockedUntil: flagged.blockedUntil });
      return {
        allowed: false,
        correlationId,
        error: NextResponse.json(
          {
            error: 'BLOCKED_REQUEST',
            message: 'Request blocked due to suspicious activity.',
            blockedUntil: flagged.blockedUntil.toISOString(),
          },
          { status: 403 },
        ),
      };
    }
  }

  // 2. Rate limiting
  if (opts.routeKey) {
    const rateLimitResult = await checkRateLimit(opts.routeKey, { ip: ip ?? undefined, route });
    if (!rateLimitResult.allowed) {
      structuredLog('warn', 'rate_limited', { correlationId, ip: ip ?? undefined, route, routeKey: opts.routeKey });
      const status = rateLimitResult.blocked ? 403 : 429;
      const res = NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down and try again later.',
          retryAfter: rateLimitResult.retryAfterMs,
          resetAt: rateLimitResult.resetAt,
        },
        {
          status,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt,
            ...(rateLimitResult.retryAfterMs ? { 'Retry-After': String(Math.ceil(rateLimitResult.retryAfterMs / 1000)) } : {}),
          },
        },
      );
      setCorrelationId(res, correlationId);
      return { allowed: false, error: res, correlationId };
    }

    // 3. Record for abuse detection
    if (opts.recordForAbuse !== false) {
      // We'll get userId after auth if needed; for now use IP
      await recordRequest({ ip: ip ?? undefined, path: route, method: req.method }).catch(() => {});
    }
  }

  // 4. Authentication
  let userId: string | undefined;
  let workspaceId: string | undefined;
  if (opts.requireAuth) {
    const auth = await requireAuth(req);
    if (!auth.authenticated) {
      const res = NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
      setCorrelationId(res, correlationId);
      return { allowed: false, error: res, correlationId };
    }
    userId = auth.user!.id;

    // Get workspace if available
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });
    workspaceId = user?.activeWorkspaceId ?? undefined;

    // Record request with userId for abuse detection
    if (opts.routeKey && opts.recordForAbuse !== false) {
      await recordRequest({ ip: ip ?? undefined, userId, workspaceId, path: route, method: req.method }).catch(() => {});
    }
  }

  return {
    allowed: true,
    correlationId,
    userId,
    workspaceId,
    rateLimit: opts.routeKey
      ? { remaining: 0, limit: 0, resetAt: new Date().toISOString() }
      : undefined,
  };
}

/**
 * Wrap a response with correlation ID + structured logging.
 */
export function wrapResponse(data: unknown, correlationId: string, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  setCorrelationId(res, correlationId);
  return res;
}

/**
 * Wrap an error response with correlation ID + structured logging.
 */
export function wrapError(error: {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}, correlationId: string): NextResponse {
  const status = error.status ?? 500;
  structuredLog('error', 'api_error', {
    correlationId,
    error: error.code,
    message: error.message,
    status,
  });
  const res = NextResponse.json(
    {
      error: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      correlationId,
    },
    { status },
  );
  setCorrelationId(res, correlationId);
  return res;
}
