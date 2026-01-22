# RAG Pipeline Implementation

This document describes the Vector Indexing and Query Engine implementation for KnowBot KMS.

## Overview

The RAG (Retrieval-Augmented Generation) pipeline enables semantic search over approved documents with multi-tenant isolation. It consists of:

1. **Text Chunking** - Splits documents into overlapping chunks
2. **Embedding Generation** - Uses OpenAI's text-embedding-3-small model
3. **Vector Indexing** - Stores embeddings in Pinecone with tenant namespaces
4. **Semantic Search** - Query engine with Silence Protocol for knowledge gaps

## Architecture

```
Document → Chunk (800 chars, 200 overlap) → Embed → Upsert to Pinecone
                                                           ↓
Query → Embed → Query Pinecone → Rank & Deduplicate → Return Results
                      ↓
              Score < 0.75? → Log Knowledge Gap → Return NO_DATA
```

## File Structure

```
knowbot-kms/
├── lib/
│   └── openai.ts                    # OpenAI client configuration
├── utils/
│   ├── embeddings/
│   │   ├── index.ts                 # Barrel export
│   │   ├── chunking.ts              # Text splitting (800 chars, 200 overlap)
│   │   ├── openai-embed.ts          # Embedding generation
│   │   └── indexing.ts              # Orchestration (chunk → embed → upsert)
│   └── query/
│       ├── index.ts                 # Barrel export
│       ├── search.ts                # Semantic search with Silence Protocol
│       └── ranking.ts               # Result deduplication and ranking
├── inngest/
│   └── indexing.ts                  # Background indexing jobs
├── app/api/
│   ├── index/document/route.ts      # Indexing API endpoint
│   └── query/route.ts               # Query API endpoint
└── scripts/
    ├── test-indexing.js             # Test indexing script
    └── test-query.js                # Test query script
```

## Configuration

### Environment Variables

```env
# Required for embedding generation
OPENAI_API_KEY=sk-your-real-api-key-here

# Existing Pinecone configuration
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=knowbot-kms
```

### OpenAI Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `.env.local` with your key
3. Restart the development server
4. Test with the indexing API

The system detects placeholder keys and provides helpful error messages.

## API Reference

### POST /api/index/document

Index a document version into the vector database.

**Request:**
```json
{
  "documentId": "uuid",
  "versionId": "uuid",
  "tenantId": "uuid",
  "options": {
    "chunkSize": 800,
    "overlapSize": 200
  }
}
```

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "versionId": "uuid",
  "chunksIndexed": 15,
  "totalTokens": 3200,
  "message": "Successfully indexed 15 chunks"
}
```

### DELETE /api/index/document

Remove vectors for a document version.

**Request:**
```json
{
  "versionId": "uuid",
  "tenantId": "uuid"
}
```

### PUT /api/index/document

Reindex all LIVE documents for a tenant.

**Request:**
```json
{
  "tenantId": "uuid"
}
```

### POST /api/query

Perform semantic search over indexed documents.

**Request:**
```json
{
  "query": "How do I process a refund?",
  "tenantId": "uuid",
  "options": {
    "topK": 10,
    "similarityThreshold": 0.75,
    "documentStatus": ["LIVE"],
    "effectiveDate": "2024-01-15",
    "categories": ["Policies"],
    "includeContent": true
  }
}
```

**Response (SUCCESS):**
```json
{
  "type": "SUCCESS",
  "success": true,
  "query": "How do I process a refund?",
  "totalMatches": 3,
  "message": "Found 3 relevant document(s)",
  "results": [
    {
      "documentId": "uuid",
      "documentVersionId": "uuid",
      "documentTitle": "Refund Policy",
      "documentStatus": "LIVE",
      "bestScore": 0.92,
      "averageScore": 0.88,
      "chunks": [
        {
          "text": "To process a refund...",
          "score": 0.92,
          "chunkIndex": 3
        }
      ]
    }
  ]
}
```

**Response (NO_DATA - Silence Protocol):**
```json
{
  "type": "NO_DATA",
  "success": false,
  "query": "How do I time travel?",
  "totalMatches": 0,
  "message": "No relevant documents found for your query. This has been logged for review.",
  "results": [],
  "knowledgeGapLogged": true
}
```

## Inngest Events

### document/index

Triggered when a document version transitions to LIVE status.

```typescript
await inngest.send({
  name: 'document/index',
  data: {
    tenantId: 'uuid',
    documentId: 'uuid',
    versionId: 'uuid',
  },
});
```

### document/unindex

Triggered when a document version transitions to ARCHIVED status.

```typescript
await inngest.send({
  name: 'document/unindex',
  data: {
    tenantId: 'uuid',
    versionId: 'uuid',
  },
});
```

## Silence Protocol

The query engine implements a "Silence Protocol" to handle queries that don't match any documents:

1. **Threshold**: Similarity score must be ≥ 0.75
2. **NO_DATA Response**: Below threshold, returns NO_DATA type instead of empty results
3. **Knowledge Gap Logging**: Failed queries are logged to `knowledge_gaps` table
4. **Analytics**: Use logged gaps to identify missing documentation

### Knowledge Gaps Table

Run the migration script to create this table:

```bash
# In Supabase SQL editor, run:
scripts/create-knowledge-gaps-table.sql
```

Or create manually:

```sql
CREATE TABLE knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  query_text TEXT NOT NULL,
  top_similarity_score FLOAT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Note:** The query engine will work without this table - it just won't log knowledge gaps.

