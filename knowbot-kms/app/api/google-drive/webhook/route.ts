import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';
import { createServiceClient } from '@/utils/supabase/server';
import crypto from 'crypto';

/**
 * POST /api/google-drive/webhook
 * Google Drive Push Notifications Webhook Handler
 * 
 * This endpoint receives push notifications from Google Drive when files change.
 * Requires webhook setup in Google Cloud Console.
 * 
 * Note: For production, you need to:
 * 1. Set up a webhook channel in Google Drive API
 * 2. Verify the webhook URL is accessible
 * 3. Handle webhook verification (GET request)
 */
export async function POST(request: Request) {
  try {
    const headers = request.headers;
    const xGoogChannelId = headers.get('X-Goog-Channel-Id');
    const xGoogResourceId = headers.get('X-Goog-Resource-Id');
    const xGoogResourceState = headers.get('X-Goog-Resource-State');
    const xGoogResourceUri = headers.get('X-Goog-Resource-URI');
    const xGoogChannelToken = headers.get('X-Goog-Channel-Token');

    // Verify webhook (optional - add signature verification in production)
    // For now, we'll trust the X-Goog-Channel-Token if configured
    const expectedToken = process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN;
    if (expectedToken && xGoogChannelToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid webhook token' },
        { status: 401 }
      );
    }

    // Only process 'change' events (not 'sync' which is just a ping)
    if (xGoogResourceState !== 'change') {
      return NextResponse.json({
        success: true,
        message: 'Ignored non-change event',
        state: xGoogResourceState,
      });
    }

    // Extract tenant ID from channel token or channel ID
    // Channel token format: "tenant-{tenantId}" (set when creating webhook)
    const tenantId = xGoogChannelToken?.replace('tenant-', '') || xGoogChannelId;

    if (!tenantId) {
      console.warn('[Webhook] No tenant ID found in webhook');
      return NextResponse.json(
        { error: 'Tenant ID not found in webhook' },
        { status: 400 }
      );
    }

    // Verify tenant exists and has Google Drive connected
    const supabase = createServiceClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, google_drive_folder_id')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Trigger sync for this tenant
    // The sync function will detect what changed
    await inngest.send({
      name: 'google-drive/sync.tenant',
      data: {
        tenantId,
        folderId: tenant.google_drive_folder_id,
      },
    });

    // Log webhook receipt
    await supabase.from('sync_logs').insert({
      tenant_id: tenantId,
      action: 'webhook',
      status: 'success',
      details: {
        channel_id: xGoogChannelId,
        resource_id: xGoogResourceId,
        resource_state: xGoogResourceState,
        resource_uri: xGoogResourceUri,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook received, sync triggered',
      tenantId,
    });

  } catch (error) {
    console.error('[Google Drive Webhook] Error:', error);
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
 * GET /api/google-drive/webhook
 * Webhook verification endpoint
 * Google Drive sends a GET request to verify the webhook URL
 */
export async function GET(request: Request) {
  // Google Drive webhook verification
  // Just return 200 OK to verify the endpoint exists
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint verified',
  });
}
