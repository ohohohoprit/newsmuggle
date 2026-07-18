import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { runTool } from '@/lib/tools/engine';
import { ToolError } from '@/lib/tools/types';
import { applySecurity } from '@/lib/security/middleware';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/:slug/run
 * Execute a tool. The body is the raw form inputs (validated against
 * the tool's inputSchema by the engine).
 *
 * Auth required. The execution is scoped to the caller's active
 * workspace (or the `workspaceId` field if provided).
 *
 * Returns a ToolExecutionResult with items/text/data + summary + metrics.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  // Rate limit + abuse guard runs first (IP-scoped, before auth).
  const guard = await applySecurity(req, { routeKey: 'tool:run' });
  if (guard.error) return guard.error;

  const auth = await requireAuth(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { slug } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Optional explicit workspaceId (e.g. for team workspaces). If absent,
  // the engine falls back to the user's activeWorkspaceId.
  const workspaceId =
    typeof body.workspaceId === 'string' && body.workspaceId.trim()
      ? body.workspaceId.trim()
      : undefined;
  // Don't pass workspaceId into the LLM inputs
  if (body.workspaceId !== undefined) {
    delete body.workspaceId;
  }

  try {
    const result = await runTool(
      slug,
      body,
      {
        userId: auth.user!.id,
        userPlan: auth.user!.plan,
        workspaceId,
      },
      req,
    );

    return NextResponse.json({ result }, { status: result.status === 'failed' ? 500 : 200 });
  } catch (err) {
    if (err instanceof ToolError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Tool execution failed.';
    return NextResponse.json(
      { error: 'EXECUTION_ERROR', message },
      { status: 500 },
    );
  }
}
