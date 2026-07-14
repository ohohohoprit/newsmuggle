import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/rbac';
import { getProviderInfos } from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ai/providers
 * List all configured AI providers with their capabilities and availability.
 * Admin only.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (auth.error === 'FORBIDDEN') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }

  const providers = getProviderInfos();
  const defaultProvider = process.env.AI_DEFAULT_PROVIDER?.trim().toLowerCase() || null;
  const defaultModel = process.env.AI_DEFAULT_MODEL?.trim() || null;

  return NextResponse.json({
    providers,
    count: providers.length,
    availableCount: providers.filter((p) => p.available).length,
    envDefault: {
      provider: defaultProvider,
      model: defaultModel,
    },
  });
}
