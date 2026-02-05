# Development Guide

This comprehensive guide covers all major components and features of the IKMS platform, providing implementation details, usage examples, and best practices.

---

## Table of Contents

1. [Google Drive Integration](#google-drive-integration)
2. [Document Sync Watcher](#document-sync-watcher)
3. [Document Ingestion Pipeline](#document-ingestion-pipeline)
4. [Vector Indexing System](#vector-indexing-system)
5. [Approval Workflow](#approval-workflow)
6. [Query Engine](#query-engine-stage-5)
7. [Implementation Logs](#implementation-logs)

---

## Google Drive Integration

### Overview

The Google Drive integration enables automatic document syncing from Google Drive folders into the IKMS system.

### Setup

#### 1. Google Cloud Console Configuration

1. Create/select a Google Cloud project
2. Enable **Google Drive API**
3. Create **OAuth 2.0 credentials**:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/api/google-oauth/callback`
     - Production: `https://yourdomain.com/api/google-oauth/callback`

4. Configure OAuth consent screen:
   - User Type: External (unless G Suite)
   - Add scope: `https://www.googleapis.com/auth/drive.readonly`

#### 2. Environment Variables

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-oauth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 3. Database Schema

```sql
-- google_oauth_tokens table stores OAuth credentials per tenant
CREATE TABLE google_oauth_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  google_user_email TEXT,
  google_user_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
```

### OAuth Flow

#### Connection Process

```
1. User clicks "Connect Google Drive"
   ↓
2. Frontend calls: GET /api/google-oauth/authorize?tenantId=<uuid>
   ↓
3. Generates OAuth URL with state parameter
   ↓
4. Redirects to Google consent screen
   ↓
5. User grants permissions
   ↓
6. Google redirects to: /api/google-oauth/callback?code=...&state=...
   ↓
7. Validate state (CSRF protection)
   ↓
8. Exchange code for tokens
   ↓
9. Get user info from Google
   ↓
10. Store tokens in database
   ↓
11. Redirect to dashboard with success message
```

#### Token Management

**Automatic Refresh**:
```typescript
// utils/google-oauth/server.ts
export async function getValidGoogleTokens(tenantId: string) {
  const tokens = await getTokensFromDatabase(tenantId);
  
  // Check if token expires in next 5 minutes
  if (tokens.expires_at < new Date(Date.now() + 5 * 60 * 1000)) {
    // Refresh token
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    await updateTokensInDatabase(tenantId, newTokens);
    return newTokens;
  }
  
  return tokens;
}
```

### API Endpoints

#### GET /api/google-oauth/authorize
Initiates OAuth flow.

**Query Parameters**:
- `tenantId` (required): UUID of tenant

**Response**: Redirects to Google OAuth

#### GET /api/google-oauth/callback
Handles OAuth callback.

**Query Parameters**:
- `code`: Authorization code from Google
- `state`: CSRF token

**Response**: Redirects to dashboard

#### GET /api/google-oauth/status
Get connection status.

**Query Parameters**:
- `tenantId` (required): UUID of tenant

**Response**:
```json
{
  "success": true,
  "connected": true,
  "email": "user@gmail.com",
  "expiresAt": "2025-01-10T12:00:00Z"
}
```

#### POST /api/google-oauth/disconnect
Disconnect Google Drive.

**Body**:
```json
{
  "tenantId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Google Drive disconnected successfully"
}
```

#### GET /api/google-drive/folders
List folders for selection.

**Query Parameters**:
- `tenantId` (required): UUID of tenant

**Response**:
```json
{
  "success": true,
  "folders": [
    {
      "id": "folder-id",
      "name": "My Folder",
      "modifiedTime": "2025-01-08T10:00:00Z"
    }
  ]
}
```

#### POST /api/google-drive/set-folder
Set folder for syncing.

**Body**:
```json
{
  "tenantId": "uuid",
  "folderId": "google-drive-folder-id"
}
```

### UI Components

#### GoogleDriveConnector Component

```typescript
// components/GoogleDriveConnector.tsx
'use client';

import { useState, useEffect } from 'react';

export default function GoogleDriveConnector({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [email, setEmail] = useState<string>('');
  
  useEffect(() => {
    checkStatus();
  }, [tenantId]);
  
  const checkStatus = async () => {
    const response = await fetch(`/api/google-oauth/status?tenantId=${tenantId}`);
    const data = await response.json();
    setStatus(data.connected ? 'connected' : 'disconnected');
    setEmail(data.email || '');
  };
  
  const connect = () => {
    window.location.href = `/api/google-oauth/authorize?tenantId=${tenantId}`;
  };
  
  const disconnect = async () => {
    await fetch('/api/google-oauth/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    });
    checkStatus();
  };
  
  if (status === 'loading') return <div>Loading...</div>;
  
  if (status === 'connected') {
    return (
      <div>
        <p>Connected as: {email}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }
  
  return <button onClick={connect}>Connect Google Drive</button>;
}
```

### Security Considerations

1. **Token Storage**: Encrypt tokens in production using Supabase Vault
2. **CSRF Protection**: State parameter validated in callback
3. **Scope Limitation**: Only request `drive.readonly` permission
4. **Token Refresh**: Automatic refresh before expiration
5. **RLS Policies**: Only tenant admins/managers can manage connections

---

## Document Sync Watcher

### Overview

The Sync Watcher monitors Google Drive for file changes and triggers document ingestion.

### Sync Modes

#### 1. Polling Mode (Default)

**Scheduled Job** runs every 5 minutes:

```typescript
// inngest/scheduled.ts
export const periodicSync = inngest.createFunction(
  { id: 'periodic-sync-all-tenants' },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    const activeTenants = await getTenantsWithGoogleDrive();
    
    for (const tenant of activeTenants) {
      await inngest.send({
        name: 'google-drive/sync',
        data: { tenantId: tenant.id }
      });
    }
  }
);
```

**Change Detection**:
```typescript
// Compare Drive files with database records
const driveFiles = await listFilesFromDrive(folderId);
const dbDocuments = await getDocumentsFromDatabase(tenantId);

// Detect new files
const newFiles = driveFiles.filter(
  f => !dbDocuments.find(d => d.google_file_id === f.id)
);

// Detect updated files
const updatedFiles = driveFiles.filter(
  f => {
    const doc = dbDocuments.find(d => d.google_file_id === f.id);
    return doc && new Date(f.modifiedTime) > doc.last_synced_at;
  }
);

// Detect deleted files
const deletedFiles = dbDocuments.filter(
  d => !driveFiles.find(f => f.id === d.google_file_id)
);
```

#### 2. Webhook Mode (Optional)

Real-time notifications from Google Drive.

**Setup Webhook Channel**:
```typescript
// Use Google Drive API
const response = await drive.files.watch({
  fileId: folderId,
  requestBody: {
    id: `tenant-${tenantId}`,
    type: 'web_hook',
    address: 'https://yourdomain.com/api/google-drive/webhook',
    token: `tenant-${tenantId}`,
    expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  },
});

// Store channel info
await saveWebhookChannel(tenantId, {
  channelId: response.data.id,
  resourceId: response.data.resourceId,
  expiration: response.data.expiration,
});
```

**Webhook Handler**:
```typescript
// app/api/google-drive/webhook/route.ts
export async function POST(request: Request) {
  const channelId = request.headers.get('x-goog-channel-id');
  const resourceState = request.headers.get('x-goog-resource-state');
  const token = request.headers.get('x-goog-channel-token');
  
  if (resourceState === 'change') {
    const tenantId = extractTenantIdFromToken(token);
    
    // Trigger sync
    await inngest.send({
      name: 'google-drive/sync',
      data: { tenantId }
    });
  }
  
  return new Response('OK', { status: 200 });
}
```

### Inngest Functions

#### syncTenantDrive Function

```typescript
// inngest/functions.ts
export const syncTenantDrive = inngest.createFunction(
  { id: 'sync-tenant-drive', retries: 2 },
  { event: 'google-drive/sync' },
  async ({ event, step }) => {
    const { tenantId } = event.data;
    
    // Get folder ID
    const tenant = await step.run('get-tenant', async () => {
      return getTenant(tenantId);
    });
    
    // List files from Google Drive
    const driveFiles = await step.run('list-drive-files', async () => {
      return listFilesFromDrive(tenant.google_drive_folder_id, tenantId);
    });
    
    // Get database documents
    const dbDocs = await step.run('get-db-docs', async () => {
      return getDocuments(tenantId);
    });
    
    // Detect changes
    const changes = detectChanges(driveFiles, dbDocs);
    
    // Trigger appropriate handlers
    for (const newFile of changes.new) {
      await inngest.send({
        name: 'google-drive/file.new',
        data: { tenantId, fileId: newFile.id }
      });
    }
    
    for (const updated of changes.updated) {
      await inngest.send({
        name: 'google-drive/file.updated',
        data: { tenantId, fileId: updated.id, documentId: updated.documentId }
      });
    }
    
    for (const deleted of changes.deleted) {
      await inngest.send({
        name: 'google-drive/file.deleted',
        data: { tenantId, documentId: deleted.id }
      });
    }
    
    return { 
      filesChecked: driveFiles.length,
      newFiles: changes.new.length,
      updated: changes.updated.length,
      deleted: changes.deleted.length
    };
  }
);
```

#### Change Handler Functions

```typescript
// Handle new file
export const handleNewFile = inngest.createFunction(
  { id: 'handle-new-file', retries: 3 },
  { event: 'google-drive/file.new' },
  async ({ event, step }) => {
    const { tenantId, fileId } = event.data;
    
    // Log to sync_logs
    await step.run('log-new-file', async () => {
      return logSyncAction(tenantId, 'create', 'started', { fileId });
    });
    
    // Trigger ingestion
    await step.run('trigger-ingest', async () => {
      return inngest.send({
        name: 'document/ingest',
        data: { tenantId, fileId }
      });
    });
  }
);

// Handle updated file
export const handleUpdatedFile = inngest.createFunction(
  { id: 'handle-updated-file', retries: 3 },
  { event: 'google-drive/file.updated' },
  async ({ event, step }) => {
    const { tenantId, fileId, documentId } = event.data;
    
    // Trigger re-ingestion (creates new version)
    await inngest.send({
      name: 'document/ingest',
      data: { tenantId, fileId, documentId }
    });
  }
);

// Handle deleted file
export const handleDeletedFile = inngest.createFunction(
  { id: 'handle-deleted-file', retries: 1 },
  { event: 'google-drive/file.deleted' },
  async ({ event, step }) => {
    const { tenantId, documentId } = event.data;
    
    // Archive document
    await step.run('archive-document', async () => {
      return archiveDocument(documentId);
    });
  }
);
```

### Manual Sync Trigger

```typescript
// app/api/google-drive/sync/route.ts
export async function POST(request: Request) {
  const { tenantId } = await request.json();
  
  // Validate tenant has Google Drive connected
  const tenant = await getTenant(tenantId);
  if (!tenant.google_drive_folder_id) {
    return NextResponse.json(
      { error: 'Google Drive not configured' },
      { status: 400 }
    );
  }
  
  // Trigger sync
  const eventId = await inngest.send({
    name: 'google-drive/sync',
    data: { tenantId }
  });
  
  return NextResponse.json({
    success: true,
    message: 'Sync job triggered',
    eventId,
    tenantId,
    folderId: tenant.google_drive_folder_id
  });
}
```

### Monitoring Sync Status

```typescript
// Query sync logs
SELECT 
  action,
  status,
  details,
  duration_ms,
  created_at
FROM sync_logs
WHERE tenant_id = '<tenant-id>'
  AND action = 'sync'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Document Ingestion Pipeline

### Overview

The ingestion pipeline processes files from Google Drive and saves them as DRAFT documents.

### Pipeline Steps

```
1. Get File Metadata
   ↓
2. Download File
   ↓
3. Calculate Hash (duplicate detection)
   ↓
4. Parse Document (LlamaParse or fallback)
   ↓
5. Redact PII (regex or Presidio)
   ↓
6. Auto-Tag Categories (keyword or ML)
   ↓
7. Save as DRAFT
   ↓
8. Log Success
```

### Implementation

```typescript
// inngest/ingestion.ts
export const ingestDocument = inngest.createFunction(
  { id: 'ingest-document', retries: 2 },
  { event: 'document/ingest' },
  async ({ event, step }) => {
    const { tenantId, fileId, documentId } = event.data;
    
    // Step 1: Get file metadata
    const fileMetadata = await step.run('get-metadata', async () => {
      return getFileMetadata(fileId, tenantId);
    });
    
    // Step 2: Download file
    const fileBuffer = await step.run('download-file', async () => {
      return downloadFile(fileId, tenantId);
    });
    
    // Step 3: Calculate hash
    const contentHash = await step.run('calculate-hash', async () => {
      return calculateSHA256(fileBuffer);
    });
    
    // Step 4: Check duplicate
    const existingVersion = await step.run('check-duplicate', async () => {
      return findVersionByHash(tenantId, contentHash);
    });
    
    if (existingVersion) {
      return { skipped: true, reason: 'Duplicate content' };
    }
    
    // Step 5: Parse document
    const parsedContent = await step.run('parse-document', async () => {
      return parseDocument(fileBuffer, fileMetadata.mimeType);
    });
    
    // Step 6: Redact PII
    const { redacted, stats } = await step.run('redact-pii', async () => {
      return redactPII(parsedContent);
    });
    
    // Step 7: Auto-tag categories
    const suggestedCategories = await step.run('suggest-categories', async () => {
      return suggestCategories(tenantId, redacted);
    });
    
    // Step 8: Save as DRAFT
    const result = await step.run('save-draft', async () => {
      return saveDraftDocument(tenantId, {
        googleFileId: fileId,
        title: fileMetadata.name,
        content: redacted,
        contentHash,
        wordCount: countWords(redacted),
        piiStats: stats,
        categories: suggestedCategories,
        documentId, // If updating
      });
    });
    
    // Step 9: Log success
    await step.run('log-success', async () => {
      return logSyncAction(tenantId, documentId ? 'update' : 'create', 'success', {
        documentId: result.documentId,
        versionId: result.versionId,
        wordCount: result.wordCount,
        categories: suggestedCategories.map(c => c.name)
      });
    });
    
    return result;
  }
);
```

### Document Parsing

#### LlamaParse Integration

```typescript
// utils/llamaparse.ts
export async function parseWithLlamaParse(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), 'document');
  formData.append('output_format', 'markdown');
  
  const response = await fetch(process.env.LLAMAPARSE_API_URL!, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LLAMAPARSE_API_KEY}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`LlamaParse failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.markdown;
}
```

#### Fallback Parser

```typescript
// Simple text extraction for fallback
export function simpleParse(fileBuffer: Buffer, mimeType: string): string {
  if (mimeType.includes('text/plain')) {
    return fileBuffer.toString('utf-8');
  }
  
  // For PDFs, use pdf-parse library
  if (mimeType.includes('pdf')) {
    return extractPDFText(fileBuffer);
  }
  
  // For DOCX, use mammoth library
  if (mimeType.includes('document')) {
    return extractDOCXText(fileBuffer);
  }
  
  throw new Error(`Unsupported file type: ${mimeType}`);
}
```

### PII Redaction

#### Regex-Based Redaction

```typescript
// utils/pii-redaction.ts
export function redactPII(text: string) {
  let redacted = text;
  const stats = {
    emailsFound: 0,
    phonesFound: 0,
    ssnFound: 0,
    creditCardsFound: 0
  };
  
  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];
  stats.emailsFound = emails.length;
  redacted = redacted.replace(emailRegex, '[EMAIL_REDACTED]');
  
  // Phone numbers (various formats)
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex) || [];
  stats.phonesFound = phones.length;
  redacted = redacted.replace(phoneRegex, '[PHONE_REDACTED]');
  
  // SSN (XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  const ssns = text.match(ssnRegex) || [];
  stats.ssnFound = ssns.length;
  redacted = redacted.replace(ssnRegex, '[SSN_REDACTED]');
  
  // Credit cards (simplified)
  const ccRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  const ccs = text.match(ccRegex) || [];
  stats.creditCardsFound = ccs.length;
  redacted = redacted.replace(ccRegex, '[CC_REDACTED]');
  
  return { 
    redacted, 
    stats,
    piiRedacted: Object.values(stats).some(count => count > 0)
  };
}
```

#### Presidio Integration (Optional)

```typescript
// Advanced PII detection with Microsoft Presidio
export async function redactWithPresidio(text: string) {
  const response = await fetch(`${process.env.PRESIDIO_API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      language: 'en',
      entities: ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 'US_SSN']
    })
  });
  
  const entities = await response.json();
  
  // Anonymize detected entities
  const anonymizeResponse = await fetch(`${process.env.PRESIDIO_API_URL}/anonymize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      analyzer_results: entities
    })
  });
  
  const result = await anonymizeResponse.json();
  return result.text;
}
```

### Auto-Tagging Categories

#### Keyword-Based Tagging

```typescript
// utils/ml-tagging.ts
const CATEGORY_KEYWORDS = {
  'Billing': ['invoice', 'payment', 'refund', 'charge', 'billing'],
  'Support': ['ticket', 'issue', 'problem', 'help', 'support'],
  'Technical': ['error', 'bug', 'code', 'API', 'technical'],
  'Policy': ['policy', 'guideline', 'procedure', 'rule', 'compliance']
};

export function suggestCategories(tenantId: string, text: string) {
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = keywords.reduce((score, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      return score + (matches?.length || 0);
    }, 0);
  }
  
  // Return top 3 categories
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => ({ name }));
}
```

#### OpenAI-Based Tagging (Optional)

```typescript
// Advanced tagging with OpenAI
export async function suggestCategoriesWithAI(text: string, tenantCategories: string[]) {
  const prompt = `Categorize this document into these categories: ${tenantCategories.join(', ')}.
  
Document:
${text.substring(0, 1000)}

Return top 3 matching categories as JSON array.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Duplicate Detection

```typescript
// Check if content hash exists
async function findVersionByHash(tenantId: string, contentHash: string) {
  const { data } = await supabase
    .from('document_versions')
    .select('id, document_id, version_number')
    .eq('content_hash', contentHash)
    .eq('tenant_id', tenantId)
    .single();
  
  return data;
}
```

---

## Vector Indexing System

### Overview

When documents are approved, they are chunked, embedded, and indexed into Pinecone for semantic search.

### Setup

```env
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=knowbot-kms
```

### Indexing Pipeline

```
Approved Document
   ↓
Fetch Content
   ↓
Chunk Markdown (512 tokens)
   ↓
Generate Embeddings (OpenAI)
   ↓
Prepare Vectors with Metadata
   ↓
Upsert to Pinecone (batches of 100)
   ↓
Update chunk_count
```

### Implementation

```typescript
// inngest/indexing.ts
export const indexDocument = inngest.createFunction(
  { id: 'index-document', retries: 2 },
  { event: 'document/index' },
  async ({ event, step }) => {
    const { tenantId, documentId, documentVersionId, title } = event.data;
    
    // Fetch document version content
    const version = await step.run('fetch-version', async () => {
      return getDocumentVersion(documentVersionId);
    });
    
    // Delete old vectors (if re-indexing)
    await step.run('delete-old-vectors', async () => {
      return deleteDocumentVersionVectors(tenantId, documentVersionId);
    });
    
    // Chunk markdown
    const chunks = await step.run('chunk-content', async () => {
      return chunkMarkdown(version.parsed_markdown);
    });
    
    // Fetch categories for metadata
    const categories = await step.run('fetch-categories', async () => {
      return getVersionCategories(documentVersionId);
    });
    
    // Generate embeddings
    const embeddings = await step.run('generate-embeddings', async () => {
      const chunkTexts = chunks.map(c => c.text);
      return generateEmbeddings(chunkTexts);
    });
    
    // Prepare vectors
    const vectors = chunks.map((chunk, idx) => ({
      id: `${documentVersionId}_chunk_${idx}`,
      values: embeddings[idx],
      metadata: {
        document_id: documentId,
        document_version_id: documentVersionId,
        document_title: title,
        document_status: 'LIVE',
        chunk_index: idx,
        chunk_text: chunk.text,
        categories: categories.map(c => c.name),
        created_at: new Date().toISOString()
      }
    }));
    
    // Upsert in batches
    await step.run('upsert-vectors', async () => {
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await upsertVectors(tenantId, batch);
      }
    });
    
    // Update chunk_count
    await step.run('update-chunk-count', async () => {
      return updateVersionChunkCount(documentVersionId, chunks.length);
    });
    
    return { 
      documentVersionId, 
      chunksIndexed: chunks.length 
    };
  }
);
```

### Markdown Chunking

```typescript
// utils/chunking.ts
export function chunkMarkdown(markdown: string) {
  const TARGET_TOKENS = 512;
  const MAX_TOKENS = 1024;
  const OVERLAP_TOKENS = 50;
  
  const chunks: Array<{ text: string; tokens: number }> = [];
  
  // Split by headers first
  const sections = markdown.split(/^#{1,6}\s+/gm);
  
  for (const section of sections) {
    if (estimateTokens(section) <= MAX_TOKENS) {
      chunks.push({
        text: section.trim(),
        tokens: estimateTokens(section)
      });
    } else {
      // Split large sections by paragraphs
      const paragraphs = section.split(/\n\n+/);
      let currentChunk = '';
      
      for (const para of paragraphs) {
        if (estimateTokens(currentChunk + para) <= TARGET_TOKENS) {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        } else {
          if (currentChunk) {
            chunks.push({
              text: currentChunk.trim(),
              tokens: estimateTokens(currentChunk)
            });
          }
          currentChunk = para;
        }
      }
      
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: estimateTokens(currentChunk)
        });
      }
    }
  }
  
  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

### Embedding Generation

```typescript
// utils/embeddings.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  });
  
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
      dimensions: 1536
    });
    
    embeddings.push(...response.data.map(d => d.embedding));
    
    // Rate limiting: wait 1s between batches
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return embeddings;
}
```

### Pinecone Operations

```typescript
// utils/pinecone/server.ts
export async function upsertVectors(
  tenantId: string,
  vectors: Vector[]
) {
  validateTenantId(tenantId);
  const namespace = getNamespace(tenantId);
  
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
  return await index.namespace(namespace).upsert(vectors);
}

