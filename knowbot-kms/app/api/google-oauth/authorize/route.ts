import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google-oauth';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * GET /api/google-oauth/authorize
 * Initiates Google OAuth flow
 * Redirects user to Google authorization page
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    // Get tenant_id from user metadata or session
    // TODO: Implement proper tenant_id retrieval from user metadata
    // For now, we'll require it as a query parameter
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId query parameter is required' },
        { status: 400 }
      );
    }

    // Validate tenant_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return NextResponse.json(
        { error: 'Invalid tenantId format' },
        { status: 400 }
      );
    }

    // TODO: Verify user has permission to connect Google Drive for this tenant
    // This should check if user is admin/manager of the tenant

    // Generate state for CSRF protection (use tenant_id + random)
    const state = `${tenantId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Store state in cookie for verification in callback
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // Generate Google OAuth URL
    const authUrl = getGoogleAuthUrl(tenantId, state);

    // Redirect to Google
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('[Google OAuth] Authorization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate Google OAuth',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
