import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/documents/[id]
 * Get single document with version details and approval history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Fetch document with current version
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        mime_type,
        file_extension,
        file_size_bytes,
        current_status,
        google_file_id,
        google_drive_metadata,
        last_synced_at,
        sync_status,
        created_at,
        updated_at,
        current_version:document_versions!documents_current_version_id_fkey (
          id,
          version_number,
          parsed_markdown,
          word_count,
          chunk_count,
          status,
          pii_redacted,
          pii_redaction_stats,
          parser_metadata,
          approved_at,
          approved_by_user_id,
          created_at
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Handle Supabase join returning array
    const currentVersion = Array.isArray(document.current_version)
      ? document.current_version[0]
      : document.current_version;

    // Fetch categories for current version
    let categories: string[] = [];
    if (currentVersion?.id) {
      const { data: categoryData } = await supabase
        .from('document_version_categories')
        .select(`
          category:document_categories(id, name)
        `)
        .eq('document_version_id', currentVersion.id);

      if (categoryData) {
        categories = categoryData
          .map((item: Record<string, unknown>) => {
            const category = item.category as { name: string } | { name: string }[] | null;
            if (Array.isArray(category)) return category[0]?.name;
            return category?.name;
          })
          .filter((name): name is string => Boolean(name));
      }
    }

    // Fetch approval history (all versions and their approvals)
    const { data: versions } = await supabase
      .from('document_versions')
      .select(`
        id,
        version_number,
        status,
        created_at,
        approved_at,
        approved_by_user_id
      `)
      .eq('document_id', id)
      .order('version_number', { ascending: false });

    // Fetch approval records
    const { data: approvals } = await supabase
      .from('document_approvals')
      .select(`
        id,
        document_version_id,
        action,
        comment,
        created_at
      `)
      .eq('document_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        current_version: currentVersion,
        categories,
        versions: versions || [],
        approvals: approvals || [],
      },
    });
  } catch (error) {
    console.error('[Document Get] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
