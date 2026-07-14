import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getToolHistory } from '@/lib/tools/engine';
import { validateLimit, validateOffset } from '@/lib/tools/validation';
import { ToolError } from '@/lib/tools/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/:slug/history
 * List the caller's past executions of a specific tool (scoped to their
 * active workspace). Supports pagination via limit/offset.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const limit = validateLimit(url.searchParams.get('limit'), 20, 100);
  const offset = validateOffset(url.searchParams.get('offset'));

  try {
    const { items, total } = await getToolHistory(
      slug,
      { userId: auth.user!.id },
      { limit, offset },
    );
    return NextResponse.json({ items, total, count: items.length, limit, offset });
  } catch (err) {
    if (err instanceof ToolError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to load history.';
    return NextResponse.json({ error: 'QUERY_ERROR', message }, { status: 400 });
  }
}
