import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { markAllAsRead } from '@/lib/notifications/service';
import { NotificationError } from '@/lib/notifications/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/read-all
 * Mark all unread notifications as read for the current user.
 *
 * Body (optional):
 *   - workspaceId: string  (scope to a specific workspace)
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : undefined;

  try {
    const result = await markAllAsRead(auth.user!.id, workspaceId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to mark all as read.';
    return NextResponse.json({ error: 'NOTIFICATION_ERROR', message }, { status: 500 });
  }
}
