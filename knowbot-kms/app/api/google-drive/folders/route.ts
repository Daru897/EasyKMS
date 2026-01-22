import { NextResponse } from 'next/server';
import { createDriveClient } from '@/lib/google-oauth';
import { getValidGoogleTokens } from '@/utils/google-oauth/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/google-drive/folders?tenantId=<uuid>
 * List folders from Google Drive for folder selection
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

    // Get valid tokens
    const tokens = await getValidGoogleTokens(tenantId);

    if (!tokens) {
      // Return empty list instead of error - not connected is a valid state
      return NextResponse.json({
        success: true,
        folders: [],
        message: 'Google Drive not connected. Please connect first.',
      });
    }

    try {
      // Create Drive client
      const drive = createDriveClient(tokens.access_token, tokens.refresh_token || undefined);

      // List folders (mimeType = 'application/vnd.google-apps.folder')
      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name, parents, createdTime, modifiedTime)',
        orderBy: 'name',
        pageSize: 100,
      });

      return NextResponse.json({
        success: true,
        folders: response.data.files || [],
      });
    } catch (driveError) {
      console.error('[Google Drive] Drive API error:', driveError);
      // Return empty list instead of 500 error
      return NextResponse.json({
        success: true,
        folders: [],
        error: driveError instanceof Error ? driveError.message : 'Failed to access Google Drive',
      });
    }

  } catch (error) {
    console.error('[Google Drive] Folders list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
