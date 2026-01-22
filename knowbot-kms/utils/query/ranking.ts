/**
 * Result Ranking and Deduplication
 * Groups chunks by document and ranks for optimal presentation
 */

import type { DocumentVectorMetadata, DocumentQueryResult } from '@/types/pinecone';

/**
 * A chunk from a search result
 */
export interface ChunkResult {
  text: string;
  score: number;
  chunkIndex: number;
  startChar?: number;
  endChar?: number;
}

/**
 * A ranked document result with its best matching chunks
 */
export interface RankedResult {
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  documentStatus: string;
  effectiveDate?: string;
  categories?: string[];
  bestScore: number;
  averageScore: number;
  chunks: ChunkResult[];
}

export interface RankingOptions {
  /**
   * Maximum chunks to include per document
   */
  maxResultsPerDocument?: number;

  /**
   * Maximum total documents to return
   */
  totalMaxResults?: number;

  /**
   * Boost score for documents with multiple matching chunks
   */
  multiChunkBoost?: number;
}

/**
 * Rank and deduplicate search results
 *
 * Groups chunks by document, calculates aggregate scores,
 * and returns deduplicated document-level results
 *
 * @param results - Raw query results from Pinecone
 * @param options - Ranking options
 * @returns Ranked and deduplicated results
 */
export function rankAndDeduplicateResults(
  results: DocumentQueryResult[],
  options: RankingOptions = {}
): RankedResult[] {
  const {
    maxResultsPerDocument = 3,
    totalMaxResults = 10,
    multiChunkBoost = 0.05,
  } = options;

  if (!results || results.length === 0) {
    return [];
  }

  // Group by document version
  const documentMap = new Map<string, {
    metadata: DocumentVectorMetadata;
    chunks: Array<{
      text: string;
      score: number;
      chunkIndex: number;
      startChar?: number;
      endChar?: number;
    }>;
  }>();

  for (const result of results) {
    const versionId = result.documentVersionId;

    if (!documentMap.has(versionId)) {
      documentMap.set(versionId, {
        metadata: result.metadata,
        chunks: [],
      });
    }

    const doc = documentMap.get(versionId)!;
    doc.chunks.push({
      text: result.chunkText,
      score: result.score,
      chunkIndex: result.metadata.chunk_index,
      startChar: result.metadata.chunk_start_char,
      endChar: result.metadata.chunk_end_char,
    });
  }

  // Calculate aggregate scores and build ranked results
  const rankedResults: RankedResult[] = [];

  for (const [versionId, doc] of documentMap.entries()) {
    // Sort chunks by score
    const sortedChunks = doc.chunks.sort((a, b) => b.score - a.score);

    // Take top N chunks
    const topChunks = sortedChunks.slice(0, maxResultsPerDocument);

    // Calculate scores
    const bestScore = topChunks[0].score;
    const averageScore = topChunks.reduce((sum, c) => sum + c.score, 0) / topChunks.length;

    // Apply multi-chunk boost (documents with more relevant chunks are ranked higher)
    const chunkBonus = Math.min(sortedChunks.length - 1, 3) * multiChunkBoost;
    const boostedScore = bestScore + chunkBonus;

    rankedResults.push({
      documentId: doc.metadata.document_id,
      documentVersionId: versionId,
      documentTitle: doc.metadata.document_title,
      documentStatus: doc.metadata.document_status,
      effectiveDate: doc.metadata.effective_date,
      categories: doc.metadata.categories,
      bestScore: boostedScore,
      averageScore,
      chunks: topChunks,
    });
  }

  // Sort by boosted score and limit results
  return rankedResults
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, totalMaxResults);
}

/**
 * Merge overlapping chunks for better context
 * Combines adjacent chunks that were split during indexing
 *
 * @param chunks - Array of chunks to merge
 * @returns Merged chunks with combined text
 */
export function mergeAdjacentChunks(
  chunks: ChunkResult[]
): ChunkResult[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  // Sort by chunk index
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  const merged: ChunkResult[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Check if chunks are adjacent (index differs by 1)
    if (next.chunkIndex === current.chunkIndex + 1) {
      // Merge: combine text and update positions
      current = {
        text: current.text + ' ' + next.text,
        score: Math.max(current.score, next.score),
        chunkIndex: current.chunkIndex,
        startChar: current.startChar,
        endChar: next.endChar,
      };
    } else {
      // Not adjacent, push current and start new
      merged.push(current);
      current = { ...next };
    }
  }

  // Push the last chunk
  merged.push(current);

  return merged;
}

/**
 * Extract snippet from chunk text around key terms
 *
 * @param text - Full chunk text
 * @param maxLength - Maximum snippet length
 * @returns Trimmed snippet
 */
export function extractSnippet(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Take from the beginning and add ellipsis
  const snippet = text.slice(0, maxLength);
  const lastSpace = snippet.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return snippet.slice(0, lastSpace) + '...';
  }

  return snippet + '...';
}
