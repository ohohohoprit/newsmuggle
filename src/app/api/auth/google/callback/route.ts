import { NextResponse } from 'next/server';
import { handleGoogleCallback, setSessionCookie, type GoogleUserinfo } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback — exchanges code for tokens, gets userinfo, creates session.
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

  // Verify state cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const stateCookie = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('cs_oauth_state='));
  if (!stateCookie || stateCookie.split('=')[1] !== state) {
    return NextResponse.redirect(`${url.origin}/?auth_error=state_mismatch`, 302);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const authUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || url.origin;
  const redirectUri = `${authUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
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

    // Create session
    const session = await handleGoogleCallback(userinfo, req);

    const redirectTo = session.user.onboardingCompleted ? '/studio' : '/?onboarding=true';
    const res = NextResponse.redirect(`${url.origin}${redirectTo}`, 302);
    setSessionCookie(res, session.token, session.expiresAt);
    res.headers.append('Set-Cookie', 'cs_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return res;
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err);
    return NextResponse.redirect(`${url.origin}/?auth_error=callback_failed`, 302);
  }
}
