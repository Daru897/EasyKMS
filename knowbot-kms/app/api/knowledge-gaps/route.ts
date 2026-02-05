import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

/**
 * GET /api/knowledge-gaps
 * Read-only endpoint for knowledge gap entries (admin usage)
 *
 * Query params:
 * - limit: number (default 50, max 200)
 * - resolved: boolean (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      const { data: tenants } = await supabase
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

    const searchParams = request.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(200, Math.max(1, limitParam));
    const resolvedParam = searchParams.get('resolved');

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from('knowledge_gaps')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (resolvedParam === 'true' || resolvedParam === 'false') {
      query = query.eq('is_resolved', resolvedParam === 'true');
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      gaps: data || [],
    });
  } catch (error) {
    console.error('[Knowledge Gaps] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
