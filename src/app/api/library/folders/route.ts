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

  const folders = await db.folder.findMany({
    where: { userId: auth.user!.id },
    orderBy: { updatedAt: 'desc' },
  });

  const mapped = folders.map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color,
    parentId: f.parentId,
    createdAt: new Date(f.createdAt).getTime(),
    updatedAt: new Date(f.updatedAt).getTime(),
  }));

  return NextResponse.json(mapped);
}

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

  const folder = await db.folder.create({
    data: {
      userId: auth.user!.id,
      name: (body.name as string) ?? 'New Folder',
      color: (body.color as string) ?? '#C09858',
      parentId: (body.parentId as string) ?? null,
    },
  });

  return NextResponse.json({
    id: folder.id,
    name: folder.name,
    color: folder.color,
    parentId: folder.parentId,
    createdAt: new Date(folder.createdAt).getTime(),
    updatedAt: new Date(folder.updatedAt).getTime(),
  }, { status: 201 });
}
