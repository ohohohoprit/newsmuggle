import { NextResponse } from 'next/server';
import { sendOtp, AuthError } from '@/lib/auth';
import { validatePhone } from '@/lib/auth-validation';

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

    const result = await sendOtp({ phone }, req);

    return NextResponse.json({
      success: true,
      challengeId: result.challengeId,
      expiresAt: result.expiresAt.toISOString(),
      // In dev only — remove in production
      devCode: process.env.NODE_ENV === 'development' ? 'Check server logs' : undefined,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === 'OTP_MAX_RESENDS' ? 429 : 400;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : 'Failed to send OTP.';
    return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 });
  }
}
