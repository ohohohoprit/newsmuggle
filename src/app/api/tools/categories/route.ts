import { NextResponse } from 'next/server';
import { listCategories } from '@/lib/tools/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tools/categories
 * List all tool categories with tool counts. Public (no auth required)
 * since categories are not sensitive.
 */
export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({
    categories,
    count: categories.length,
  });
}
