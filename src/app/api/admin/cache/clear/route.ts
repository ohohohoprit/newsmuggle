import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { clearAll } from '@/lib/cache/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/cache/clear
 * Clear the entire cache. Admin only.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const cleared = clearAll();
  return NextResponse.json({ success: true, cleared: cleared });
}
