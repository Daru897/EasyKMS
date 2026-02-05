import { inngest } from '@/lib/inngest';
import { createServiceClient } from '@/utils/supabase/server';
import { chunkMarkdown, getChunkStats } from '@/utils/chunking';
import { generateEmbeddings, EMBEDDING_DIMENSIONS } from '@/utils/embeddings';
import { upsertVectors, deleteDocumentVersionVectors } from '@/utils/pinecone/server';

/**
 * Document Indexing Pipeline
 * Indexes approved documents to Pinecone for semantic search
 *
 * Flow:
 * 1. Fetch document version content
 * 2. Chunk the markdown content
 * 3. Generate embeddings for each chunk
 * 4. Upsert vectors to Pinecone with metadata
 * 5. Update document version with chunk count
 */

const MAX_METADATA_TEXT_LENGTH = 1000;

export const indexDocument = inngest.createFunction(
  {
    id: 'index-document',
    name: 'Index Document to Pinecone',
    retries: 2,
  },
  { event: 'document/index' },
  async ({ event, step }) => {
    const { tenantId, documentId, documentVersionId, title } = event.data;

    // Step 1: Fetch document version content
    const versionData = await step.run('fetch-document-version', async () => {
      const supabase = createServiceClient();

      const { data: version, error } = await supabase
        .from('document_versions')
        .select(`
          id,
          document_id,
          parsed_markdown,
          version_number,
          status,
          effective_date,
          approved_at,
          created_at
        `)
        .eq('id', documentVersionId)
        .single();

      if (error || !version) {
        throw new Error(`Failed to fetch document version: ${error?.message || 'Not found'}`);
      }

      if (version.status !== 'LIVE') {
        throw new Error(`Document version is not LIVE (status: ${version.status}). Only LIVE documents can be indexed.`);
      }

      return version;
    });

    // Step 2: Delete old vectors for this version (in case of re-indexing)
    await step.run('delete-old-vectors', async () => {
      try {
        await deleteDocumentVersionVectors(tenantId, documentVersionId);
        console.log(`[Indexing] Deleted old vectors for version ${documentVersionId}`);
      } catch {
        // Ignore errors if no vectors exist
        console.log(`[Indexing] No old vectors to delete for version ${documentVersionId}`);
      }
    });

    // Step 3: Chunk the content
    const chunks = await step.run('chunk-content', async () => {
      const markdown = versionData.parsed_markdown || '';

      if (!markdown || markdown.trim().length === 0) {
        return [];
      }

      const chunkedContent = chunkMarkdown(markdown);
      const stats = getChunkStats(chunkedContent);

      console.log(`[Indexing] Chunked document into ${stats.totalChunks} chunks`);
      console.log(`[Indexing] Stats: avg ${stats.avgTokensPerChunk} tokens/chunk, range ${stats.minTokens}-${stats.maxTokens}`);

      return chunkedContent;
    });

    if (chunks.length === 0) {
      // No content to index
      await step.run('log-empty', async () => {
        const supabase = createServiceClient();
        await supabase.from('sync_logs').insert({
          tenant_id: tenantId,
          document_id: documentId,
          action: 'index',
          status: 'skipped',
          details: {
            document_version_id: documentVersionId,
            reason: 'No content to index',
          },
        });
      });

      return {
        success: true,
        message: 'Document has no content to index',
        chunksIndexed: 0,
      };
    }

    // Step 4: Get categories for metadata
    const categories = await step.run('get-categories', async () => {
      const supabase = createServiceClient();

      const { data } = await supabase
        .from('document_version_categories')
        .select(`
          category:document_categories(name)
        `)
        .eq('document_version_id', documentVersionId);

      if (!data) return [];

      return data
        .map((item: Record<string, unknown>) => {
          const category = item.category as { name: string } | { name: string }[] | null;
          if (Array.isArray(category)) return category[0]?.name;
          return category?.name;
        })
        .filter((name): name is string => Boolean(name));
    });

    // Step 5: Generate embeddings for all chunks
    const chunkTexts = chunks.map(chunk => chunk.text);
    const embeddings = await step.run('generate-embeddings', async () => {
      console.log(`[Indexing] Generating embeddings for ${chunkTexts.length} chunks...`);
      const result = await generateEmbeddings(chunkTexts);
      console.log(`[Indexing] Generated ${result.length} embeddings`);
      return result;
    });

    // Step 6: Prepare and upsert vectors
    await step.run('upsert-vectors', async () => {
      const effectiveDate = versionData.effective_date || versionData.approved_at || versionData.created_at;
      const effectiveDateEpoch = effectiveDate ? new Date(effectiveDate).getTime() : undefined;

      const vectors = chunks.map((chunk, index) => ({
        id: `${documentVersionId}_chunk_${chunk.index}`,
        values: embeddings[index],
        metadata: {
          document_id: documentId,
          document_version_id: documentVersionId,
          tenant_id: tenantId,
          document_title: title,
          document_status: 'LIVE',
          chunk_index: chunk.index,
          chunk_text: chunk.text.slice(0, MAX_METADATA_TEXT_LENGTH),
          categories: categories,
          heading_context: chunk.metadata.headingContext || '',
          effective_date: effectiveDate || null,
          effective_date_epoch: effectiveDateEpoch,
          indexed_at: new Date().toISOString(),
        },
      }));

      // Upsert in batches of 100
      const BATCH_SIZE = 100;
      let totalUpserted = 0;

      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await upsertVectors(tenantId, batch);
        totalUpserted += batch.length;
        console.log(`[Indexing] Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}, total: ${totalUpserted}`);
      }

      return { totalUpserted };
    });

    // Step 7: Update document version with chunk count
    await step.run('update-chunk-count', async () => {
      const supabase = createServiceClient();

      await supabase
        .from('document_versions')
        .update({
          chunk_count: chunks.length,
        })
        .eq('id', documentVersionId);
    });

    // Step 8: Log success
    await step.run('log-success', async () => {
      const supabase = createServiceClient();
      await supabase.from('sync_logs').insert({
        tenant_id: tenantId,
        document_id: documentId,
        action: 'index',
        status: 'success',
        details: {
          document_version_id: documentVersionId,
          title: title,
          chunks_indexed: chunks.length,
          embedding_dimensions: EMBEDDING_DIMENSIONS,
          categories: categories,
        },
      });
    });

    return {
      success: true,
      documentId,
      documentVersionId,
      chunksIndexed: chunks.length,
      message: `Successfully indexed ${chunks.length} chunks to Pinecone`,
    };
  }
);
