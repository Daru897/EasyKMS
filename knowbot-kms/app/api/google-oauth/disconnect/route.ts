import { NextResponse } from 'next/server';
import { deactivateGoogleTokens } from '@/utils/google-oauth/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/google-oauth/disconnect
 * Disconnect Google Drive for a tenant
 * Body: { tenantId: string }
 */
export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required in request body' },
        { status: 400 }
      );
    }

    // TODO: Verify user has permission to disconnect for this tenant (must be admin/manager)

    await deactivateGoogleTokens(tenantId);

    return NextResponse.json({
      success: true,
      message: 'Google Drive disconnected successfully',
    });

  } catch (error) {
    console.error('[Google OAuth] Disconnect error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
