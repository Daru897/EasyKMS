# Vector Indexing & Query Engine - Implementation Guide

**For:** Building the core AI/ML search functionality yourself  
**Date:** January 21, 2025

---

## 📦 Step 0: Install Dependencies

```bash
cd C:\Users\LOQ\Desktop\IKMS\knowbot-kms
npm install openai
```

**Add to `.env.local`:**
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Test OpenAI connection:**
```bash
node -e "const OpenAI = require('openai').default; const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY}); console.log('OpenAI configured');"
```

---

## 🎯 Part 1: Vector Indexing (When Document is Approved)

### Architecture Overview

```
Document Approved (LIVE)
    ↓
1. Fetch document content from DB
    ↓
2. Chunk text (500-1000 chars with overlap)
    ↓
3. Generate embeddings for each chunk (OpenAI)
    ↓
4. Upsert to Pinecone with metadata
    ↓
5. Document now searchable!
```

### File Structure to Create

```
knowbot-kms/
├── utils/
│   ├── embeddings/
│   │   ├── chunking.ts          # Text splitting logic
│   │   ├── openai-embed.ts      # Embedding generation
│   │   └── indexing.ts          # Orchestration
│   └── pinecone/
│       └── indexing.ts          # Pinecone upsert logic (extend existing)
```

---

## 📄 Implementation Files

### 1. Text Chunking (`utils/embeddings/chunking.ts`)

```typescript
/**
 * Text Chunking Utility
 * Splits long documents into searchable chunks with overlap
 */

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

export interface ChunkingOptions {
  chunkSize?: number;      // Default: 800 characters
  chunkOverlap?: number;   // Default: 200 characters
  minChunkSize?: number;   // Default: 100 characters
}

/**
 * Split text into overlapping chunks
 * 
 * Strategy:
 * - Split on sentence boundaries when possible
 * - Maintain context with overlap
 * - Preserve meaning (don't split mid-word)
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    chunkSize = 800,
    chunkOverlap = 200,
    minChunkSize = 100,
  } = options;

  // Remove excessive whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanText.length <= chunkSize) {
    return [{
      text: cleanText,
      startIndex: 0,
      endIndex: cleanText.length,
      chunkIndex: 0,
    }];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    // Don't go past the end
    if (endIndex >= cleanText.length) {
      endIndex = cleanText.length;
    } else {
      // Try to break on sentence boundary
      const sentenceEnd = findSentenceBoundary(
        cleanText,
        startIndex,
        endIndex
      );
      
      if (sentenceEnd > startIndex + minChunkSize) {
        endIndex = sentenceEnd;
      } else {
        // Fallback: break on word boundary
        const wordEnd = findWordBoundary(cleanText, endIndex);
        if (wordEnd > startIndex + minChunkSize) {
          endIndex = wordEnd;
        }
      }
    }

    const chunkText = cleanText.slice(startIndex, endIndex).trim();
    
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
        chunkIndex: chunkIndex++,
      });
    }

    // Move forward by (chunkSize - overlap)
    startIndex = endIndex - chunkOverlap;
    
    // Ensure we make progress
    if (startIndex <= chunks[chunks.length - 1]?.startIndex) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

/**
 * Find the nearest sentence boundary (. ! ?)
 */
function findSentenceBoundary(
  text: string,
  start: number,
  idealEnd: number
): number {
  const searchText = text.slice(start, idealEnd + 100); // Look a bit ahead
  const sentenceEnds = /[.!?]\s+/g;
  let lastMatch = -1;
  let match;

  while ((match = sentenceEnds.exec(searchText)) !== null) {
    const position = start + match.index + match[0].length;
    if (position <= idealEnd + 50) {
      lastMatch = position;
    } else {
      break;
    }
  }

  return lastMatch > start ? lastMatch : idealEnd;
}

/**
 * Find the nearest word boundary (space)
 */
function findWordBoundary(text: string, idealEnd: number): number {
  // Look backwards for a space
  for (let i = idealEnd; i > idealEnd - 100 && i > 0; i--) {
    if (text[i] === ' ') {
      return i;
    }
  }
  
  // Look forwards for a space
  for (let i = idealEnd; i < idealEnd + 100 && i < text.length; i++) {
    if (text[i] === ' ') {
      return i;
    }
  }
  
  return idealEnd;
}

/**
 * Calculate optimal chunk size based on document length
 */
export function getOptimalChunkSize(documentLength: number): ChunkingOptions {
  if (documentLength < 2000) {
    return { chunkSize: 600, chunkOverlap: 150 };
  } else if (documentLength < 10000) {
    return { chunkSize: 800, chunkOverlap: 200 };
  } else {
    return { chunkSize: 1000, chunkOverlap: 250 };
  }
}

/**
 * Preview chunks (useful for debugging)
 */
export function previewChunks(chunks: TextChunk[]): void {
  console.log(`Generated ${chunks.length} chunks:`);
  chunks.forEach((chunk, idx) => {
    console.log(`\nChunk ${idx + 1}:`);
    console.log(`  Length: ${chunk.text.length} chars`);
    console.log(`  Preview: ${chunk.text.slice(0, 100)}...`);
  });
}
```

