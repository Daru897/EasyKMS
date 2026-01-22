/**
 * Document Indexing Orchestration
 * Coordinates chunking, embedding, and vector storage
 */

import { createServiceClient } from '@/utils/supabase/server';
import { upsertVectors, deleteDocumentVersionVectors } from '@/utils/pinecone/server';
import { chunkText, estimateTotalTokens, type TextChunk } from './chunking';
import { generateEmbeddingsBatch, isEmbeddingServiceReady } from './openai-embed';
import { generateVectorId, type DocumentVectorMetadata } from '@/types/pinecone';
import type { RecordMetadata } from '@pinecone-database/pinecone';

export interface IndexingResult {
  success: boolean;
  documentId: string;
  versionId: string;
  chunksIndexed: number;
  totalTokens: number;
  message: string;
}

export interface IndexingOptions {
  /**
   * Override default chunk size
   */
  chunkSize?: number;

  /**
   * Override default overlap size
   */
  overlapSize?: number;
}

/**
 * Index a document version into Pinecone
 *
 * Pipeline: Fetch document → Chunk text → Generate embeddings → Upsert vectors
 *
 * @param documentId - Document ID
 * @param versionId - Document version ID
 * @param tenantId - Tenant ID for namespace isolation
 * @param options - Optional indexing configuration
 * @returns Indexing result
 */
export async function indexDocumentVersion(
  documentId: string,
  versionId: string,
  tenantId: string,
  options: IndexingOptions = {}
): Promise<IndexingResult> {
  // Check if embedding service is ready
  if (!isEmbeddingServiceReady()) {
    return {
      success: false,
      documentId,
      versionId,
      chunksIndexed: 0,
      totalTokens: 0,
      message: 'OpenAI embedding service is not configured. Please set a valid OPENAI_API_KEY.',
    };
  }

  const supabase = createServiceClient();

  // Step 1: Fetch document and version data
  const { data: version, error: versionError } = await supabase
    .from('document_versions')
    .select(`
      id,
      document_id,
      parsed_markdown,
      status,
      effective_date,
      documents!inner (
        id,
        tenant_id,
        title,
        current_status
      )
    `)
    .eq('id', versionId)
    .eq('document_id', documentId)
    .single();

  if (versionError || !version) {
    return {
      success: false,
      documentId,
      versionId,
      chunksIndexed: 0,
      totalTokens: 0,
      message: `Document version not found: ${versionError?.message || 'Not found'}`,
    };
  }

  // Type assertion for the nested join
  const document = version.documents as unknown as {
    id: string;
    tenant_id: string;
    title: string;
    current_status: string;
  };

  // Verify tenant ownership
  if (document.tenant_id !== tenantId) {
    return {
      success: false,
      documentId,
      versionId,
      chunksIndexed: 0,
      totalTokens: 0,
      message: 'Document does not belong to the specified tenant',
    };
  }

  const content = version.parsed_markdown;
  if (!content || content.trim().length === 0) {
    return {
      success: false,
      documentId,
      versionId,
      chunksIndexed: 0,
      totalTokens: 0,
      message: 'Document version has no content to index',
    };
  }

  // Step 2: Chunk the text
  const chunks = chunkText(content, {
    chunkSize: options.chunkSize,
    overlapSize: options.overlapSize,
  });

  if (chunks.length === 0) {
    return {
      success: false,
      documentId,
      versionId,
      chunksIndexed: 0,
      totalTokens: 0,
      message: 'Document produced no chunks after processing',
    };
  }

  // Step 3: Generate embeddings for all chunks
  const chunkTexts = chunks.map(c => c.text);
  const { embeddings, totalTokens } = await generateEmbeddingsBatch(chunkTexts);

  if (embeddings.length !== chunks.length) {
    return {
      success: false,
      documentId,
      versionId,
      chunksIndexed: 0,
      totalTokens,
      message: `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`,
    };
  }

  // Step 4: Fetch categories for this version
  const { data: categories } = await supabase
    .from('document_version_categories')
    .select('category:document_categories(name)')
    .eq('document_version_id', versionId);

  const categoryNames = categories?.map(c => {
    const cat = c.category as unknown as { name: string };
    return cat?.name;
  }).filter(Boolean) as string[] || [];

  // Step 5: Prepare vectors for upsert
  const vectors = chunks.map((chunk, index) => {
    const metadata: DocumentVectorMetadata = {
      document_id: documentId,
      document_version_id: versionId,
      tenant_id: tenantId,
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      chunk_start_char: chunk.startChar,
      chunk_end_char: chunk.endChar,
      document_title: document.title,
      document_status: version.status as 'DRAFT' | 'REVIEW' | 'LIVE' | 'ARCHIVED',
      effective_date: version.effective_date || undefined,
      categories: categoryNames.length > 0 ? categoryNames : undefined,
      indexed_at: new Date().toISOString(),
    };

    return {
      id: generateVectorId(versionId, chunk.index),
      values: embeddings[index],
      metadata: metadata as unknown as RecordMetadata,
    };
  });

  // Step 6: Delete any existing vectors for this version (in case of re-indexing)
  try {
    await deleteDocumentVersionVectors(tenantId, versionId);
  } catch {
    // Ignore errors during deletion - vectors might not exist
  }

  // Step 7: Upsert new vectors
  await upsertVectors(tenantId, vectors);

  // Step 8: Update document version with chunk count
  await supabase
    .from('document_versions')
    .update({
      chunk_count: chunks.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', versionId);

  return {
    success: true,
    documentId,
    versionId,
    chunksIndexed: chunks.length,
    totalTokens,
    message: `Successfully indexed ${chunks.length} chunks`,
  };
}

/**
 * Remove vectors for a document version from Pinecone
 *
 * @param versionId - Document version ID
 * @param tenantId - Tenant ID for namespace isolation
 * @returns Success status
 */
export async function unindexDocumentVersion(
  versionId: string,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDocumentVersionVectors(tenantId, versionId);

    // Update chunk count to 0
    const supabase = createServiceClient();
    await supabase
      .from('document_versions')
      .update({
        chunk_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', versionId);

    return {
      success: true,
      message: `Successfully removed vectors for version ${versionId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to unindex: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Re-index all LIVE document versions for a tenant
 * Useful for bulk reprocessing after schema changes
 *
 * @param tenantId - Tenant ID
 * @returns Summary of indexing operations
 */
export async function reindexTenantDocuments(
  tenantId: string
): Promise<{
  success: boolean;
  indexed: number;
  failed: number;
  results: IndexingResult[];
}> {
  const supabase = createServiceClient();

  // Get all LIVE document versions for this tenant
  const { data: versions, error } = await supabase
    .from('document_versions')
    .select(`
      id,
      document_id,
      documents!inner (
        tenant_id
      )
    `)
    .eq('status', 'LIVE')
    .eq('documents.tenant_id', tenantId);

  if (error || !versions) {
    return {
      success: false,
      indexed: 0,
      failed: 0,
      results: [],
    };
  }

  const results: IndexingResult[] = [];
  let indexed = 0;
  let failed = 0;

  for (const version of versions) {
    const result = await indexDocumentVersion(
      version.document_id,
      version.id,
      tenantId
    );

    results.push(result);

    if (result.success) {
      indexed++;
    } else {
      failed++;
    }
  }

  return {
    success: failed === 0,
    indexed,
    failed,
    results,
  };
}
