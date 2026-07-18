import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getActiveWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/active
 * Return the user's currently active workspace (or null if none).
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const active = await getActiveWorkspace(auth.user!.id);
  return NextResponse.json({ workspace: active });
}
