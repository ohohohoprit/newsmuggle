import { NextResponse } from 'next/server';
import { getToolBySlug } from '@/lib/tools/registry';
import { ToolError } from '@/lib/tools/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/:slug/examples
 * Return the example inputs/outputs for a tool. Public (no auth)
 * because examples are marketing material, not user data.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const tool = await getToolBySlug(slug);
  if (!tool) {
    return NextResponse.json(
      { error: 'TOOL_NOT_FOUND', message: `Tool "${slug}" not found.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    examples: tool.examples ?? [],
    count: tool.examples?.length ?? 0,
  });
}
