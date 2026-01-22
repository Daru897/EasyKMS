/**
 * TypeScript types for Pinecone operations
 */

import type { RecordMetadata } from '@pinecone-database/pinecone';

/**
 * Vector metadata structure for document chunks
 * This should match what we store in Pinecone
 *
 * Note: We use a custom type instead of extending RecordMetadata
 * to avoid TypeScript issues with optional properties.
 */
export interface DocumentVectorMetadata {
  // Document identifiers
  document_id: string;
  document_version_id: string;
  tenant_id: string;

  // Content information
  chunk_index: number;
  chunk_text: string;
  chunk_start_char?: number;
  chunk_end_char?: number;

  // Document metadata
  document_title: string;
  document_status: 'DRAFT' | 'REVIEW' | 'LIVE' | 'ARCHIVED';
  effective_date?: string;

  // Categories/tags
  categories?: string[];

  // Timestamps
  indexed_at: string;

  // Allow additional string-keyed properties for compatibility
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Vector ID format: {document_version_id}-chunk-{chunk_index}
 * Example: "550e8400-e29b-41d4-a716-446655440000-chunk-0"
 */
export function generateVectorId(documentVersionId: string, chunkIndex: number): string {
  return `${documentVersionId}-chunk-${chunkIndex}`;
}

/**
 * Parse vector ID to extract document version ID and chunk index
 */
export function parseVectorId(vectorId: string): {
  documentVersionId: string;
  chunkIndex: number;
} | null {
  const match = vectorId.match(/^(.+)-chunk-(\d+)$/);
  if (!match) {
    return null;
  }
  
  return {
    documentVersionId: match[1],
    chunkIndex: parseInt(match[2], 10),
  };
}

/**
 * Query result with document context
 */
export interface DocumentQueryResult {
  score: number;
  metadata: DocumentVectorMetadata;
  chunkText: string;
  documentTitle: string;
  documentVersionId: string;
}
