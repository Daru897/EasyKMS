/**
 * Client-side Pinecone utilities
 * 
 * Note: Pinecone operations should typically be done server-side for security.
 * This file is reserved for any client-side utilities if needed in the future.
 * 
 * For now, all Pinecone operations should go through API routes that use
 * the server-side utilities in utils/pinecone/server.ts
 */

/**
 * Client-side helper to call Pinecone operations via API routes
 * This ensures tenant_id is validated server-side
 */

export async function queryVectorsViaAPI(
  tenantId: string,
  queryVector: number[],
  options: {
    topK?: number;
    filter?: Record<string, any>;
  } = {}
): Promise<Response> {
  const response = await fetch('/api/pinecone/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId,
      queryVector,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response;
}

// Add more client-side helpers as needed
// All should route through API endpoints for security
