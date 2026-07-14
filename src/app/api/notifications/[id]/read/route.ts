import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { markAsRead } from '@/lib/notifications/service';
import { NotificationError } from '@/lib/notifications/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const notification = await markAsRead(id, auth.user!.id);
    return NextResponse.json({ notification });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to mark notification as read.';
    return NextResponse.json({ error: 'NOTIFICATION_ERROR', message }, { status: 500 });
  }
}
