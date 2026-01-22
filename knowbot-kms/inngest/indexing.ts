import { inngest } from '@/lib/inngest';
import { indexDocumentVersion, unindexDocumentVersion } from '@/utils/embeddings/indexing';
import { createServiceClient } from '@/utils/supabase/server';

/**
 * Vector Indexing Inngest Functions
 * Background jobs for document indexing and unindexing
 */

/**
 * Index a document version into Pinecone
 *
 * Triggered when a document version transitions to LIVE status
 */
export const indexDocument = inngest.createFunction(
  {
    id: 'index-document',
    name: 'Index Document to Vector DB',
    retries: 3,
  },
  { event: 'document/index' },
  async ({ event, step }) => {
    const { tenantId, documentId, versionId } = event.data;

    // Step 1: Validate document exists and is LIVE
    const validation = await step.run('validate-document', async () => {
      const supabase = createServiceClient();

      const { data: version, error } = await supabase
        .from('document_versions')
        .select(`
          id,
          status,
          documents!inner (
            id,
            tenant_id,
            title
          )
        `)
        .eq('id', versionId)
        .eq('document_id', documentId)
        .single();

      if (error || !version) {
        return {
          valid: false,
          reason: 'Document version not found',
        };
      }

      const doc = version.documents as unknown as {
        id: string;
        tenant_id: string;
        title: string;
      };

      if (doc.tenant_id !== tenantId) {
        return {
          valid: false,
          reason: 'Tenant mismatch',
        };
      }

      // Only index LIVE documents
      if (version.status !== 'LIVE') {
        return {
          valid: false,
          reason: `Document status is ${version.status}, not LIVE`,
        };
      }

      return {
        valid: true,
        title: doc.title,
      };
    });

    if (!validation.valid) {
      return {
        success: false,
        message: `Skipped indexing: ${'reason' in validation ? validation.reason : 'Unknown reason'}`,
        documentId,
        versionId,
      };
    }

    // Step 2: Perform indexing
    const indexResult = await step.run('index-vectors', async () => {
      return await indexDocumentVersion(documentId, versionId, tenantId);
    });

    // Step 3: Log result
    await step.run('log-result', async () => {
      const supabase = createServiceClient();

      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: documentId,
        action: 'index',
        status: indexResult.success ? 'success' : 'error',
        details: {
          version_id: versionId,
          chunks_indexed: indexResult.chunksIndexed,
          total_tokens: indexResult.totalTokens,
          message: indexResult.message,
        },
      });
    });

    return {
      success: indexResult.success,
      documentId: indexResult.documentId,
      versionId: indexResult.versionId,
      chunksIndexed: indexResult.chunksIndexed,
      totalTokens: indexResult.totalTokens,
      message: indexResult.message,
    };
  }
);

/**
 * Remove document version vectors from Pinecone
 *
 * Triggered when a document version transitions to ARCHIVED status
 */
export const unindexDocument = inngest.createFunction(
  {
    id: 'unindex-document',
    name: 'Remove Document from Vector DB',
    retries: 2,
  },
  { event: 'document/unindex' },
  async ({ event, step }) => {
    const { tenantId, versionId } = event.data;

    // Step 1: Get document info for logging
    const docInfo = await step.run('get-document-info', async () => {
      const supabase = createServiceClient();

      const { data: version } = await supabase
        .from('document_versions')
        .select(`
          id,
          document_id,
          documents!inner (
            title
          )
        `)
        .eq('id', versionId)
        .single();

      if (!version) {
        return { documentId: null, title: 'Unknown' };
      }

      const doc = version.documents as unknown as { title: string };

      return {
        documentId: version.document_id,
        title: doc.title,
      };
    });

    // Step 2: Perform unindexing
    const unindexResult = await step.run('unindex-vectors', async () => {
      return await unindexDocumentVersion(versionId, tenantId);
    });

    // Step 3: Log result
    await step.run('log-result', async () => {
      const supabase = createServiceClient();

      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: docInfo.documentId,
        action: 'unindex',
        status: unindexResult.success ? 'success' : 'error',
        details: {
          version_id: versionId,
          title: docInfo.title,
          message: unindexResult.message,
        },
      });
    });

    return {
      success: unindexResult.success,
      versionId,
      message: unindexResult.message,
    };
  }
);

/**
 * Helper: Send index event for a document version
 * Call this when a document version becomes LIVE
 */
export async function sendIndexEvent(
  tenantId: string,
  documentId: string,
  versionId: string
): Promise<void> {
  await inngest.send({
    name: 'document/index',
    data: {
      tenantId,
      documentId,
      versionId,
    },
  });
}

/**
 * Helper: Send unindex event for a document version
 * Call this when a document version becomes ARCHIVED
 */
export async function sendUnindexEvent(
  tenantId: string,
  versionId: string
): Promise<void> {
  await inngest.send({
    name: 'document/unindex',
    data: {
      tenantId,
      versionId,
    },
  });
}
