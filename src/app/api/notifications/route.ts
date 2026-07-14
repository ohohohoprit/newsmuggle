import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listNotifications } from '@/lib/notifications/service';
import { NotificationError } from '@/lib/notifications/errors';
import { validateLimit, validateOffset } from '@/lib/notifications/validation';
import type { NotificationType, NotificationCategory } from '@/lib/notifications/types';
import { ALL_NOTIFICATION_TYPES, ALL_CATEGORIES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * List notifications for the current user.
 *
 * Query params:
 *   - workspaceId=<id>     (optional)
 *   - type=<type>          (optional: billing|studio|quota|system|tool|workspace)
 *   - category=<category>  (optional: subscription|payment|usage|sync|account|security|general)
 *   - unread=true          (only unread)
 *   - limit=<n>            (default 50, max 200)
 *   - offset=<n>           (default 0)
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const typeParam = url.searchParams.get('type');
  const categoryParam = url.searchParams.get('category');
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = validateLimit(url.searchParams.get('limit'), 50, 200);
  const offset = validateOffset(url.searchParams.get('offset'));

  const type = typeParam && ALL_NOTIFICATION_TYPES.includes(typeParam as NotificationType) ? typeParam as NotificationType : undefined;
  const category = categoryParam && ALL_CATEGORIES.includes(categoryParam as NotificationCategory) ? categoryParam as NotificationCategory : undefined;

  try {
    const result = await listNotifications(auth.user!.id, {
      ...(workspaceId ? { workspaceId } : {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      unreadOnly,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to list notifications.';
    return NextResponse.json({ error: 'NOTIFICATION_ERROR', message }, { status: 500 });
  }
}
