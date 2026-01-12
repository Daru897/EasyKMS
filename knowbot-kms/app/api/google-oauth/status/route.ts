import { NextResponse } from 'next/server';
import { getGoogleConnectionStatus } from '@/utils/google-oauth/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/google-oauth/status?tenantId=<uuid>
 * Get Google Drive connection status for a tenant
 */
export async function GET(request: Request) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId query parameter is required' },
        { status: 400 }
      );
    }

    // TODO: Verify user has permission to check status for this tenant

    try {
      const status = await getGoogleConnectionStatus(tenantId);
      return NextResponse.json({
        success: true,
        ...status,
      });
    } catch (statusError) {
      // If status check fails, return not connected (not an error)
      console.warn('[Google OAuth] Status check failed (likely not connected):', statusError);
      return NextResponse.json({
        success: true,
        connected: false,
      });
    }

  } catch (error) {
    console.error('[Google OAuth] Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
