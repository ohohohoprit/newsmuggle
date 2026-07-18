import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isConfiguredSecret(value: string | undefined): value is string {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  // Reject known placeholder values left in .env
  if (/^REPLACE/i.test(v)) return false;
  if (/your[-_]?/i.test(v) && /client|secret/i.test(v)) return false;
  return true;
}

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow — redirects user to Google's consent screen.
 */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!isConfiguredSecret(clientId) || !isConfiguredSecret(clientSecret)) {
    return NextResponse.json(
      {
        error: 'Google OAuth is not configured. Set real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
        code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  // Must match the redirect URI registered in Google Cloud Console
  const authUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || new URL(req.url).origin;
  const redirectUri = `${authUrl.replace(/\/$/, '')}/api/auth/google/callback`;

  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Build Google OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Set state as a cookie for verification in callback
  const res = NextResponse.redirect(googleAuthUrl, 302);
  const isProduction = process.env.NODE_ENV === 'production';
  res.headers.set(
    'Set-Cookie',
    `cs_oauth_state=${state}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=600`
  );
  return res;
}
