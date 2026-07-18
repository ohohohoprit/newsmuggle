import { NextResponse } from 'next/server';
import { handleGoogleCallback, setSessionCookie, type GoogleUserinfo } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isConfiguredSecret(value: string | undefined): value is string {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (/^REPLACE/i.test(v)) return false;
  return true;
}

function clearOAuthStateCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  return `cs_oauth_state=; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback — exchanges code for tokens, gets userinfo, creates session.
 * Redirects back into the SPA root with query flags (this app uses client-side views).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${url.origin}/?auth_error=denied`, 302);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${url.origin}/?auth_error=missing_params`, 302);
  }

  // Verify state cookie (value may contain '=' — take everything after first '=')
  const cookieHeader = req.headers.get('cookie') || '';
  const stateCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('cs_oauth_state='));
  const stateValue = stateCookie ? stateCookie.slice('cs_oauth_state='.length) : null;
  if (!stateValue || stateValue !== state) {
    return NextResponse.redirect(`${url.origin}/?auth_error=state_mismatch`, 302);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Must match the redirect_uri used when starting the flow
  const authUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || url.origin;
  const redirectUri = `${authUrl.replace(/\/$/, '')}/api/auth/google/callback`;

  if (!isConfiguredSecret(clientId) || !isConfiguredSecret(clientSecret)) {
    return NextResponse.redirect(`${url.origin}/?auth_error=config`, 302);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[Google OAuth] Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${url.origin}/?auth_error=token_exchange`, 302);
    }

    const tokenData = await tokenRes.json();

    // Get user info
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userinfoRes.ok) {
      return NextResponse.redirect(`${url.origin}/?auth_error=userinfo`, 302);
    }

    const userinfo: GoogleUserinfo = await userinfoRes.json();

    if (!userinfo.sub) {
      return NextResponse.redirect(`${url.origin}/?auth_error=userinfo`, 302);
    }

    // Create session
    const session = await handleGoogleCallback(userinfo, req);

    // SPA lives on `/` with client-side views — never redirect to a missing /studio page
    const redirectTo = session.user.onboardingCompleted
      ? '/?auth=success'
      : '/?auth=success&onboarding=true';
    const res = NextResponse.redirect(`${url.origin}${redirectTo}`, 302);
    setSessionCookie(res, session.token, session.expiresAt);
    res.headers.append('Set-Cookie', clearOAuthStateCookie());
    return res;
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err);
    return NextResponse.redirect(`${url.origin}/?auth_error=callback_failed`, 302);
  }
}
