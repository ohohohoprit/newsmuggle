import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.folder.findFirst({
    where: { id, userId: auth.user!.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.color !== undefined) data.color = body.color;
  if (body.parentId !== undefined) data.parentId = body.parentId;

  const updated = await db.folder.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    color: updated.color,
    parentId: updated.parentId,
    createdAt: new Date(updated.createdAt).getTime(),
    updatedAt: new Date(updated.updatedAt).getTime(),
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.folder.findFirst({
    where: { id, userId: auth.user!.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  // Move items in this folder to unsorted, then delete the folder
  await db.generatedItem.updateMany({
    where: { folderId: id, userId: auth.user!.id },
    data: { folderId: null },
  });

  await db.folder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
