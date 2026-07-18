import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const activities = await db.activity.findMany({
    where: { userId: auth.user!.id },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  const mapped = activities.map((a) => ({
    id: a.id,
    action: a.action,
    itemTitle: a.itemTitle,
    itemType: a.itemType,
    timestamp: new Date(a.timestamp).getTime(),
  }));

  return NextResponse.json(mapped);
}
