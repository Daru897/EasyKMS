import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { inngest } from '@/lib/inngest';

/**
 * POST /api/documents/[id]/approve
 * Approve a DRAFT document version, making it LIVE
 *
 * Body:
 * - comment: string (optional approval comment)
 *
 * Flow:
 * 1. Validate document exists and is DRAFT
 * 2. Archive previous LIVE version (if exists)
 * 3. Update version status to LIVE
 * 4. Record approval in document_approvals
 * 5. Trigger document/index event for vector indexing
 */
export async function POST(
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

    // Parse request body
    let comment = '';
    try {
      const body = await request.json();
      comment = body.comment || '';
    } catch {
      // No body or invalid JSON, continue with empty comment
    }

    // Get tenant_id
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

    // Use service client for database operations
    const serviceClient = createServiceClient();

    // Fetch document with current version
    const { data: document, error: docError } = await serviceClient
      .from('documents')
      .select(`
        id,
        title,
        current_status,
        current_version_id,
        current_version:document_versions!documents_current_version_id_fkey (
          id,
          version_number,
          status,
          parsed_markdown
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Handle Supabase join returning array
    const currentVersion = Array.isArray(document.current_version)
      ? document.current_version[0]
      : document.current_version;

    if (!currentVersion) {
      return NextResponse.json(
        { error: 'Document has no version to approve' },
        { status: 400 }
      );
    }

    if (currentVersion.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Document version is already ${currentVersion.status}` },
        { status: 400 }
      );
    }

    const versionId = currentVersion.id;
    const versionNumber = currentVersion.version_number;

    // Step 1: Archive previous LIVE version (if exists)
    await serviceClient
      .from('document_versions')
      .update({ status: 'ARCHIVED' })
      .eq('document_id', id)
      .eq('status', 'LIVE')
      .neq('id', versionId);

    // Step 2: Update version status to LIVE
    const searchText = `${document.title || 'Untitled'}\n\n${currentVersion.parsed_markdown || ''}`.trim();

    const { error: updateError } = await serviceClient
      .from('document_versions')
      .update({
        status: 'LIVE',
        approved_by_user_id: user.id,
        approved_at: new Date().toISOString(),
        search_text: searchText,
      })
      .eq('id', versionId);

    if (updateError) {
      console.error('[Approve] Update error:', updateError);
      throw updateError;
    }

    // The live_version_propagation trigger should update documents.current_status to LIVE
    // But let's also update it explicitly to be safe
    await serviceClient
      .from('documents')
      .update({
        current_status: 'LIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Step 3: Record approval
    await serviceClient
      .from('document_approvals')
      .insert({
        document_id: id,
        document_version_id: versionId,
        user_id: user.id,
        action: 'approve',
        comment: comment || null,
      });

    // Step 4: Trigger vector indexing
    await inngest.send({
      name: 'document/index',
      data: {
        tenantId,
        documentId: id,
        documentVersionId: versionId,
        title: document.title,
      },
    });

    // Log success
    await serviceClient.from('sync_logs').insert({
      tenant_id: tenantId,
      document_id: id,
      action: 'approve',
      status: 'success',
      details: {
        document_version_id: versionId,
        version_number: versionNumber,
        approved_by: user.email,
        comment: comment || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document approved successfully',
      document: {
        id,
        title: document.title,
        status: 'LIVE',
        version_number: versionNumber,
      },
    });
  } catch (error) {
    console.error('[Approve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
