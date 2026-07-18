import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { clearAllBuckets, clearBucketsForTarget } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/security/unflag
 * Clear rate limit blocks / abuse blocks for a specific IP, user, or workspace.
 * Admin only.
 *
 * Body (optional — if empty, clears all):
 *   - ip?: string
 *   - userId?: string
 *   - workspaceId?: string
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  const ip = typeof body.ip === 'string' ? body.ip : undefined;
  const userId = typeof body.userId === 'string' ? body.userId : undefined;
  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : undefined;

  let result;
  if (!ip && !userId && !workspaceId) {
    result = clearAllBuckets();
  } else {
    result = clearBucketsForTarget({ ...(ip ? { ip } : {}), ...(userId ? { userId } : {}), ...(workspaceId ? { workspaceId } : {}) });
  }

  return NextResponse.json({ success: true, ...result });
}
