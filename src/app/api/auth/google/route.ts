import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow — redirects user to Google's consent screen.
 */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' },
      { status: 500 }
    );
  }

  // Determine redirect URL from environment or request origin
  const authUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || new URL(req.url).origin;
  const redirectUri = `${authUrl}/api/auth/google/callback`;

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
  res.headers.set('Set-Cookie', `cs_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
  return res;
}
