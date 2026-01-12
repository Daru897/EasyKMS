import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { getValidGoogleTokens } from '@/utils/google-oauth/server';
import { createDriveClient } from '@/lib/google-oauth';

/**
 * POST /api/google-drive/set-folder
 * Set the Google Drive folder ID for a tenant
 * Body: { tenantId: string, folderId: string }
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
    const { tenantId, folderId } = body;

    if (!tenantId || !folderId) {
      return NextResponse.json(
        { error: 'tenantId and folderId are required' },
        { status: 400 }
      );
    }

    // TODO: Verify user has permission (must be admin/manager of tenant)

    // Verify folder exists and user has access
    const tokens = await getValidGoogleTokens(tenantId);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Google Drive not connected' },
        { status: 401 }
      );
    }

    const drive = createDriveClient(tokens.access_token, tokens.refresh_token || undefined);
    
    // Verify folder exists
    try {
      const { data: folder } = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
      });

      if (folder.mimeType !== 'application/vnd.google-apps.folder') {
        return NextResponse.json(
          { error: 'Selected item is not a folder' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Update tenant's google_drive_folder_id
    const serviceClient = createServiceClient();
    const { data, error: updateError } = await serviceClient
      .from('tenants')
      .update({
        google_drive_folder_id: folderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (updateError) {
      console.error('[Google Drive] Failed to update folder:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Folder selected successfully',
      tenant: data,
    });

  } catch (error) {
    console.error('[Google Drive] Set folder error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
