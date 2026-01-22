/**
 * Embeddings Module
 * Barrel export for embedding-related utilities
 */

// Chunking utilities
export {
  chunkText,
  estimateTokenCount,
  estimateTotalTokens,
  type ChunkOptions,
  type TextChunk,
} from './chunking';

// OpenAI embedding generation
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  isEmbeddingServiceReady,
  getEmbeddingServiceStatus,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './openai-embed';

// Indexing orchestration
export {
  indexDocumentVersion,
  unindexDocumentVersion,
  reindexTenantDocuments,
  type IndexingResult,
  type IndexingOptions,
} from './indexing';
