import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { deleteKey, deletePattern, clearNamespace } from '@/lib/cache/service';
import { validateCacheKey, validateCachePattern } from '@/lib/security/validation';
import { SecurityError, SecurityValidationError } from '@/lib/security/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/cache/invalidate
 * Invalidate specific cache entries by key, pattern, or namespace.
 * Admin only.
 *
 * Body:
 *   - key?: string       (exact key to delete)
 *   - pattern?: string   (wildcard pattern, e.g. 'plans:*')
 *   - namespace?: string (e.g. 'plans' to clear all 'plans:*' entries)
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (typeof body.key === 'string') {
      const key = validateCacheKey(body.key);
      const deleted = deleteKey(key);
      return NextResponse.json({ success: true, deleted: deleted ? 1 : 0, key });
    }

    if (typeof body.pattern === 'string') {
      const pattern = validateCachePattern(body.pattern);
      const deleted = deletePattern(pattern);
      return NextResponse.json({ success: true, deleted, pattern });
    }

    if (typeof body.namespace === 'string') {
      const namespace = body.namespace.trim();
      if (!namespace) {
        throw new SecurityValidationError('namespace is required.');
      }
      const deleted = clearNamespace(namespace);
      return NextResponse.json({ success: true, deleted, namespace });
    }

    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Provide one of: key, pattern, or namespace.' },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof SecurityError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Cache invalidation failed.';
    return NextResponse.json({ error: 'CACHE_ERROR', message }, { status: 500 });
  }
}
