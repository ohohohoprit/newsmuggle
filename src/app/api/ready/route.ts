import { NextResponse } from 'next/server';
import { getReadiness } from '@/lib/monitoring/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ready
 * Readiness check — checks if the app is ready to serve traffic.
 * Returns 503 if critical services (database) are not ready.
 */
export async function GET() {
  const result = await getReadiness();
  return NextResponse.json(result, { status: result.ready ? 200 : 503 });
}
