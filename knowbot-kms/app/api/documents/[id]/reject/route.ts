import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

/**
 * POST /api/documents/[id]/reject
 * Reject a DRAFT document version
 *
 * Body:
 * - reason: string (required rejection reason)
 *
 * Flow:
 * 1. Validate document exists and is DRAFT
 * 2. Record rejection in document_approvals with reason
 * 3. Optionally archive the version (or keep as DRAFT for revision)
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
    let reason = '';
    let archive = false;
    try {
      const body = await request.json();
      reason = body.reason || '';
      archive = body.archive === true;
    } catch {
      // No body or invalid JSON
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
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
          status
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
        { error: 'Document has no version to reject' },
        { status: 400 }
      );
    }

    if (currentVersion.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Can only reject DRAFT documents. Current status: ${currentVersion.status}` },
        { status: 400 }
      );
    }

    const versionId = currentVersion.id;
    const versionNumber = currentVersion.version_number;

    // Record rejection
    await serviceClient
      .from('document_approvals')
      .insert({
        document_id: id,
        document_version_id: versionId,
        user_id: user.id,
        action: 'reject',
        comment: reason.trim(),
      });

    // Optionally archive the rejected version
    if (archive) {
      await serviceClient
        .from('document_versions')
        .update({ status: 'ARCHIVED' })
        .eq('id', versionId);

      await serviceClient
        .from('documents')
        .update({
          current_status: 'ARCHIVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    // Log rejection
    await serviceClient.from('sync_logs').insert({
      tenant_id: tenantId,
      document_id: id,
      action: 'reject',
      status: 'success',
      details: {
        document_version_id: versionId,
        version_number: versionNumber,
        rejected_by: user.email,
        reason: reason.trim(),
        archived: archive,
      },
    });

    return NextResponse.json({
      success: true,
      message: archive
        ? 'Document rejected and archived'
        : 'Document rejected. It remains as DRAFT for revision.',
      document: {
        id,
        title: document.title,
        status: archive ? 'ARCHIVED' : 'DRAFT',
        version_number: versionNumber,
      },
    });
  } catch (error) {
    console.error('[Reject] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
