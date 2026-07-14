import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listInvoices } from '@/lib/billing/invoices';
import { requireMembership } from '@/lib/workspace';
import { BillingError } from '@/lib/billing/errors';
import { validateLimit, validateOffset } from '@/lib/billing/validation';
import type { InvoiceStatus } from '@/lib/billing/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/invoices
 * List invoices for the caller's active workspace.
 *
 * Query params:
 *   - workspaceId=<id>  (optional)
 *   - limit=<n>         (default 50, max 200)
 *   - offset=<n>        (default 0)
 *   - status=<status>   (optional: draft|open|paid|void|uncollectible)
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const url = new URL(req.url);
  let workspaceId = url.searchParams.get('workspaceId') ?? undefined;
  const limit = validateLimit(url.searchParams.get('limit'), 50, 200);
  const offset = validateOffset(url.searchParams.get('offset'));
  const statusParam = url.searchParams.get('status') as InvoiceStatus | null;

  if (!workspaceId) {
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({
      where: { id: auth.user!.id },
      select: { activeWorkspaceId: true },
    });
    workspaceId = user?.activeWorkspaceId ?? undefined;
  }
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'NO_ACTIVE_WORKSPACE', message: 'You do not have an active workspace.' },
      { status: 400 },
    );
  }

  try {
    await requireMembership(workspaceId, auth.user!.id);
    const result = await listInvoices(workspaceId, {
      limit,
      offset,
      ...(statusParam ? { status: statusParam } : {}),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to list invoices.';
    return NextResponse.json({ error: 'BILLING_ERROR', message }, { status: 500 });
  }
}
