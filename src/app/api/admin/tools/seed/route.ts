import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { seedTools } from '@/lib/tools/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tools/seed
 * Seed (or re-sync) all 95 system tool definitions + 9 categories from
 * the existing frontend data files into the database. Idempotent.
 *
 * Admin only.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const result = await seedTools();

  return NextResponse.json({
    success: true,
    ...result,
  });
}
