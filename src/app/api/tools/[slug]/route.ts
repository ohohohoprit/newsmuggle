import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getToolBySlug } from '@/lib/tools/registry';
import { ToolError } from '@/lib/tools/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/:slug
 * Get a single tool definition by slug. Returns 404 if not found or
 * disabled (unless the caller is an admin).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuth(req);
  const { slug } = await ctx.params;

  const includeDisabled = auth.authenticated && auth.user!.role === 'admin';

  const tool = await getToolBySlug(slug, { includeDisabled });
  if (!tool) {
    return NextResponse.json(
      { error: 'TOOL_NOT_FOUND', message: `Tool "${slug}" not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ tool });
}
