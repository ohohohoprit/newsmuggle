import { NextResponse } from 'next/server';
import { getLiveness } from '@/lib/monitoring/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Liveness check — always returns 200 if the process is up.
 * Used by load balancers to know if the container is alive.
 */
export async function GET() {
  return NextResponse.json(getLiveness());
}
