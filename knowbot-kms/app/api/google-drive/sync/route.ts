import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';
import { createClient } from '@/utils/supabase/server';
import { getGoogleConnectionStatus } from '@/utils/google-oauth/server';

/**
 * POST /api/google-drive/sync
 * Manually trigger a sync for a tenant
 * Body: { tenantId: string, folderId?: string }
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

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required in request body' },
        { status: 400 }
      );
    }

    // TODO: Verify user has permission to sync for this tenant

    // Check if Google Drive is connected
    const connectionStatus = await getGoogleConnectionStatus(tenantId);
    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: 'Google Drive not connected for this tenant' },
        { status: 400 }
      );
    }

    // Get tenant to find folder ID if not provided
    const serviceClient = createClient();
    let syncFolderId = folderId;

    if (!syncFolderId) {
      const { data: tenant } = await serviceClient
        .from('tenants')
        .select('google_drive_folder_id')
        .eq('id', tenantId)
        .single();

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      syncFolderId = tenant.google_drive_folder_id;

      if (!syncFolderId) {
        return NextResponse.json(
          { error: 'No Google Drive folder configured for this tenant' },
          { status: 400 }
        );
      }
    }

    // Trigger sync job
    const eventId = await inngest.send({
      name: 'google-drive/sync.tenant',
      data: {
        tenantId,
        folderId: syncFolderId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sync job triggered',
      eventId,
      tenantId,
      folderId: syncFolderId,
    });

  } catch (error) {
    console.error('[Google Drive Sync] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/google-drive/sync?tenantId=<uuid>
 * Get sync status for a tenant
 */
export async function GET(request: Request) {
  try {
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

    // Get recent sync logs
    const serviceClient = createClient();
    const { data: logs, error } = await serviceClient
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('action', 'sync')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    // Get connection status
    const connectionStatus = await getGoogleConnectionStatus(tenantId);

    return NextResponse.json({
      success: true,
      connected: connectionStatus.connected,
      recentSyncs: logs || [],
      lastSync: logs && logs.length > 0 ? logs[0] : null,
    });

  } catch (error) {
    console.error('[Google Drive Sync Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
