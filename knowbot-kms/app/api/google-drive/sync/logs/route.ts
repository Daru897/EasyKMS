import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantIdParam = searchParams.get('tenantId');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    // Get tenant ID
    let tenantId = tenantIdParam || user.user_metadata?.tenant_id;
    if (!tenantId) {
      const serviceClient = createServiceClient();
      const { data: tenants } = await serviceClient
        .from('tenants')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      tenantId = tenants?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // For now, we'll return simulated logs since we don't have a dedicated sync_logs table
    // In production, this would query a proper sync_logs table
    const serviceClient = createServiceClient();

    // Get recent document activities as a proxy for sync logs
    const { data: documents, error } = await serviceClient
      .from('documents')
      .select(`
        id,
        title,
        last_synced_at,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .not('last_synced_at', 'is', null)
      .order('last_synced_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SyncLogs] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch sync logs' }, { status: 500 });
    }

    // Transform to sync log format
    const logs = (documents || []).map((doc) => ({
      id: doc.id,
      file_name: doc.title,
      status: 'success' as const,
      message: 'File synced successfully',
      synced_at: doc.last_synced_at || doc.updated_at,
    }));

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('[SyncLogs] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
