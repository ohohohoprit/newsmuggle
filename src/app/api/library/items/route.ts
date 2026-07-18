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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const folderId = searchParams.get('folderId');

  const where: Record<string, unknown> = { userId: auth.user!.id };
  if (status) where.status = status;
  if (folderId) where.folderId = folderId;

  const items = await db.generatedItem.findMany({
    where: where as any,
    orderBy: { updatedAt: 'desc' },
  });

  const mapped = items.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    type: item.type as any,
    toolName: item.toolName,
    category: item.category ?? '',
    folderId: item.folderId,
    tags: item.tags ? JSON.parse(item.tags) : [],
    favorite: item.favorite,
    pinned: item.pinned,
    status: item.status as any,
    createdAt: new Date(item.createdAt).getTime(),
    updatedAt: new Date(item.updatedAt).getTime(),
    score: item.score ?? undefined,
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

  const item = await db.generatedItem.create({
    data: {
      userId: auth.user!.id,
      toolId: (body.toolId as string) ?? 'manual',
      toolName: (body.toolName as string) ?? 'Manual',
      title: (body.title as string) ?? 'Untitled',
      content: (body.content as string) ?? '',
      type: (body.type as string) ?? 'document',
      category: (body.category as string) ?? null,
      score: body.score != null ? Number(body.score) : null,
      tags: Array.isArray(body.tags) ? JSON.stringify(body.tags) : null,
      favorite: body.favorite === true,
      pinned: body.pinned === true,
      status: (body.status as string) ?? 'active',
      folderId: (body.folderId as string) ?? null,
    },
  });

  await db.activity.create({
    data: {
      userId: auth.user!.id,
      action: 'saved',
      itemTitle: item.title,
      itemType: item.type,
      timestamp: new Date(),
    },
  });

  return NextResponse.json({
    id: item.id,
    title: item.title,
    content: item.content,
    type: item.type,
    toolName: item.toolName,
    category: item.category ?? '',
    folderId: item.folderId,
    tags: item.tags ? JSON.parse(item.tags) : [],
    favorite: item.favorite,
    pinned: item.pinned,
    status: item.status,
    createdAt: new Date(item.createdAt).getTime(),
    updatedAt: new Date(item.updatedAt).getTime(),
    score: item.score ?? undefined,
  }, { status: 201 });
}