export async function deleteDocumentVersionVectors(
  tenantId: string,
  documentVersionId: string
) {
  validateTenantId(tenantId);
  const namespace = getNamespace(tenantId);
  
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
  return await index.namespace(namespace).deleteMany({
    filter: { document_version_id: { $eq: documentVersionId } }
  });
}
```

---

## Approval Workflow

### Overview

Documents move through states: DRAFT → REVIEW → LIVE → ARCHIVED

### Workflow States

```
DRAFT
  ↓ Manager reviews
REVIEW (optional)
  ↓ Manager approves
LIVE (indexed in Pinecone)
  ↓ New version or delete
ARCHIVED (vectors removed)
```

### API Endpoints

#### POST /api/documents/[id]/approve

Approve a DRAFT document.

**Body**:
```json
{
  "comment": "Approved for publishing"
}
```

**Process**:
1. Validate document is DRAFT
2. Archive previous LIVE version
3. Update current version to LIVE
4. Record approval in document_approvals
5. Trigger vector indexing
6. Log to sync_logs

#### POST /api/documents/[id]/reject

Reject a DRAFT document.

**Body**:
```json
{
  "reason": "Incorrect information",
  "archive": false
}
```

**Process**:
1. Record rejection in document_approvals
2. Optionally archive document
3. Log to sync_logs

### UI Components

```typescript
// components/documents/ApprovalActions.tsx
export default function ApprovalActions({ 
  document,
  onApproved,
  onRejected 
}: Props) {
  const [comment, setComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const approve = async () => {
    const response = await fetch(`/api/documents/${document.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment })
    });
    
    if (response.ok) {
      onApproved();
    }
  };
  
  const reject = async () => {
    const response = await fetch(`/api/documents/${document.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason, archive: false })
    });
    
    if (response.ok) {
      onRejected();
      setShowRejectModal(false);
    }
  };
  
  if (document.current_status !== 'DRAFT') {
    return null; // Only show for DRAFT documents
  }
  
  return (
    <div>
      <textarea
        placeholder="Optional comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button onClick={approve}>Approve & Publish</button>
      <button onClick={() => setShowRejectModal(true)}>Reject</button>
      
      {showRejectModal && (
        <Modal onClose={() => setShowRejectModal(false)}>
          <h3>Reject Document</h3>
          <textarea
            placeholder="Reason for rejection (required)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <button onClick={reject} disabled={!rejectReason}>
            Confirm Rejection
          </button>
        </Modal>
      )}
    </div>
  );
}
```

---

## Query Engine (Stage 5)

**Status**: Implemented (API + Hybrid Retrieval + Guardrails)

### Architecture Overview

```
User Query
   ↓
