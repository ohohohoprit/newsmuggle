import { NextResponse } from 'next/server';
import { getSession, getTokenFromRequest, type AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = getTokenFromRequest(req);
  const session = await getSession(token);

  if (!session) {
    return NextResponse.json({ user: null, authenticated: false }, { status: 200 });
  }

  const user: AuthUser = session.user;
  return NextResponse.json({
    user,
    authenticated: true,
    onboardingCompleted: user.onboardingCompleted,
  });
}
