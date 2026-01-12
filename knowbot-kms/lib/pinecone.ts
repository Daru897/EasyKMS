import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Initialize Pinecone client
 * Uses environment variables: PINECONE_API_KEY
 */
let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'PINECONE_API_KEY environment variable is not set. ' +
        'Please add it to your .env.local file.'
      );
    }

    pineconeClient = new Pinecone({
      apiKey: apiKey,
    });
  }

  return pineconeClient;
}

/**
 * Get the index name from environment or use default
 */
export function getPineconeIndexName(): string {
  return process.env.PINECONE_INDEX_NAME || 'knowbot-kms';
}

/**
 * Validate that a tenant_id is provided and properly formatted
 */
export function validateTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new Error('tenant_id is required for Pinecone operations');
  }
  
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('tenant_id must be a non-empty string');
  }

  // Ensure tenant_id is a valid UUID format (from Supabase)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    throw new Error(`Invalid tenant_id format: ${tenantId}. Expected UUID format.`);
  }

  return tenantId;
}

/**
 * Convert tenant_id to a safe namespace string
 * Pinecone namespaces must be alphanumeric and hyphens only, max 64 chars
 */
export function tenantIdToNamespace(tenantId: string): string {
  // Remove hyphens and use tenant_id as-is (UUIDs are already safe)
  // If needed, we can hash it, but UUIDs work fine as namespaces
  const safeNamespace = tenantId.replace(/[^a-zA-Z0-9-]/g, '');
  
  if (safeNamespace.length > 64) {
    // If somehow too long, hash it (shouldn't happen with UUIDs)
    throw new Error(`Namespace too long: ${safeNamespace.length} chars. Max 64.`);
  }

  return safeNamespace;
}