Generate Query Embedding
   ↓
Search Pinecone (semantic)
   ↓
Keyword Search (PostgreSQL)
   ↓
Combine Results (hybrid)
   ↓
Check Similarity Threshold (>0.75)
   ↓
If Pass: Generate LLM Answer
   ↓
If Fail: Return NO_DATA + Log Gap
```

### Key Components

1. **Hybrid Retrieval**
   - Semantic search via Pinecone (tenant namespace + `document_status = LIVE`)
   - Keyword search via Postgres full‑text search (`search_vector` on `document_versions`)
   - Results merged with weighted blending (default 0.7 semantic / 0.3 keyword)

2. **Silence Protocol**
   - Default minimum score `0.75`
   - Below threshold returns `NO_DATA`

3. **Context‑Only LLM Answers**
   - Model: `gpt-4o-mini`
   - Strict prompt enforces “context only” and citations

4. **Time Machine Support**
   - Optional `asOf` parameter filters results using `effective_date_epoch`

5. **Knowledge Gap Logging**
   - `knowledge_gaps` table insert on `NO_DATA`

### Implementation Pointers

- API endpoint: `POST /api/query`
- Backfill reindex: `POST /api/reindex` (reindex LIVE versions)
- Apply database changes: `supabase/Stage5_Query.sql`
- Pinecone metadata fields:
  - `document_title`, `document_status`, `effective_date_epoch`, `heading_context`
- Postgres search columns:
  - `document_versions.search_text`
  - `document_versions.search_vector` (GIN indexed)

---

## Implementation Logs

### Stage 4 Implementation (December 2024 - January 2025)

**Completed Features**:
- ✅ Document list API with filtering
- ✅ Approval/rejection endpoints
- ✅ Vector indexing pipeline
- ✅ Document viewer UI
- ✅ Approval interface
- ✅ Status management

**Files Created**:
- `utils/embeddings.ts`
- `utils/chunking.ts`
- `inngest/indexing.ts`
- `app/api/documents/route.ts`
- `app/api/documents/[id]/route.ts`
- `app/api/documents/[id]/approve/route.ts`
- `app/api/documents/[id]/reject/route.ts`
- `components/documents/*.tsx`
- `app/documents/page.tsx`
- `app/documents/[id]/page.tsx`

**Dependencies Added**:
```json
{
  "openai": "^4.20.0",
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0"
}
```

---

*For testing procedures, see `04-TESTING.md`*
*For API reference, see `05-API-REFERENCE.md`*
