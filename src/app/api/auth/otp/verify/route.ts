import { NextResponse } from 'next/server';
import { verifyOtp, setSessionCookie, AuthError } from '@/lib/auth';
import { validatePhone, validateOtpCode, validateName } from '@/lib/auth-validation';

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
    const phone = validatePhone(body.phone);
    const code = validateOtpCode(body.code);
    const name = validateName(body.name);

    const session = await verifyOtp({ phone, code, name }, req);

    const res = NextResponse.json({
      user: session.user,
      authenticated: true,
      onboardingCompleted: session.user.onboardingCompleted,
    });

    setSessionCookie(res, session.token, session.expiresAt);
    return res;
  } catch (err) {
    if (err instanceof AuthError) {
      const statusMap: Record<string, number> = {
        OTP_EXPIRED: 410,
        OTP_MAX_ATTEMPTS: 429,
        OTP_INVALID: 401,
      };
      const status = statusMap[err.code] || 400;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'OTP verification failed.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