## Time-Machine Queries

Query documents as they existed at a specific point in time:

```json
{
  "query": "What was the vacation policy?",
  "tenantId": "uuid",
  "options": {
    "effectiveDate": "2023-06-01"
  }
}
```

This returns only documents with `effective_date <= 2023-06-01`.

## Cost Estimation

Using `text-embedding-3-small` at $0.02/1M tokens:

| Volume | Cost |
|--------|------|
| 100 documents (~200K tokens) | ~$0.004 |
| 1000 daily searches | ~$0.0004/day |
| Monthly total | ~$1-2 |

## Testing

### Manual Testing

1. **Test Indexing:**
```bash
curl -X POST http://localhost:3000/api/index/document \
  -H "Content-Type: application/json" \
  -d '{"documentId": "...", "versionId": "...", "tenantId": "..."}'
```

2. **Test Query:**
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I process a refund?", "tenantId": "..."}'
```

3. **Check Service Status:**
```bash
curl http://localhost:3000/api/index/document
curl http://localhost:3000/api/query
```

### Test Scripts

```bash
# Run indexing test
node scripts/test-indexing.js

# Run query test
node scripts/test-query.js
```

## Workflow Integration

### Approval Workflow Integration

When document status changes:

```typescript
// In your approval workflow handler:
import { sendIndexEvent, sendUnindexEvent } from '@/inngest/indexing';

// When document becomes LIVE
if (newStatus === 'LIVE') {
  await sendIndexEvent(tenantId, documentId, versionId);
}

// When document becomes ARCHIVED
if (newStatus === 'ARCHIVED') {
  await sendUnindexEvent(tenantId, versionId);
}
```

## Troubleshooting

### OpenAI Not Configured

```
Error: OpenAI not configured: OPENAI_API_KEY appears to be a placeholder
```

**Solution:** Update `.env.local` with a real OpenAI API key.

### Rate Limiting

The embedding service includes automatic retry with backoff for rate limits.

### Empty Results

If queries return empty results:
1. Check if documents are indexed (chunk_count > 0 in document_versions)
2. Verify document status is LIVE
3. Check Pinecone dashboard for vectors in tenant namespace

### Knowledge Gaps

Monitor the `knowledge_gaps` table to identify:
- Common unanswered questions
- Documentation gaps
- Training data needs
