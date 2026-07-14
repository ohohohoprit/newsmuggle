import { NextResponse } from 'next/server';
import { destroySession, clearSessionCookie, getTokenFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = getTokenFromRequest(req);
  if (token) {
    await destroySession(token);
  }

  const res = NextResponse.json({ success: true, authenticated: false });
  clearSessionCookie(res);
  return res;
}
