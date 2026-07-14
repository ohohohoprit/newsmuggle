import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { listTools } from '@/lib/tools/registry';
import {
  validateSearchQuery,
  validateCategoryFilter,
  validateLimit,
  validateOffset,
} from '@/lib/tools/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tools
 * List all enabled tools. Optional query params:
 *   - category=<slug>  (filter by category)
 *   - q=<search>       (search name/description/slug)
 *   - limit=<n>        (default 200, max 500)
 *   - offset=<n>       (default 0)
 *
 * Auth optional: unauthenticated callers see enabled tools only.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  const url = new URL(req.url);
  const search = validateSearchQuery(url.searchParams.get('q'));
  const category = validateCategoryFilter(url.searchParams.get('category'));
  const limit = validateLimit(url.searchParams.get('limit'), 200, 500);
  const offset = validateOffset(url.searchParams.get('offset'));

  // Admins can see disabled tools via includeDisabled (not exposed to non-admins)
  const includeDisabled = auth.authenticated && auth.user!.role === 'admin';

  const { tools, total } = await listTools({
    categorySlug: category,
    search,
    limit,
    offset,
    includeDisabled,
  });

  return NextResponse.json({
    tools,
    total,
    count: tools.length,
    limit,
    offset,
    category: category ?? null,
    search: search ?? null,
  });
}
