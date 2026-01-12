# Pinecone Namespace Wrapper

This module provides a secure, multi-tenant wrapper for Pinecone vector database operations. **Every operation is automatically isolated by tenant using namespaces.**

## Key Features

✅ **Enforced Tenant Isolation** - `tenant_id` is required for all operations  
✅ **Namespace Safety** - Tenant IDs are automatically converted to safe namespace strings  
✅ **Type Safety** - Full TypeScript support  
✅ **Error Handling** - Comprehensive error messages and validation  
✅ **Security** - Prevents accidental cross-tenant data access  

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```env
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=knowbot-kms  # Optional, defaults to 'knowbot-kms'
```

### 2. Create Pinecone Index

Create an index in your Pinecone dashboard:
- **Name**: `knowbot-kms` (or match `PINECONE_INDEX_NAME`)
- **Dimensions**: `1536` (for OpenAI embeddings) or your embedding model's dimension
- **Metric**: `cosine` (recommended for semantic search)

## Usage

### Server-Side (Recommended)

All Pinecone operations should be done server-side for security:

```typescript
import { upsertVectors, queryVectors, deleteVectors } from '@/utils/pinecone/server';

// Upsert vectors
await upsertVectors(tenantId, [
  {
    id: 'vector-1',
    values: [0.1, 0.2, ...], // Your embedding vector
    metadata: {
      document_id: 'doc-123',
      document_version_id: 'version-456',
      chunk_text: 'Sample text...',
    },
  },
]);

// Query vectors
const results = await queryVectors(tenantId, queryVector, {
  topK: 10,
  filter: {
    document_status: { $eq: 'LIVE' },
  },
});

// Delete vectors
await deleteVectors(tenantId, {
  ids: ['vector-1', 'vector-2'],
});
```

### Client-Side (Via API Routes)

For client-side operations, create API routes that use the server utilities:

```typescript
// app/api/pinecone/query/route.ts
import { queryVectors } from '@/utils/pinecone/server';

export async function POST(request: Request) {
  const { tenantId, queryVector, topK } = await request.json();
  const results = await queryVectors(tenantId, queryVector, { topK });
  return Response.json(results);
}
```

## How Namespace Isolation Works

1. **Tenant ID Validation**: Every function validates that `tenant_id` is a valid UUID
2. **Namespace Conversion**: Tenant ID is converted to a safe namespace string
3. **Automatic Isolation**: All Pinecone operations use the tenant's namespace
4. **No Cross-Tenant Access**: It's impossible to query another tenant's data

### Example

```typescript
// Tenant A (ID: 550e8400-e29b-41d4-a716-446655440000)
await upsertVectors('550e8400-e29b-41d4-a716-446655440000', vectors);
// → Upserts to namespace: "550e8400-e29b-41d4-a716-446655440000"

// Tenant B (ID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8)
await queryVectors('6ba7b810-9dad-11d1-80b4-00c04fd430c8', queryVector);
// → Queries ONLY from namespace: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
// → Cannot see Tenant A's data
```

## API Reference

### Core Functions

#### `upsertVectors(tenantId, vectors)`
Upsert vectors into tenant's namespace.

**Parameters:**
- `tenantId` (string, required): Tenant UUID
- `vectors` (array, required): Array of `{ id, values, metadata? }`

**Returns:** `Promise<UpsertResponse>`

#### `queryVectors(tenantId, queryVector, options)`
Query vectors from tenant's namespace.

**Parameters:**
- `tenantId` (string, required): Tenant UUID
- `queryVector` (number[], required): Query embedding vector
- `options` (object, optional):
  - `topK` (number, default: 10): Number of results
  - `filter` (object): Metadata filter
  - `includeMetadata` (boolean, default: true)
  - `includeValues` (boolean, default: false)

**Returns:** `Promise<QueryResponse>`

#### `deleteVectors(tenantId, options)`
Delete vectors from tenant's namespace.

**Parameters:**
- `tenantId` (string, required): Tenant UUID
- `options` (object):
  - `ids` (string[]): Specific vector IDs to delete
  - `filter` (object): Metadata filter for deletion
  - `deleteAll` (boolean): Delete all vectors in namespace (requires explicit flag)

**Returns:** `Promise<DeleteResponse>`

#### `fetchVectors(tenantId, ids)`
Fetch specific vectors by IDs.

**Parameters:**
- `tenantId` (string, required): Tenant UUID
- `ids` (string[]): Vector IDs to fetch

**Returns:** `Promise<Record<string, Vector>>`

### Helper Functions

#### `deleteDocumentVersionVectors(tenantId, documentVersionId)`
Delete all vectors for a specific document version.

#### `deleteDocumentVectors(tenantId, documentId)`
Delete all vectors for a document (all versions).

## Testing

Test the Pinecone connection:

```bash
# Health check
curl "http://localhost:3000/api/pinecone/test?action=health"

# Get namespace for tenant
curl "http://localhost:3000/api/pinecone/test?tenantId=<uuid>&action=namespace"

# Get namespace stats
curl "http://localhost:3000/api/pinecone/test?tenantId=<uuid>&action=stats"
```

## Best Practices

1. **Always use server-side utilities** - Never expose Pinecone API keys to the client
2. **Validate tenant_id** - The wrapper does this automatically, but ensure you're passing the correct tenant ID
3. **Use metadata filters** - Filter by `document_status: 'LIVE'` to only query published documents
4. **Clean up on archive** - Use `deleteDocumentVersionVectors()` when archiving document versions
5. **Monitor namespace sizes** - Use `getNamespaceStats()` to track vector counts per tenant

## Error Handling

All functions throw descriptive errors:

```typescript
try {
  await queryVectors(tenantId, queryVector);
} catch (error) {
  // Error messages are descriptive:
  // - "tenant_id is required for Pinecone operations"
  // - "Invalid tenant_id format: ..."
  // - "Failed to query vectors: ..."
  console.error(error.message);
}
```

## Security Notes

⚠️ **Critical**: This wrapper ensures tenant isolation, but you must:
- Never trust client-provided `tenant_id` without server-side validation
- Always verify the user's tenant_id from their session/JWT token
- Use RLS policies in Supabase to ensure users can only access their tenant's data

Example secure pattern:

```typescript
// In API route
import { createClient } from '@/utils/supabase/server';
import { queryVectors } from '@/utils/pinecone/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get tenant_id from user's session (not from request body!)
  const tenantId = user?.user_metadata?.tenant_id;
  
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Now safe to use tenantId
  const results = await queryVectors(tenantId, queryVector);
  return Response.json(results);
}
```

## Next Steps

- ✅ Namespace wrapper implemented
- ⏳ Vector indexing (Stage 4)
- ⏳ Query engine (Stage 5)
- ⏳ Integration with document approval workflow