---

### 2. OpenAI Embeddings (`utils/embeddings/openai-embed.ts`)

```typescript
/**
 * OpenAI Embeddings Generation
 * Uses text-embedding-3-small model (cost-effective, fast)
 */

import OpenAI from 'openai';

// Initialize client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small dimensions

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;
    const tokens = response.usage.total_tokens;

    return {
      embedding,
      tokens,
      model: EMBEDDING_MODEL,
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * OpenAI allows up to 2048 inputs per request
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  // Process in batches to respect API limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: 'float',
      });

      const batchResults = response.data.map((item, idx) => ({
        embedding: item.embedding,
        tokens: response.usage.total_tokens / batch.length, // Approximate per text
        model: EMBEDDING_MODEL,
      }));

      results.push(...batchResults);

      // Small delay to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error generating batch embeddings (batch ${i}):`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Estimate cost for embedding generation
 * text-embedding-3-small: $0.02 / 1M tokens
 */
export function estimateEmbeddingCost(tokenCount: number): number {
  const costPerMillionTokens = 0.02;
  return (tokenCount / 1_000_000) * costPerMillionTokens;
}

/**
 * Test embedding generation
 */
export async function testEmbedding(): Promise<void> {
  const testText = "This is a test sentence for embedding generation.";
  
  console.log('Testing OpenAI embedding...');
  const result = await generateEmbedding(testText);
  
  console.log('✅ Embedding generated successfully');
  console.log(`   Dimensions: ${result.embedding.length}`);
  console.log(`   Tokens used: ${result.tokens}`);
  console.log(`   Model: ${result.model}`);
  console.log(`   Cost: $${estimateEmbeddingCost(result.tokens).toFixed(6)}`);
}
```

---

### 3. Indexing Orchestration (`utils/embeddings/indexing.ts`)

```typescript
/**
 * Document Indexing Orchestration
 * Coordinates chunking, embedding, and Pinecone upsert
 */

import { chunkText, getOptimalChunkSize, type TextChunk } from './chunking';
import { generateEmbeddingsBatch, estimateEmbeddingCost } from './openai-embed';
import { upsertVectors, deleteDocumentVectors } from '../pinecone/indexing';
import { createClient } from '@/utils/supabase/server';

export interface IndexingResult {
  success: boolean;
  documentId: string;
  versionId: string;
  chunksCreated: number;
  tokensUsed: number;
  estimatedCost: number;
  error?: string;
}

/**
 * Index a document version in Pinecone
 * 
 * Workflow:
 * 1. Fetch document and version from database
 * 2. Chunk the content
 * 3. Generate embeddings for chunks
 * 4. Upsert to Pinecone with metadata
 */
