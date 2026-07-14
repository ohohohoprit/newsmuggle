import { NextResponse } from 'next/server';
import { registerWithEmail, setSessionCookie, AuthError } from '@/lib/auth';
import { validateEmail, validatePassword, validateName } from '@/lib/auth-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);
    const name = validateName(body.name);

    const session = await registerWithEmail({ email, password, name }, req);

    const res = NextResponse.json({
      user: session.user,
      authenticated: true,
      onboardingCompleted: session.user.onboardingCompleted,
    }, { status: 201 });

    setSessionCookie(res, session.token, session.expiresAt);
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : 'Registration failed.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
