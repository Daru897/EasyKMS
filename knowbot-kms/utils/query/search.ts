/**
 * Semantic Search with Silence Protocol
 * Implements query engine with knowledge gap tracking
 */

import { createServiceClient } from '@/utils/supabase/server';
import { queryVectors } from '@/utils/pinecone/server';
import { generateEmbedding, isEmbeddingServiceReady } from '@/utils/embeddings/openai-embed';
import { rankAndDeduplicateResults, type RankedResult } from './ranking';
import type { DocumentVectorMetadata } from '@/types/pinecone';

/**
 * Similarity threshold for Silence Protocol
 * Below this score, we return NO_DATA and log knowledge gap
 */
const SIMILARITY_THRESHOLD = 0.75;

/**
 * Query response types
 */
export type QueryResponseType = 'SUCCESS' | 'NO_DATA' | 'ERROR';

export interface QueryOptions {
  /**
   * Maximum results to return
   */
  topK?: number;

  /**
   * Override similarity threshold
   */
  similarityThreshold?: number;

  /**
   * Filter by document status (default: LIVE only)
   */
  documentStatus?: ('DRAFT' | 'REVIEW' | 'LIVE' | 'ARCHIVED')[];

  /**
   * Filter by effective date (time-machine query)
   * Only return documents effective on or before this date
   */
  effectiveDate?: string;

  /**
   * Filter by category names
   */
  categories?: string[];

  /**
   * Include document content in response
   */
  includeContent?: boolean;
}

export interface QueryResult {
  type: QueryResponseType;
  results: RankedResult[];
  query: string;
  totalMatches: number;
  message: string;
  knowledgeGapLogged?: boolean;
}

/**
 * Log a knowledge gap when query returns no relevant results
 *
 * Note: Requires the knowledge_gaps table to exist. If the table doesn't exist,
 * this will fail silently. Create the table with:
 *
 * CREATE TABLE knowledge_gaps (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tenant_id UUID REFERENCES tenants(id),
 *   query_text TEXT NOT NULL,
 *   top_similarity_score FLOAT,
 *   status TEXT DEFAULT 'new',
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 */
async function logKnowledgeGap(
  tenantId: string,
  query: string,
  topScore: number | null
): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.from('knowledge_gaps').insert({
      tenant_id: tenantId,
      query_text: query,
      top_similarity_score: topScore,
      status: 'new',
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Table might not exist yet - log but don't fail
      console.warn('[Query] Knowledge gap logging skipped:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    // Silently fail - don't break the query for logging failure
    console.error('[Query] Failed to log knowledge gap:', error);
    return false;
  }
}

/**
 * Perform semantic search over indexed documents
 *
 * Implements Silence Protocol:
 * - If best match score < threshold, return NO_DATA response
 * - Log knowledge gap for analysis
 *
 * @param query - Natural language search query
 * @param tenantId - Tenant ID for namespace isolation
 * @param options - Query options
 * @returns Query result with ranked matches
 */
export async function semanticSearch(
  query: string,
  tenantId: string,
  options: QueryOptions = {}
): Promise<QueryResult> {
  const {
    topK = 10,
    similarityThreshold = SIMILARITY_THRESHOLD,
    documentStatus = ['LIVE'],
    effectiveDate,
    categories,
    includeContent = true,
  } = options;

  // Validate inputs
  if (!query || query.trim().length === 0) {
    return {
      type: 'ERROR',
      results: [],
      query,
      totalMatches: 0,
      message: 'Query cannot be empty',
    };
  }

  // Check if embedding service is ready
  if (!isEmbeddingServiceReady()) {
    return {
      type: 'ERROR',
      results: [],
      query,
      totalMatches: 0,
      message: 'Embedding service not configured. Please set OPENAI_API_KEY.',
    };
  }

  try {
    // Step 1: Generate query embedding
    const { embedding } = await generateEmbedding(query.trim());

    // Step 2: Build metadata filter
    const filter: Record<string, any> = {};

    // Filter by document status
    if (documentStatus.length === 1) {
      filter.document_status = { $eq: documentStatus[0] };
    } else if (documentStatus.length > 1) {
      filter.document_status = { $in: documentStatus };
    }

    // Filter by effective date (time-machine query)
    if (effectiveDate) {
      filter.effective_date = { $lte: effectiveDate };
    }

    // Filter by categories
    if (categories && categories.length > 0) {
      // Pinecone array filter: matches if any category matches
      filter.categories = { $in: categories };
    }

    // Step 3: Query Pinecone
    const response = await queryVectors(tenantId, embedding, {
      topK: topK * 3, // Fetch more for deduplication
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      includeMetadata: true,
    });

    const matches = response.matches || [];

    // Step 4: Check Silence Protocol threshold
    if (matches.length === 0 || (matches[0].score && matches[0].score < similarityThreshold)) {
      const topScore = matches.length > 0 ? matches[0].score || null : null;

      // Log knowledge gap
      const gapLogged = await logKnowledgeGap(tenantId, query, topScore);

      return {
        type: 'NO_DATA',
        results: [],
        query,
        totalMatches: 0,
        message: gapLogged
          ? 'No relevant documents found for your query. This has been logged for review.'
          : 'No relevant documents found for your query.',
        knowledgeGapLogged: gapLogged,
      };
    }

    // Step 5: Process and rank results
    const processedResults = matches
      .filter(match => match.score && match.score >= similarityThreshold)
      .map(match => ({
        score: match.score || 0,
        metadata: match.metadata as DocumentVectorMetadata,
        chunkText: (match.metadata as DocumentVectorMetadata)?.chunk_text || '',
        documentTitle: (match.metadata as DocumentVectorMetadata)?.document_title || '',
        documentVersionId: (match.metadata as DocumentVectorMetadata)?.document_version_id || '',
      }));

    // Step 6: Deduplicate and rank
    const rankedResults = rankAndDeduplicateResults(processedResults, {
      maxResultsPerDocument: 3,
      totalMaxResults: topK,
    });

    // Step 7: Optionally strip content for smaller response
    const finalResults = includeContent
      ? rankedResults
      : rankedResults.map(r => ({
          ...r,
          chunks: r.chunks.map(c => ({ ...c, text: '' })),
        }));

    return {
      type: 'SUCCESS',
      results: finalResults,
      query,
      totalMatches: rankedResults.length,
      message: `Found ${rankedResults.length} relevant document(s)`,
    };
  } catch (error) {
    return {
      type: 'ERROR',
      results: [],
      query,
      totalMatches: 0,
      message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get query statistics for a tenant
 */
export async function getQueryStats(tenantId: string): Promise<{
  totalQueries: number;
  knowledgeGaps: number;
  recentGaps: Array<{ query: string; score: number | null; created_at: string }>;
  tableExists: boolean;
}> {
  const supabase = createServiceClient();

  try {
    const { data: gaps, count, error } = await supabase
      .from('knowledge_gaps')
      .select('query_text, top_similarity_score, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      // Table might not exist
      return {
        totalQueries: 0,
        knowledgeGaps: 0,
        recentGaps: [],
        tableExists: false,
      };
    }

    return {
      totalQueries: 0, // Would need query logging table to track this
      knowledgeGaps: count || 0,
      recentGaps: (gaps || []).map(g => ({
        query: g.query_text,
        score: g.top_similarity_score,
        created_at: g.created_at,
      })),
      tableExists: true,
    };
  } catch {
    return {
      totalQueries: 0,
      knowledgeGaps: 0,
      recentGaps: [],
      tableExists: false,
    };
  }
}
