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

  const existing = await db.generatedItem.findFirst({
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
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.type !== undefined) data.type = body.type;
  if (body.toolName !== undefined) data.toolName = body.toolName;
  if (body.category !== undefined) data.category = body.category;
  if (body.score !== undefined) data.score = Number(body.score);
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
  if (body.favorite !== undefined) data.favorite = body.favorite === true;
  if (body.pinned !== undefined) data.pinned = body.pinned === true;
  if (body.status !== undefined) data.status = body.status;
  if (body.folderId !== undefined) data.folderId = body.folderId;

  const updated = await db.generatedItem.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    type: updated.type,
    toolName: updated.toolName,
    category: updated.category ?? '',
    folderId: updated.folderId,
    tags: updated.tags ? JSON.parse(updated.tags) : [],
    favorite: updated.favorite,
    pinned: updated.pinned,
    status: updated.status,
    createdAt: new Date(updated.createdAt).getTime(),
    updatedAt: new Date(updated.updatedAt).getTime(),
    score: updated.score ?? undefined,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.generatedItem.findFirst({
    where: { id, userId: auth.user!.id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  await db.generatedItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
