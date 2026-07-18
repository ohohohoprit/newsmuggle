import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getUnreadCount } from '@/lib/notifications/service';
import { NotificationError } from '@/lib/notifications/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 * Returns the unread count for the current user, broken down by category + priority.
 *
 * Query params:
 *   - workspaceId=<id>  (optional)
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId') ?? undefined;

  try {
    const result = await getUnreadCount(auth.user!.id, workspaceId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to get unread count.';
    return NextResponse.json({ error: 'NOTIFICATION_ERROR', message }, { status: 500 });
  }
}
