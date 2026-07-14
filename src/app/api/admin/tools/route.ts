import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { createTool } from '@/lib/tools/registry';
import { listTools } from '@/lib/tools/registry';
import { ToolError } from '@/lib/tools/types';
import {
  validateToolSlug,
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
 * GET /api/admin/tools
 * List ALL tools (including disabled). Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const { tools, total } = await listTools({ includeDisabled: true, limit: 500 });
  return NextResponse.json({ tools, total, count: tools.length });
}

/**
 * POST /api/admin/tools
 * Create a new custom tool. Admin only.
 *
 * Body:
 *   {
 *     slug, name, description, categorySlug, icon?, agentTip?,
 *     outputFormat, outputLabel?, outputItemNoun?, analysisTitle?,
 *     inputSchema: FieldConfig[],
 *     outputSchema?: OutputSchema,
 *     promptTemplate: { system, user },
 *     modelConfig?, defaultCount?, countOptions?, minPlan?, usageLimit?,
 *     tags?, isPopular?, isNew?, examples?
 *   }
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const slug = validateToolSlug(body.slug);
    const name = validateToolName(body.name);
    const description = validateToolDescription(body.description);
    const categorySlug = validateCategorySlug(body.categorySlug);
    const outputFormat = validateOutputFormat(body.outputFormat);
    const inputSchema = validateFieldConfigs(body.inputSchema);

    // Validate promptTemplate
    const pt = body.promptTemplate;
    if (!pt || typeof pt !== 'object' || Array.isArray(pt)) {
      throw new Error('promptTemplate must be an object with system and user strings.');
    }
    const ptObj = pt as Record<string, unknown>;
    if (typeof ptObj.system !== 'string' || !ptObj.system.trim()) {
      throw new Error('promptTemplate.system is required.');
    }
    if (typeof ptObj.user !== 'string' || !ptObj.user.trim()) {
      throw new Error('promptTemplate.user is required.');
    }
    const promptTemplate = {
      system: ptObj.system.trim(),
      user: ptObj.user.trim(),
    };

    const modelConfig = validateModelConfig(body.modelConfig);
    const countOptions = validateCountOptions(body.countOptions);
    const tags = validateTags(body.tags);
    const minPlan = validatePlan(body.minPlan);

    const tool = await createTool({
      slug,
      name,
      description,
      categorySlug,
      icon: typeof body.icon === 'string' ? body.icon : undefined,
      agentTip: typeof body.agentTip === 'string' ? body.agentTip : undefined,
      outputFormat,
      outputLabel: typeof body.outputLabel === 'string' ? body.outputLabel : undefined,
      outputItemNoun: typeof body.outputItemNoun === 'string' ? body.outputItemNoun : undefined,
      analysisTitle: typeof body.analysisTitle === 'string' ? body.analysisTitle : undefined,
      inputSchema,
      outputSchema:
        body.outputSchema && typeof body.outputSchema === 'object'
          ? (body.outputSchema as never)
          : null,
      promptTemplate,
      modelConfig,
      defaultCount:
        typeof body.defaultCount === 'number' && body.defaultCount > 0
          ? Math.min(50, Math.floor(body.defaultCount))
          : undefined,
      countOptions,
      minPlan,
      usageLimit:
        typeof body.usageLimit === 'number' && body.usageLimit >= 0
          ? Math.floor(body.usageLimit)
          : 0,
      tags,
      isPopular: typeof body.isPopular === 'boolean' ? body.isPopular : false,
      isNew: typeof body.isNew === 'boolean' ? body.isNew : false,
      examples:
        body.examples && typeof body.examples === 'object'
          ? (body.examples as never)
          : null,
    });

    // Audit log
    const { auditLog } = await import('@/lib/auth');
    await auditLog('tool_create', auth.user!.id, req, 'success', { toolSlug: slug });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (err) {
    if (err instanceof ToolError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Failed to create tool.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