export async function indexDocumentVersion(
  documentId: string,
  versionId: string,
  tenantId: string
): Promise<IndexingResult> {
  console.log(`[Indexing] Starting indexing for document ${documentId}, version ${versionId}`);

  try {
    // 1. Fetch document content from database
    const supabase = await createClient();
    
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select(`
        id,
        version_number,
        content,
        word_count,
        document_id,
        documents (
          id,
          title,
          google_file_id,
          tenant_id
        )
      `)
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      throw new Error(`Failed to fetch version: ${versionError?.message}`);
    }

    const document = version.documents;
    if (!document || document.tenant_id !== tenantId) {
      throw new Error('Document not found or tenant mismatch');
    }

    const content = version.content;
    if (!content || content.trim().length === 0) {
      throw new Error('Document has no content to index');
    }

    console.log(`[Indexing] Document: ${document.title}, Version: ${version.version_number}`);

    // 2. Chunk the content
    const chunkOptions = getOptimalChunkSize(content.length);
    const chunks = chunkText(content, chunkOptions);

    console.log(`[Indexing] Created ${chunks.length} chunks`);

    // 3. Generate embeddings
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    const totalTokens = embeddings.reduce((sum, e) => sum + e.tokens, 0);
    const estimatedCost = estimateEmbeddingCost(totalTokens);

    console.log(`[Indexing] Generated embeddings: ${embeddings.length}, Tokens: ${totalTokens}, Cost: $${estimatedCost.toFixed(4)}`);

    // 4. Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentId}_v${version.version_number}_chunk${idx}`,
      values: embeddings[idx].embedding,
      metadata: {
        documentId: document.id,
        versionId: version.id,
        versionNumber: version.version_number,
        tenantId: tenantId,
        title: document.title,
        googleFileId: document.google_file_id || '',
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.text,
        wordCount: chunk.text.split(/\s+/).length,
        // For time-machine queries
        effectiveDate: new Date().toISOString(),
      },
    }));

    // 5. Upsert to Pinecone
    await upsertVectors(tenantId, vectors);

    console.log(`[Indexing] ✅ Successfully indexed ${chunks.length} chunks`);

    return {
      success: true,
      documentId: document.id,
      versionId: version.id,
      chunksCreated: chunks.length,
      tokensUsed: totalTokens,
      estimatedCost,
    };

  } catch (error) {
    console.error('[Indexing] Error:', error);
    return {
      success: false,
      documentId,
      versionId,
      chunksCreated: 0,
      tokensUsed: 0,
      estimatedCost: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete all vectors for a document version
 * Used when archiving or updating versions
 */
export async function unindexDocumentVersion(
  documentId: string,
  versionNumber: number,
  tenantId: string
): Promise<void> {
  console.log(`[Unindexing] Removing vectors for document ${documentId}, version ${versionNumber}`);

  const vectorIdPrefix = `${documentId}_v${versionNumber}_`;
  await deleteDocumentVectors(tenantId, vectorIdPrefix);

  console.log(`[Unindexing] ✅ Removed vectors for version ${versionNumber}`);
}

/**
 * Re-index a document (delete old + index new)
 * Used when a new version is published
 */
export async function reindexDocument(
  documentId: string,
  oldVersionNumber: number,
  newVersionId: string,
  tenantId: string
): Promise<IndexingResult> {
  console.log(`[Re-indexing] Document ${documentId}: removing v${oldVersionNumber}, adding new version`);

  // Remove old version vectors
  await unindexDocumentVersion(documentId, oldVersionNumber, tenantId);

  // Index new version
  return await indexDocumentVersion(documentId, newVersionId, tenantId);
}
```

---

### 4. Pinecone Vector Operations (`utils/pinecone/indexing.ts`)

**Add to existing `utils/pinecone/server.ts` or create new file:**

```typescript
/**
 * Pinecone Vector Indexing Operations
 * Extends existing Pinecone utilities with indexing functions
 */

import { getPineconeIndex, convertTenantIdToNamespace } from './server';

export interface PineconeVector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

/**
 * Upsert vectors to Pinecone with tenant isolation
 */
export async function upsertVectors(
  tenantId: string,
  vectors: PineconeVector[]
): Promise<void> {
  const namespace = convertTenantIdToNamespace(tenantId);
  const index = await getPineconeIndex();

  console.log(`[Pinecone] Upserting ${vectors.length} vectors to namespace: ${namespace}`);

  // Pinecone allows up to 100 vectors per upsert
  const batchSize = 100;
  
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    
    await index.namespace(namespace).upsert(batch);
    
    console.log(`[Pinecone] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
  }

  console.log(`[Pinecone] ✅ Upsert complete`);
}

/**
 * Delete vectors by ID prefix (for version cleanup)
 */
export async function deleteDocumentVectors(
  tenantId: string,
  vectorIdPrefix: string
): Promise<void> {
  const namespace = convertTenantIdToNamespace(tenantId);
  const index = await getPineconeIndex();

  console.log(`[Pinecone] Deleting vectors with prefix: ${vectorIdPrefix}`);

  // Query to find all matching vectors
  const queryResult = await index.namespace(namespace).query({
    vector: new Array(1536).fill(0), // Dummy vector
    topK: 10000,
    includeMetadata: true,
    filter: {
      documentId: { $eq: vectorIdPrefix.split('_')[0] }
    }
  });

  const idsToDelete = queryResult.matches
    ?.filter(match => match.id.startsWith(vectorIdPrefix))
    .map(match => match.id) || [];

  if (idsToDelete.length > 0) {
    await index.namespace(namespace).deleteMany(idsToDelete);
    console.log(`[Pinecone] ✅ Deleted ${idsToDelete.length} vectors`);
  } else {
    console.log(`[Pinecone] No vectors found to delete`);
  }
}

/**
 * Get namespace stats
 */
export async function getNamespaceStats(tenantId: string): Promise<any> {
  const namespace = convertTenantIdToNamespace(tenantId);
  const index = await getPineconeIndex();

  const stats = await index.describeIndexStats();
  return stats.namespaces?.[namespace] || { vectorCount: 0 };
}
```

---

## 🔍 Part 2: Query Engine (Search)

### Architecture Overview

```
User Query ("How do I process a refund?")
    ↓
1. Generate query embedding (OpenAI)
    ↓
2. Search Pinecone (semantic similarity)
    ↓
3. Apply similarity threshold (> 0.75)
    ↓
4. Return top N results with metadata
    ↓
5. (Optional) Send to LLM with context
```

### File to Create

```
knowbot-kms/
└── utils/
    └── query/
        ├── search.ts           # Core search logic
        └── ranking.ts          # Result ranking and filtering
```

---

### 5. Query Engine (`utils/query/search.ts`)

```typescript
/**
 * Query Engine - Semantic Search
 * Core search functionality with hallucination prevention
 */

import { generateEmbedding } from '../embeddings/openai-embed';
import { getPineconeIndex, convertTenantIdToNamespace } from '../pinecone/server';

export interface SearchOptions {
  topK?: number;              // Number of results (default: 5)
  minSimilarity?: number;     // Minimum similarity score (default: 0.75)
  includeMetadata?: boolean;  // Include full metadata (default: true)
  effectiveDate?: string;     // For time-machine queries
}

export interface SearchResult {
  id: string;
  score: number;
  documentId: string;
  versionId: string;
  versionNumber: number;
  title: string;
  chunkText: string;
  chunkIndex: number;
  metadata: Record<string, any>;
}

export interface QueryResponse {
  query: string;
  results: SearchResult[];
  hasResults: boolean;
  topScore: number;
  searchTime: number;
  message?: string;
}

/**
 * Perform semantic search on the knowledge base
 * 
 * THE SILENCE PROTOCOL:
 * - Only return results with score > minSimilarity (default 0.75)
 * - If no results meet threshold, return NO_DATA response
 * - This prevents hallucination and wrong answers
 */
export async function searchKnowledgeBase(
  query: string,
  tenantId: string,
  options: SearchOptions = {}
): Promise<QueryResponse> {
  const startTime = Date.now();
  
  const {
    topK = 5,
    minSimilarity = 0.75,
    includeMetadata = true,
    effectiveDate,
  } = options;

  console.log(`[Search] Query: "${query}"`);
  console.log(`[Search] Tenant: ${tenantId}, TopK: ${topK}, MinSimilarity: ${minSimilarity}`);

  try {
    // 1. Generate query embedding
    const { embedding: queryEmbedding } = await generateEmbedding(query);

    // 2. Search Pinecone
    const namespace = convertTenantIdToNamespace(tenantId);
    const index = await getPineconeIndex();

    const searchParams: any = {
      vector: queryEmbedding,
      topK: topK * 2, // Fetch more, then filter
      includeMetadata,
    };

    // Time-machine query: filter by effective date
    if (effectiveDate) {
      searchParams.filter = {
        effectiveDate: { $lte: effectiveDate }
      };
    }

    const searchResponse = await index.namespace(namespace).query(searchParams);

    // 3. Filter by similarity threshold (SILENCE PROTOCOL)
    const results: SearchResult[] = (searchResponse.matches || [])
      .filter(match => (match.score || 0) >= minSimilarity)
      .slice(0, topK)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        documentId: match.metadata?.documentId as string,
        versionId: match.metadata?.versionId as string,
        versionNumber: match.metadata?.versionNumber as number,
        title: match.metadata?.title as string,
        chunkText: match.metadata?.chunkText as string,
        chunkIndex: match.metadata?.chunkIndex as number,
        metadata: match.metadata || {},
      }));

    const searchTime = Date.now() - startTime;
    const hasResults = results.length > 0;
    const topScore = results[0]?.score || 0;

    console.log(`[Search] Found ${results.length} results above threshold`);
    console.log(`[Search] Top score: ${topScore.toFixed(3)}, Time: ${searchTime}ms`);

    // 4. Return response
    if (!hasResults) {
      console.log(`[Search] ⚠️ NO_DATA - No results above similarity threshold`);
      return {
        query,
        results: [],
        hasResults: false,
        topScore: 0,
        searchTime,
        message: 'NO_DATA_FOUND',
      };
    }

    return {
      query,
      results,
      hasResults: true,
      topScore,
      searchTime,
    };

  } catch (error) {
    console.error('[Search] Error:', error);
    throw error;
  }
}

/**
 * Log failed queries to knowledge_gaps table
 * Used for gap analysis
 */
export async function logKnowledgeGap(
  query: string,
  tenantId: string,
  userId?: string
): Promise<void> {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  await supabase.from('knowledge_gaps').insert({
    tenant_id: tenantId,
    user_id: userId,
    query_text: query,
    similarity_score: 0,
    result_count: 0,
  });

  console.log(`[Gap Analysis] Logged query: "${query}"`);
}

/**
 * Format search results for LLM context
 */
export function formatResultsForLLM(results: SearchResult[]): string {
  let context = 'Here is the relevant information from the knowledge base:\n\n';

  results.forEach((result, idx) => {
    context += `[Source ${idx + 1}: ${result.title} - v${result.versionNumber}]\n`;
    context += `${result.chunkText}\n\n`;
  });

  context += 'Answer the question using ONLY the information provided above. ';
  context += 'If the answer is not found in the sources, respond with "NO_DATA_FOUND".';

  return context;
}
```

---

### 6. Result Ranking (`utils/query/ranking.ts`)

```typescript
/**
 * Search Result Ranking and Deduplication
 */

import type { SearchResult } from './search';

/**
 * Deduplicate results from same document
 * Keep highest scoring chunk per document
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();

  for (const result of results) {
    const existing = seen.get(result.documentId);
    
    if (!existing || result.score > existing.score) {
      seen.set(result.documentId, result);
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score);
}

/**
 * Boost results based on metadata
 * (e.g., newer versions, specific categories)
 */
export function boostResults(
  results: SearchResult[],
  boosts: {
    newerVersions?: number;  // Multiply score by this for v2+
    categories?: string[];   // Preferred categories
  } = {}
): SearchResult[] {
  return results.map(result => {
    let boostedScore = result.score;

    // Boost newer versions
    if (boosts.newerVersions && result.versionNumber > 1) {
      boostedScore *= boosts.newerVersions;
    }

    return {
      ...result,
      score: Math.min(boostedScore, 1.0), // Cap at 1.0
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Group results by document
 */
export function groupByDocument(results: SearchResult[]): Map<string, SearchResult[]> {
  const grouped = new Map<string, SearchResult[]>();

  for (const result of results) {
    const existing = grouped.get(result.documentId) || [];
    existing.push(result);
    grouped.set(result.documentId, existing);
  }

  return grouped;
}
```

---

## 🔌 API Routes to Create

### Indexing API (`app/api/index/document/route.ts`)

```typescript
/**
 * API: Index a document version
 * POST /api/index/document
 * Body: { documentId, versionId, tenantId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexDocumentVersion } from '@/utils/embeddings/indexing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, versionId, tenantId } = body;

    if (!documentId || !versionId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await indexDocumentVersion(documentId, versionId, tenantId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Indexing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Query API (`app/api/query/route.ts`)

```typescript
/**
 * API: Search knowledge base
 * POST /api/query
 * Body: { query, tenantId, options? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledgeBase, logKnowledgeGap } from '@/utils/query/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, tenantId, options = {} } = body;

    if (!query || !tenantId) {
      return NextResponse.json(
        { error: 'Missing query or tenantId' },
        { status: 400 }
      );
    }

    const results = await searchKnowledgeBase(query, tenantId, options);

    // Log knowledge gap if no results
    if (!results.hasResults) {
      await logKnowledgeGap(query, tenantId);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Query API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing Your Implementation

### Test Script (`scripts/test-indexing.js`)

```javascript
// Test indexing and search
// Run: node scripts/test-indexing.js

const baseUrl = 'http://localhost:3000';
const tenantId = 'your-tenant-id-here';

async function testIndexing() {
  console.log('1. Testing indexing...');
  
  const indexResponse = await fetch(`${baseUrl}/api/index/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId: 'doc-id-here',
      versionId: 'version-id-here',
      tenantId: tenantId,
    }),
  });

  const indexResult = await indexResponse.json();
  console.log('Indexing result:', indexResult);
}

async function testSearch() {
  console.log('\n2. Testing search...');
  
  const searchResponse = await fetch(`${baseUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'How do I process a refund?',
      tenantId: tenantId,
      options: {
        topK: 5,
        minSimilarity: 0.75,
      },
    }),
  });

  const searchResult = await searchResponse.json();
  console.log('Search result:', searchResult);
  
  if (searchResult.hasResults) {
    searchResult.results.forEach((r, i) => {
      console.log(`\n  Result ${i + 1}:`);
      console.log(`    Score: ${r.score.toFixed(3)}`);
      console.log(`    Title: ${r.title}`);
      console.log(`    Text: ${r.chunkText.slice(0, 100)}...`);
    });
  } else {
    console.log('  NO_DATA - Query not answered');
  }
}

testIndexing().then(testSearch).catch(console.error);
```

---

## 📋 Implementation Checklist

### Part 1: Vector Indexing
- [ ] Install `openai` package
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] Create `utils/embeddings/chunking.ts`
- [ ] Create `utils/embeddings/openai-embed.ts`
- [ ] Create `utils/embeddings/indexing.ts`
- [ ] Extend `utils/pinecone/indexing.ts`
- [ ] Create `app/api/index/document/route.ts`
- [ ] Test embedding generation
- [ ] Test document indexing

### Part 2: Query Engine
- [ ] Create `utils/query/search.ts`
- [ ] Create `utils/query/ranking.ts`
- [ ] Create `app/api/query/route.ts`
- [ ] Test search with known document
- [ ] Test NO_DATA response
- [ ] Test knowledge gap logging

### Part 3: Integration
- [ ] Trigger indexing when document approved
- [ ] Add indexing to Inngest workflow
- [ ] Monitor Pinecone vector count
- [ ] Test end-to-end flow

---

## 🎯 Key Design Decisions

### Chunking Strategy
- **800 chars with 200 char overlap:** Balances context vs granularity
- **Sentence boundaries:** Preserves meaning
- **Dynamic sizing:** Adapts to document length

### Embedding Model
- **text-embedding-3-small:** Cost-effective ($0.02/1M tokens)
- **1536 dimensions:** Good balance of accuracy and speed
- **Batch processing:** Efficient API usage

### Similarity Threshold
- **0.75 minimum:** Strong signal for relevance
- **Below threshold = NO_DATA:** Prevents hallucination
- **Gap logging:** Identifies missing knowledge

### Metadata Strategy
- **Store chunk text:** Enables preview without DB lookup
- **Include version info:** Supports time-machine queries
- **Tenant ID in metadata:** Defense-in-depth security

---

## 💰 Cost Estimates

### Embedding Costs (text-embedding-3-small)
- **50 documents, avg 2000 words each:** ~150K tokens
- **Cost:** ~$0.003 (less than 1 cent)

### Search Costs
- **1000 searches/day:** ~$0.02/day
- **Monthly:** ~$0.60

**Total monthly for typical BPO (100 docs, 1K searches/day):** ~$1-2

---

## 🚀 Next Steps After Implementation

1. **Integrate with Approval Workflow:**
   - Auto-index when document status → LIVE
   - Auto-unindex when status → ARCHIVED

2. **Add to Inngest:**
   - Create indexing job function
   - Trigger on document approval event

3. **Build UI (Delegate to Coding Agent):**
   - Manager approval interface
   - Agent search interface

4. **Monitoring:**
   - Track search success rate
   - Monitor embedding costs
   - Analyze knowledge gaps

---

## 📚 Resources

- **OpenAI Embeddings Docs:** https://platform.openai.com/docs/guides/embeddings
- **Pinecone Query Docs:** https://docs.pinecone.io/reference/query
- **Text Chunking Best Practices:** https://www.pinecone.io/learn/chunking-strategies/

---

**Ready to build? Start with Step 0 (install OpenAI), then implement Part 1 (Indexing), then Part 2 (Query)!**
