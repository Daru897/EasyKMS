/**
 * Query Module
 * Barrel export for query-related utilities
 */

// Semantic search
export {
  semanticSearch,
  getQueryStats,
  type QueryOptions,
  type QueryResult,
  type QueryResponseType,
} from './search';

// Ranking and deduplication
export {
  rankAndDeduplicateResults,
  mergeAdjacentChunks,
  extractSnippet,
  type ChunkResult,
  type RankedResult,
  type RankingOptions,
} from './ranking';
