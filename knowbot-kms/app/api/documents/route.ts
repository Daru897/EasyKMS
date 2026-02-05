import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/documents
 * List documents with status filtering and pagination
 *
 * Query params:
 * - status: 'DRAFT' | 'LIVE' | 'ARCHIVED' (optional, defaults to all)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (optional, searches title)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search');

    // Get tenant_id from user metadata or first available tenant
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
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        id,
        title,
        mime_type,
        file_extension,
        file_size_bytes,
        current_status,
        google_file_id,
        last_synced_at,
        created_at,
        updated_at,
        current_version:document_versions!documents_current_version_id_fkey (
          id,
          version_number,
          word_count,
          chunk_count,
          status,
          created_at
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    // Apply status filter
    if (status && ['DRAFT', 'LIVE', 'ARCHIVED'].includes(status)) {
      query = query.eq('current_status', status);
    }

    // Apply search filter
    if (search && search.trim().length > 0) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: documents, error, count } = await query;

    if (error) {
      console.error('[Documents List] Query error:', error);
      throw error;
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      success: true,
      documents: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[Documents List] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
