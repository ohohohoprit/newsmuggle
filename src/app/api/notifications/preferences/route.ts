import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getPreferences, upsertPreference } from '@/lib/notifications/preferences';
import { NotificationError, NotificationValidationError } from '@/lib/notifications/errors';
import { validateCategory, validatePriority, validateBoolean } from '@/lib/notifications/validation';
import type { NotificationPriority } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/preferences
 * List all notification preferences for the current user.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  try {
    const preferences = await getPreferences(auth.user!.id);
    return NextResponse.json({ preferences, count: preferences.length });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to load preferences.';
    return NextResponse.json({ error: 'NOTIFICATION_ERROR', message }, { status: 500 });
  }
}

/**
 * POST /api/notifications/preferences
 * Update a notification preference for a category.
 *
 * Body:
 *   - category: string        (required: subscription|payment|usage|sync|account|security|general)
 *   - inAppEnabled?: boolean
 *   - emailEnabled?: boolean
 *   - webhookEnabled?: boolean
 *   - minPriority?: string    (low|normal|high|urgent)
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const category = validateCategory(body.category);
    const updates: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      webhookEnabled?: boolean;
      minPriority?: NotificationPriority;
    } = {};

    if (body.inAppEnabled !== undefined) updates.inAppEnabled = validateBoolean(body.inAppEnabled, 'inAppEnabled');
    if (body.emailEnabled !== undefined) updates.emailEnabled = validateBoolean(body.emailEnabled, 'emailEnabled');
    if (body.webhookEnabled !== undefined) updates.webhookEnabled = validateBoolean(body.webhookEnabled, 'webhookEnabled');
    if (body.minPriority !== undefined) updates.minPriority = validatePriority(body.minPriority);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'NO_FIELDS', message: 'No updatable fields provided.' },
        { status: 400 },
      );
    }

    const preference = await upsertPreference(auth.user!.id, category, updates);
    return NextResponse.json({ preference });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    if (err instanceof NotificationValidationError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to update preference.';
    return NextResponse.json({ error: 'NOTIFICATION_ERROR', message }, { status: 500 });
  }
}
