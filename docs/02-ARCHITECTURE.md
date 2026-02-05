# Architecture Guide

This document provides a detailed overview of the IKMS system architecture, component interactions, and design patterns.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Security Model](#security-model)
6. [Integration Architecture](#integration-architecture)
7. [Feature Addition Patterns](#feature-addition-patterns)

---

## System Overview

IKMS follows a **serverless architecture** using Next.js with a clear separation between:
- **Frontend**: React components with Server-Side Rendering
- **API Layer**: Next.js API routes (serverless functions)
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Vector DB**: Pinecone with namespace isolation
- **Background Jobs**: Inngest for async operations

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Agent View   │  │ Admin View   │  │ Manager View │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          │    HTTPS/REST API Calls             │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Application                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Routes Layer                       │  │
│  │  /api/documents  /api/google-drive  /api/pinecone       │  │
│  └──────────┬───────────────┬───────────────┬───────────────┘  │
│             │               │               │                   │
│  ┌──────────▼───────┐ ┌────▼─────┐ ┌───────▼──────┐          │
│  │ Auth Context     │ │ Utilities │ │ Components   │          │
│  └──────────────────┘ └──────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│   Supabase       │  │   Pinecone   │  │   Inngest        │
│  (PostgreSQL)    │  │  (Vectors)   │  │ (Job Queue)      │
│                  │  │              │  │                  │
│ • tenants        │  │ • Namespaces │  │ • sync           │
│ • documents      │  │ • Embeddings │  │ • ingest         │
│ • versions       │  │ • Queries    │  │ • index          │
└──────────────────┘  └──────────────┘  └──────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Google     │  │  OpenAI    │  │ LlamaParse │           │
│  │ Drive API  │  │ Embeddings │  │  Parsing   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Architecture

IKMS is designed for **strict multi-tenant isolation** at every layer.

### Tenant Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                      Tenant A                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Database    │  │   Pinecone   │  │ Google Drive │    │
│  │  (RLS)       │  │  Namespace   │  │   Folder     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Tenant B                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Database    │  │   Pinecone   │  │ Google Drive │    │
│  │  (RLS)       │  │  Namespace   │  │   Folder     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Isolation Layers

#### 1. Database Layer (Supabase RLS)
- Every table has a `tenant_id` column
- Row-Level Security policies enforce:
  ```sql
  -- Users can only see their tenant's data
  CREATE POLICY "Tenant isolation" ON documents
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
  ```
- JWT token contains `tenant_id` claim
- Server-side queries automatically scoped

#### 2. Vector Database Layer (Pinecone)
- Each tenant = unique namespace
- Namespace = `tenant_id` (UUID)
- All operations scoped to namespace:
  ```typescript
  // Automatic namespace isolation
  await upsertVectors(tenantId, vectors);
  // → Upserts to namespace: tenant_id
  ```
- Impossible to query across namespaces

#### 3. Application Layer
- `tenant_id` validated from JWT, never from request body
- All API routes check tenant membership
- Client cannot spoof tenant_id

#### 4. File Storage Layer (Google Drive)
- Each tenant connects their own Google account
- Tokens stored per tenant
- Folder selection per tenant
- No cross-tenant file access

---

## Core Components

### 1. Authentication System

**Location**: `contexts/AuthContext.tsx`, `utils/supabase/`

**Flow**:
```
User Login → Supabase Auth → JWT Token (with tenant_id)
                                ↓
                         Session Cookie (httpOnly)
                                ↓
                    API Routes Validate Session
                                ↓
                       Extract tenant_id from JWT
```

**Key Features**:
- Magic link + password authentication
- Session management via cookies
- Protected routes via middleware
- Automatic session refresh

### 2. Database Layer (Supabase)

**Schema Structure**:
```
tenants (root level)
  └─ documents
       └─ document_versions
            └─ document_version_categories
                 └─ document_categories
            └─ document_approvals
  └─ google_oauth_tokens
  └─ sync_logs
  └─ knowledge_gaps
```

**Key Tables**:

**tenants**
- Organization metadata
- Google Drive folder ID
- Settings (JSONB)

**documents**
- Google file ID
- Current status (DRAFT/REVIEW/LIVE/ARCHIVED)
- Link to current version

**document_versions**
- Version number (auto-incremented)
- Parsed markdown content
- PII redaction stats
- Word count, chunk count

**document_approvals**
- Approval/rejection history
- Who, when, why
- Comments

### 3. Vector Database (Pinecone)

**Structure**:
```
Index: knowbot-kms (1536 dimensions, cosine metric)
  └─ Namespace: <tenant_id_1>
       └─ Vector: chunk_1 { metadata }
       └─ Vector: chunk_2 { metadata }
  └─ Namespace: <tenant_id_2>
       └─ Vector: chunk_1 { metadata }
```

**Vector Metadata**:
```typescript
{
  document_id: string,
  document_version_id: string,
  chunk_index: number,
  chunk_text: string,
  document_title: string,
  document_status: 'LIVE' | 'ARCHIVED',
  categories: string[],
  created_at: string
}
```

**Namespace Wrapper**:
```typescript
// utils/pinecone/server.ts
export async function upsertVectors(
  tenantId: string,
  vectors: Vector[]
) {
  // Validates tenant_id (UUID format)
  // Converts to namespace
  // Enforces isolation
  const namespace = getNamespace(tenantId);
  return index.namespace(namespace).upsert(vectors);
}
```

### 4. Background Jobs (Inngest)

**Job Types**:

**Sync Jobs**:
- `periodicSync` - Runs every 5 minutes
- `syncTenantDrive` - Syncs one tenant's folder
- `handleNewFile` - New file detected
- `handleUpdatedFile` - File modified
- `handleDeletedFile` - File removed

**Processing Jobs**:
- `ingestDocument` - Download → Parse → Redact → Save
- `indexDocument` - Chunk → Embed → Upsert to Pinecone

**Job Flow**:
```
Trigger (Cron/Event)
    ↓
Inngest receives event
    ↓
Function executes (with retries)
    ↓
Steps run sequentially
    ↓
Success/Failure logged
```

### 5. Integration Layer

**Google Drive Integration**:
```
OAuth 2.0 Flow
    ↓
Store tokens in database
    ↓
Auto-refresh when expired
    ↓
List/download files via Drive API
    ↓
Webhook notifications (optional)
```

**OpenAI Integration**:
```
Parsed markdown text
    ↓
Chunk into 512-token segments
    ↓
Generate embeddings (text-embedding-3-small)
    ↓
Return 1536-dimension vectors
```

**LlamaParse Integration**:
```
PDF/DOCX file
    ↓
Upload to LlamaParse API
    ↓
Parse with table extraction
    ↓
Return structured markdown
    ↓
Fallback to simple extraction if fails
```

---

## Data Flow

### Document Lifecycle

```
1. Google Drive Sync
   ↓
   File detected → Sync Watcher
   ↓
2. Ingestion Pipeline
   ↓
   Download → Parse → Redact → Save as DRAFT
   ↓
3. Approval Workflow
   ↓
   Manager reviews → Approve/Reject
   ↓
4. Vector Indexing (if approved)
   ↓
   Chunk → Embed → Upsert to Pinecone → Status: LIVE
   ↓
5. Query Engine (Stage 5)
   ↓
   User query → Search vectors → LLM answer
```

### Detailed Flow: Document Ingestion

```
┌──────────────────────────────────────────────────────────┐
│ 1. Sync Watcher detects new file in Google Drive        │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Inngest event: document/ingest                        │
│    Data: { tenantId, fileId }                            │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Get file metadata from Google Drive                  │
│    • Name, size, MIME type, modified time               │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Download file content as buffer                      │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Calculate SHA-256 content hash                       │
│    • For duplicate detection                             │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 6. Check if hash exists in database                     │
│    If duplicate → Skip ingestion                         │
└────────────────┬─────────────────────────────────────────┘
                 │ Not duplicate
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 7. Parse document                                        │
│    • PDF/DOCX: LlamaParse API                           │
│    • Text: Direct extraction                             │
│    • Fallback: Simple extraction                         │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 8. PII Redaction                                         │
│    • Scan for: emails, phones, SSN, credit cards        │
│    • Replace with [TYPE_REDACTED]                       │
│    • Track stats: { emails_found: 2, phones_found: 1 }  │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 9. Auto-categorize content                              │
│    • Keyword matching against category definitions      │
│    • Return top 3 suggested categories                  │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 10. Save to database                                     │
│     • Create document record (status: DRAFT)            │
│     • Create document_version (v1)                      │
│     • Link suggested categories                         │
│     • Store parsed markdown (redacted)                  │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 11. Log to sync_logs                                     │
│     • Action: 'create'                                   │
│     • Status: 'success'                                  │
│     • Details: { word_count, categories, pii_stats }    │
└──────────────────────────────────────────────────────────┘
```

### Detailed Flow: Approval & Indexing

```
┌──────────────────────────────────────────────────────────┐
│ 1. Manager views DRAFT document in UI                   │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Reviews content, categories, PII stats               │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Clicks "Approve" or "Reject"                         │
└────────────────┬─────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼ Approve             ▼ Reject
┌─────────────────┐  ┌─────────────────┐
│ 4a. Update      │  │ 4b. Update      │
│     version     │  │     version     │
│     status:     │  │     status:     │
│     LIVE        │  │     stays DRAFT │
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Archive previous LIVE version (if exists)            │
│    • Old version status → ARCHIVED                      │
│    • Delete old vectors from Pinecone                   │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 6. Trigger indexing event                               │
│    Inngest: document/index                              │
│    Data: { tenantId, documentId, versionId }            │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 7. Fetch document version content                       │
│    • Get parsed_markdown from database                  │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 8. Chunk markdown                                        │
│    • Target: 512 tokens per chunk                       │
│    • Max: 1024 tokens                                   │
│    • Overlap: 50 tokens                                 │
│    • Split by headers → paragraphs → sentences         │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 9. Generate embeddings                                   │
│    • OpenAI: text-embedding-3-small                     │
│    • Input: Each chunk text                             │
│    • Output: 1536-dimension vectors                     │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 10. Prepare vectors with metadata                       │
│     • id: doc_version_id + chunk_index                  │
│     • values: embedding vector                          │
│     • metadata: {                                       │
│         document_id,                                    │
│         document_version_id,                            │
│         chunk_text,                                     │
│         chunk_index,                                    │
│         document_status: 'LIVE',                        │
│         categories: [...]                               │
│       }                                                 │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 11. Upsert to Pinecone                                  │
│     • Namespace: tenant_id                              │
│     • Batch size: 100 vectors                           │
│     • Enforced tenant isolation                         │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│ 12. Update document_version                             │
│     • chunk_count = number of chunks                    │
│     • indexed_at = now()                                │
└──────────────────────────────────────────────────────────┘
```

---

## Security Model

### Authentication Flow

```
1. User enters credentials
   ↓
2. Supabase Auth validates
   ↓
3. JWT token generated with:
   {
     sub: user_id,
     tenant_id: 'xxx-xxx-xxx',
     role: 'authenticated',
     exp: timestamp
   }
   ↓
4. Token stored in httpOnly cookie
   ↓
5. All API requests include cookie
   ↓
6. Middleware validates session
   ↓
7. API routes extract tenant_id from JWT
```

### Authorization Layers

**Layer 1: Route Protection**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

**Layer 2: RLS Policies**
```sql
-- Documents table
CREATE POLICY "Users read own tenant docs"
ON documents FOR SELECT
USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Managers write own tenant docs"
ON documents FOR INSERT
WITH CHECK (
  tenant_id = auth.jwt() ->> 'tenant_id'
  AND auth.jwt() ->> 'role' IN ('manager', 'admin')
);
```

**Layer 3: Application Logic**
```typescript
// API route
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Never trust client-provided tenant_id
  const tenantId = user?.user_metadata?.tenant_id;
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Use validated tenant_id
  const data = await queryDatabase(tenantId);
}
```

### Data Protection

**In Transit**:
- HTTPS for all connections
- httpOnly cookies (prevent XSS)
- CSRF protection via state parameter

**At Rest**:
- Database encryption (Supabase default)
- Token encryption (recommended for production)
- PII redaction before storage

**In Use**:
- Namespace isolation (Pinecone)
- RLS enforcement (Supabase)
- No client-side secrets

---

## Integration Architecture

### Google Drive Integration

**Component Diagram**:
```
┌────────────────────────────────────────────────────┐
│              Google Cloud Platform                 │
│  ┌──────────────┐         ┌──────────────┐       │
│  │  OAuth 2.0   │         │  Drive API   │       │
│  │  Endpoint    │         │              │       │
│  └──────┬───────┘         └──────┬───────┘       │
└─────────┼──────────────────────────┼──────────────┘
          │                          │
          │ 1. Auth Flow             │ 2. File Operations
          ▼                          ▼
┌────────────────────────────────────────────────────┐
│                  IKMS Application                  │
│  ┌──────────────────────────────────────────────┐ │
│  │         Google OAuth Module                  │ │
│  │  • Store/refresh tokens                      │ │
│  │  • Token validation                          │ │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │        Google Drive Utilities                │ │
│  │  • List files/folders                        │ │
│  │  • Download files                            │ │
│  │  • Watch for changes                         │ │
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────┐
│               Supabase Database                    │
│  google_oauth_tokens table                        │
└────────────────────────────────────────────────────┘
```

**OAuth Flow**:
1. User clicks "Connect Google Drive"
2. Redirect to Google OAuth with state parameter
3. User grants permissions
4. Google redirects back with code
5. Exchange code for tokens
6. Store tokens in database (per tenant)
7. Auto-refresh tokens when expired

### Pinecone Integration

**Namespace Isolation**:
```typescript
// Every operation is scoped to tenant namespace
class PineconeWrapper {
  async upsert(tenantId: string, vectors: Vector[]) {
    validateTenantId(tenantId);
    const namespace = getNamespace(tenantId);
    return this.index.namespace(namespace).upsert(vectors);
  }
  
  async query(tenantId: string, vector: number[]) {
    validateTenantId(tenantId);
    const namespace = getNamespace(tenantId);
    return this.index.namespace(namespace).query({ vector });
  }
}
```

### Inngest Integration

**Event-Driven Architecture**:
```typescript
// Define events
type Events = {
  'google-drive/file.new': { tenantId: string; fileId: string };
  'document/ingest': { tenantId: string; fileId: string };
  'document/index': { tenantId: string; documentVersionId: string };
};

// Subscribe to events
inngest.createFunction(
  { id: 'ingest-document', retries: 3 },
  { event: 'document/ingest' },
  async ({ event, step }) => {
    // Step-by-step execution with retries
  }
);

// Send events
await inngest.send({
  name: 'document/ingest',
  data: { tenantId, fileId }
});
```

---

## Feature Addition Patterns

### Safe Feature Addition Guidelines

#### ✅ **Safe to Modify**
- `app/dashboard/page.tsx` - Add new UI sections
- `components/*` - Create new components
- `app/api/*` - Create new API routes
- Styling - Enhance appearance
- `supabase/*` - Add new tables/migrations

#### ❌ **Do Not Modify (Core Components)**
- `contexts/AuthContext.tsx` - Authentication
- `utils/supabase/*` - Database clients
- `lib/google-oauth.ts` - OAuth core
- `lib/pinecone.ts` - Vector DB client
- `lib/inngest.ts` - Job queue
- `inngest/functions.ts` - Sync logic
- `inngest/ingestion.ts` - Ingestion pipeline
- `inngest/indexing.ts` - Vector indexing

### Pattern 1: Adding a New Dashboard Section

```typescript
// app/dashboard/page.tsx
export default function Dashboard() {
  const tenantId = getTenantId();
  
  return (
    <main>
      {/* Existing sections - DON'T MODIFY */}
      <GoogleDriveSection />
      
      {/* NEW FEATURE - Safe to add */}
      <NewFeatureSection tenantId={tenantId} />
    </main>
  );
}
```

### Pattern 2: Creating a New API Route

```typescript
// app/api/new-feature/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 1. Always authenticate first
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Get tenant_id from user, never from request
    const tenantId = user.user_metadata?.tenant_id;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant association' },
        { status: 403 }
      );
    }
    
    // 3. Your feature logic
    const data = await yourFeatureFunction(tenantId);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[New Feature] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Adding a New Database Table

```sql
-- supabase/NewFeature.sql

-- 1. Create table with tenant_id
CREATE TABLE new_feature_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Your columns
  data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE new_feature_data ENABLE ROW LEVEL SECURITY;

-- 3. Add policies
CREATE POLICY "Users can view their tenant's data"
  ON new_feature_data FOR SELECT
  USING (tenant_id IN (
    SELECT id FROM tenants 
    WHERE id = (auth.jwt() ->> 'tenant_id')::uuid
  ));

CREATE POLICY "Managers can insert their tenant's data"
  ON new_feature_data FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND auth.jwt() ->> 'role' IN ('manager', 'admin')
  );

-- 4. Add trigger for updated_at
CREATE TRIGGER update_new_feature_data_updated_at
  BEFORE UPDATE ON new_feature_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Pattern 4: Creating a New Component

```typescript
// components/NewFeature.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NewFeatureProps {
  tenantId: string;
}

export default function NewFeature({ tenantId }: NewFeatureProps) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/new-feature?tenantId=${tenantId}`
        );
        const result = await response.json();
        setData(result.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [tenantId]);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">New Feature</h2>
      {/* Your component content */}
    </div>
  );
}
```

---

## Performance Considerations

### Database Optimization
- Indexed columns: `tenant_id`, `google_file_id`, `current_status`
- Connection pooling via Supabase
- Prepared statements for common queries
- RLS policies optimized for performance

### Vector Search Optimization
- Namespace isolation (no cross-tenant scanning)
- Metadata filtering before semantic search
- Top-K limits (default: 10 results)
- Cosine similarity metric (fast computation)

### Background Job Optimization
- Batched vector upserts (100 per batch)
- Parallel chunk embedding generation
- Rate limiting for external APIs
- Exponential backoff for retries

### Caching Strategy (Future)
- Query result caching (Redis)
- Frequently accessed documents
- Category metadata
- User permissions

---

## Monitoring & Observability

### Logging Strategy
- **Database**: All operations logged to `sync_logs`
- **Inngest**: Function runs visible in dashboard
- **API**: Console logs for errors
- **Client**: Error boundaries for crashes

### Key Metrics to Track
- Document ingestion success rate
- Sync frequency and latency
- Vector indexing time
- Query response time
- API error rates

---

## Scalability Considerations

### Current Capacity
- **Tenants**: Unlimited (namespace isolation)
- **Documents per tenant**: 10,000+
- **Vectors per namespace**: 1M+
- **Concurrent users**: 100+ per tenant

### Bottlenecks & Solutions
- **Ingestion**: Parallel processing via Inngest
- **Embeddings**: Batch API calls to OpenAI
- **Database**: Connection pooling + indexes
- **Vector search**: Metadata filtering first

---

*For implementation details, see `03-DEVELOPMENT-GUIDE.md`*
*For testing architecture, see `04-TESTING.md`*
