import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/google-oauth';
import { storeGoogleTokens } from '@/utils/google-oauth/server';
import { cookies } from 'next/headers';

/**
 * GET /api/google-oauth/callback
 * Handles Google OAuth callback
 * Exchanges authorization code for tokens and stores them
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[Google OAuth] OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=error&error=${encodeURIComponent(error)}`
      );
    }

    // Verify state (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      console.error('[Google OAuth] State mismatch');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=error&error=state_mismatch`
      );
    }

    // Clear state cookie
    cookieStore.delete('google_oauth_state');

    // Extract tenant_id from state (format: tenantId-timestamp-random)
    const tenantId = state?.split('-')[0];
    
    if (!tenantId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=error&error=invalid_state`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=error&error=no_code`
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=error&error=no_access_token`
      );
    }

    // Get user info from Google
    let userInfo;
    try {
      userInfo = await getGoogleUserInfo(tokens.access_token);
    } catch (err) {
      console.warn('[Google OAuth] Failed to get user info, continuing without it:', err);
    }

    // Store tokens in database
    await storeGoogleTokens(tenantId, tokens, userInfo || {});

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=success&email=${encodeURIComponent(userInfo?.email || '')}`
    );

  } catch (error) {
    console.error('[Google OAuth] Callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?google_oauth=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
