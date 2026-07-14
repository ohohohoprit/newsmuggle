import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { updateTool, deleteTool } from '@/lib/tools/registry';
import { ToolError } from '@/lib/tools/types';
import {
  validateToolName,
  validateToolDescription,
  validateCategorySlug,
  validateOutputFormat,
  validateFieldConfigs,
  validateModelConfig,
  validateCountOptions,
  validateTags,
  validatePlan,
} from '@/lib/tools/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/tools/:slug
 * Update an existing tool. Admin only. System tools can be edited but
 * not deleted (see DELETE).
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const { slug } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) update.name = validateToolName(body.name);
    if (body.description !== undefined) update.description = validateToolDescription(body.description);
    if (body.categorySlug !== undefined) update.categorySlug = validateCategorySlug(body.categorySlug);
    if (body.icon !== undefined) update.icon = typeof body.icon === 'string' ? body.icon : null;
    if (body.agentTip !== undefined) update.agentTip = typeof body.agentTip === 'string' ? body.agentTip : null;
    if (body.outputFormat !== undefined) update.outputFormat = validateOutputFormat(body.outputFormat);
    if (body.outputLabel !== undefined) update.outputLabel = String(body.outputLabel);
    if (body.outputItemNoun !== undefined) update.outputItemNoun = String(body.outputItemNoun);
    if (body.analysisTitle !== undefined) update.analysisTitle = String(body.analysisTitle);
    if (body.inputSchema !== undefined) update.inputSchema = validateFieldConfigs(body.inputSchema);
    if (body.outputSchema !== undefined) update.outputSchema = body.outputSchema ?? null;
    if (body.promptTemplate !== undefined) {
      const pt = body.promptTemplate as Record<string, unknown>;
      if (!pt || typeof pt !== 'object' || Array.isArray(pt)) {
        throw new Error('promptTemplate must be an object with system and user strings.');
      }
      if (typeof pt.system !== 'string' || !pt.system.trim()) {
        throw new Error('promptTemplate.system is required.');
      }
      if (typeof pt.user !== 'string' || !pt.user.trim()) {
        throw new Error('promptTemplate.user is required.');
      }
      update.promptTemplate = { system: pt.system.trim(), user: pt.user.trim() };
    }
    if (body.modelConfig !== undefined) update.modelConfig = validateModelConfig(body.modelConfig);
    if (body.defaultCount !== undefined) {
      update.defaultCount =
        typeof body.defaultCount === 'number' && body.defaultCount > 0
          ? Math.min(50, Math.floor(body.defaultCount))
          : 5;
    }
    if (body.countOptions !== undefined) update.countOptions = validateCountOptions(body.countOptions);
    if (body.minPlan !== undefined) update.minPlan = validatePlan(body.minPlan);
    if (body.usageLimit !== undefined) {
      update.usageLimit =
        typeof body.usageLimit === 'number' && body.usageLimit >= 0
          ? Math.floor(body.usageLimit)
          : 0;
    }
    if (body.tags !== undefined) update.tags = validateTags(body.tags);
    if (body.isPopular !== undefined) update.isPopular = !!body.isPopular;
    if (body.isNew !== undefined) update.isNew = !!body.isNew;
    if (body.isEnabled !== undefined) update.isEnabled = !!body.isEnabled;
    if (body.examples !== undefined) update.examples = body.examples ?? null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'NO_FIELDS', message: 'No updatable fields provided.' },
        { status: 400 },
      );
    }

    const tool = await updateTool(slug, update);

    const { auditLog } = await import('@/lib/auth');
    await auditLog('tool_update', auth.user!.id, req, 'success', {
      toolSlug: slug,
      fields: Object.keys(update),
    });

    return NextResponse.json({ tool });
  } catch (err) {
    if (err instanceof ToolError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to update tool.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/tools/:slug
 * Delete a custom tool. System tools cannot be deleted (disable instead).
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const { slug } = await ctx.params;

  try {
    await deleteTool(slug);

    const { auditLog } = await import('@/lib/auth');
    await auditLog('tool_delete', auth.user!.id, req, 'success', { toolSlug: slug });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ToolError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to delete tool.';
    return NextResponse.json({ error: 'DELETE_ERROR', message }, { status: 400 });
  }
}
