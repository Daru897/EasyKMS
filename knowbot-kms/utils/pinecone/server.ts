import { getPineconeClient, getPineconeIndexName, validateTenantId, tenantIdToNamespace } from '@/lib/pinecone';
import type { 
  RecordMetadata, 
  QueryResponse, 
  UpsertResponse,
  DeleteResponse,
  Index as PineconeIndex
} from '@pinecone-database/pinecone';

/**
 * Server-side Pinecone utilities with enforced tenant namespace isolation
 * 
 * CRITICAL: Every operation MUST include tenant_id to ensure multi-tenant isolation.
 * This wrapper ensures tenant_id is always provided and used as the namespace.
 */

/**
 * Get the Pinecone index with tenant namespace
 */
export async function getTenantIndex(tenantId: string): Promise<PineconeIndex<RecordMetadata>> {
  validateTenantId(tenantId);
  const client = getPineconeClient();
  const indexName = getPineconeIndexName();
  
  const index = client.index(indexName);
  
  // Return index with namespace context
  // Note: Pinecone v6 uses namespace parameter in operations, not index-level
  return index;
}

/**
 * Upsert vectors into Pinecone with tenant namespace isolation
 * 
 * @param tenantId - Required tenant ID (enforced)
 * @param vectors - Array of vectors to upsert
 * @returns Upsert response
 */
export async function upsertVectors(
  tenantId: string,
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: RecordMetadata;
  }>
): Promise<UpsertResponse> {
  const validatedTenantId = validateTenantId(tenantId);
  const namespace = tenantIdToNamespace(validatedTenantId);
  const index = await getTenantIndex(validatedTenantId);

  if (!vectors || vectors.length === 0) {
    throw new Error('vectors array cannot be empty');
  }

  try {
    const response = await index.namespace(namespace).upsert(vectors);
    return response;
  } catch (error) {
    console.error(`[Pinecone] Upsert failed for tenant ${validatedTenantId}:`, error);
    throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Query vectors from Pinecone with tenant namespace isolation
 * 
 * @param tenantId - Required tenant ID (enforced)
 * @param queryVector - The query vector
 * @param topK - Number of results to return (default: 10)
 * @param filter - Optional metadata filter
 * @param includeMetadata - Whether to include metadata (default: true)
 * @param includeValues - Whether to include vector values (default: false)
 * @returns Query response
 */
export async function queryVectors(
  tenantId: string,
  queryVector: number[],
  options: {
    topK?: number;
    filter?: Record<string, unknown>;
    includeMetadata?: boolean;
    includeValues?: boolean;
  } = {}
): Promise<QueryResponse<RecordMetadata>> {
  const validatedTenantId = validateTenantId(tenantId);
  const namespace = tenantIdToNamespace(validatedTenantId);
  const index = await getTenantIndex(validatedTenantId);

  const {
    topK = 10,
    filter,
    includeMetadata = true,
    includeValues = false,
  } = options;

  if (!queryVector || queryVector.length === 0) {
    throw new Error('queryVector cannot be empty');
  }

  try {
    const response = await index.namespace(namespace).query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata,
      includeValues,
    });
    return response;
  } catch (error) {
    console.error(`[Pinecone] Query failed for tenant ${validatedTenantId}:`, error);
    throw new Error(`Failed to query vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete vectors from Pinecone with tenant namespace isolation
 * 
 * @param tenantId - Required tenant ID (enforced)
 * @param ids - Array of vector IDs to delete (optional, if not provided, deletes all in namespace)
 * @param filter - Optional metadata filter for deletion
 * @returns Delete response
 */
export async function deleteVectors(
  tenantId: string,
  options: {
    ids?: string[];
    filter?: Record<string, unknown>;
    deleteAll?: boolean;
  } = {}
): Promise<DeleteResponse> {
  const validatedTenantId = validateTenantId(tenantId);
  const namespace = tenantIdToNamespace(validatedTenantId);
  const index = await getTenantIndex(validatedTenantId);

  const { ids, filter, deleteAll = false } = options;

  // Safety check: require explicit deleteAll flag if no ids or filter
  if (!ids && !filter && !deleteAll) {
    throw new Error(
      'Cannot delete vectors without ids, filter, or deleteAll=true. ' +
      'This prevents accidental deletion of all tenant data.'
    );
  }

  try {
    if (deleteAll) {
      // Delete all vectors in the namespace
      const response = await index.namespace(namespace).deleteAll();
      return response;
    } else if (ids && ids.length > 0) {
      // Delete specific IDs
      const response = await index.namespace(namespace).deleteMany(ids);
      return response;
    } else if (filter) {
      // Delete by filter
      const response = await index.namespace(namespace).deleteMany(undefined, filter);
      return response;
    } else {
      throw new Error('Invalid delete options');
    }
  } catch (error) {
    console.error(`[Pinecone] Delete failed for tenant ${validatedTenantId}:`, error);
    throw new Error(`Failed to delete vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch specific vectors by IDs with tenant namespace isolation
 * 
 * @param tenantId - Required tenant ID (enforced)
 * @param ids - Array of vector IDs to fetch
 * @returns Fetch response
 */
export async function fetchVectors(
  tenantId: string,
  ids: string[]
): Promise<Record<string, { id: string; values?: number[]; metadata?: RecordMetadata }>> {
  const validatedTenantId = validateTenantId(tenantId);
  const namespace = tenantIdToNamespace(validatedTenantId);
  const index = await getTenantIndex(validatedTenantId);

  if (!ids || ids.length === 0) {
    throw new Error('ids array cannot be empty');
  }

  try {
    const response = await index.namespace(namespace).fetch(ids);
    return response.records || {};
  } catch (error) {
    console.error(`[Pinecone] Fetch failed for tenant ${validatedTenantId}:`, error);
    throw new Error(`Failed to fetch vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get statistics about the tenant's namespace
 * 
 * @param tenantId - Required tenant ID (enforced)
 * @returns Namespace statistics
 */
export async function getNamespaceStats(tenantId: string): Promise<{
  vectorCount?: number;
  [key: string]: unknown;
}> {
  const validatedTenantId = validateTenantId(tenantId);
  const index = await getTenantIndex(validatedTenantId);

  try {
    const stats = await index.describeIndexStats({
      filter: {},
    });
    
    // Note: Pinecone doesn't provide per-namespace stats directly
    // This is a limitation - we'd need to query and count
    // For now, return index-level stats
    return stats;
  } catch (error) {
    console.error(`[Pinecone] Stats failed for tenant ${validatedTenantId}:`, error);
    throw new Error(`Failed to get namespace stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Delete all vectors for a specific document version
 * Useful when archiving or updating documents
 * 
 * @param tenantId - Required tenant ID
 * @param documentVersionId - Document version ID to delete vectors for
 */
export async function deleteDocumentVersionVectors(
  tenantId: string,
  documentVersionId: string
): Promise<DeleteResponse> {
  return deleteVectors(tenantId, {
    filter: {
      document_version_id: { $eq: documentVersionId },
    },
  });
}

/**
 * Helper: Delete all vectors for a document (all versions)
 * Useful when completely removing a document
 * 
 * @param tenantId - Required tenant ID
 * @param documentId - Document ID to delete vectors for
 */
export async function deleteDocumentVectors(
  tenantId: string,
  documentId: string
): Promise<DeleteResponse> {
  return deleteVectors(tenantId, {
    filter: {
      document_id: { $eq: documentId },
    },
  });
}
