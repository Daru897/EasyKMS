import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { inngest } from '@/lib/inngest';

/**
 * POST /api/reindex
 * Reindex LIVE document versions for a tenant (backfill metadata)
 *
 * Body:
 * - limit?: number (default 50)
 */
export async function POST(request: NextRequest) {
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

    let limit = 50;
    try {
      const body = await request.json();
      if (body?.limit && Number.isFinite(body.limit)) {
        limit = Math.min(200, Math.max(1, body.limit));
      }
    } catch {
      // Ignore invalid JSON body
    }

    const serviceClient = createServiceClient();
    const { data: versions, error } = await serviceClient
      .from('document_versions')
      .select(`
        id,
        document_id,
        documents!document_versions_document_id_fkey (
          title
        )
      `)
      .eq('status', 'LIVE')
      .eq('documents.tenant_id', tenantId)
      .limit(limit);

    if (error) {
      throw error;
    }

    const events: Array<{ documentVersionId: string; documentId: string; title: string }> = [];

    for (const version of versions || []) {
      const title = Array.isArray(version.documents)
        ? version.documents[0]?.title
        : version.documents?.title;

      events.push({
        documentVersionId: version.id,
        documentId: version.document_id,
        title: title || 'Untitled',
      });
    }

    for (const event of events) {
      await inngest.send({
        name: 'document/index',
        data: {
          tenantId,
          documentId: event.documentId,
          documentVersionId: event.documentVersionId,
          title: event.title,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reindexed: events.length,
    });
  } catch (error) {
    console.error('[Reindex] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
