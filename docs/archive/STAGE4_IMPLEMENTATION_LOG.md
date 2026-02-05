# Stage 4 Implementation Log

## Overview
Stage 4 adds two major features:
1. **Approval Interface** - UI for reviewing DRAFT documents and approving/rejecting them
2. **Vector Indexing** - When documents become LIVE, index them into Pinecone for semantic search

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Core utilities (embeddings, chunking) |
| Phase 2 | ✅ Complete | Inngest indexing function |
| Phase 3 | ✅ Complete | API endpoints |
| Phase 4 | ✅ Complete | UI components and list page |
| Phase 5 | ✅ Complete | Document detail and approval UI |
| TypeScript Fixes | ✅ Complete | All Stage 4 files pass type check |

---

## Files Created

### 1. Dependencies Added
```bash
npm install openai react-markdown remark-gfm
```
Added to `package.json`:
- `openai` - For embedding generation
- `react-markdown` - For rendering markdown content
- `remark-gfm` - GitHub Flavored Markdown support

### 2. Utility Files

#### `utils/embeddings.ts` (NEW)
OpenAI embedding generation utility:
- Uses `text-embedding-3-small` model (1536 dimensions)
- `generateEmbedding(text)` - Single text embedding
- `generateEmbeddings(texts)` - Batch embedding with rate limiting
- `cosineSimilarity(a, b)` - Helper for similarity calculation
- Handles rate limiting with exponential backoff

#### `utils/chunking.ts` (NEW)
Markdown chunking utility:
- Target: 512 tokens per chunk
- Max: 1024 tokens
- Overlap: 50 tokens between chunks
- `chunkMarkdown(markdown)` - Main chunking function
- `estimateTokens(text)` - Token estimation
- `getChunkStats(chunks)` - Statistics helper
- Splits by headers first, then paragraphs, then sentences

### 3. Inngest Functions

#### `lib/inngest.ts` (MODIFIED)
Added new event type:
```typescript
'document/index': {
  name: 'document/index',
  data: {
    tenantId: 'string',
    documentId: 'string',
    documentVersionId: 'string',
    title: 'string',
  },
}
```

#### `inngest/indexing.ts` (NEW)
Document indexing pipeline:
- Fetches document version content
- Deletes old vectors (for re-indexing)
- Chunks markdown content
- Fetches categories for metadata
- Generates embeddings for all chunks
- Upserts vectors to Pinecone in batches of 100
- Updates document version with chunk count
- Logs success to sync_logs

#### `app/api/inngest/route.ts` (MODIFIED)
Added import and registration:
```typescript
import { indexDocument } from '@/inngest/indexing';
// ... in functions array:
indexDocument,
```

### 4. API Endpoints

#### `app/api/documents/route.ts` (NEW)
GET /api/documents - List documents with filtering
- Query params: `status`, `page`, `limit`, `search`
- Returns documents with current_version details
- Pagination metadata included

#### `app/api/documents/[id]/route.ts` (NEW)
GET /api/documents/[id] - Get single document
- Returns full document with:
  - Current version (including parsed_markdown)
  - Categories
  - All versions history
  - Approval history

#### `app/api/documents/[id]/approve/route.ts` (NEW)
POST /api/documents/[id]/approve - Approve document
- Validates document is DRAFT
- Archives previous LIVE version
- Updates version status to LIVE
- Records approval in document_approvals
- Triggers `document/index` Inngest event
- Logs to sync_logs

#### `app/api/documents/[id]/reject/route.ts` (NEW)
POST /api/documents/[id]/reject - Reject document
- Requires `reason` in body
- Optional `archive` flag
- Records rejection in document_approvals
- Logs to sync_logs

### 5. UI Components

#### `components/documents/StatusBadge.tsx` (NEW)
Colored status indicator:
- Supports: DRAFT, LIVE, ARCHIVED, REVIEW
- Size variants: sm, md, lg
- Optional dot indicator

#### `components/documents/DocumentCard.tsx` (NEW)
Document card for list view:
- Shows title, version, word count, file size
- Status badge
- Time since update
- Chunk indexing status
- Links to detail page

#### `components/documents/DocumentList.tsx` (NEW)
Document list with pagination:
- Search functionality (debounced)
- Loading, error, empty states
- Grid layout (responsive)
- Pagination controls

#### `components/documents/DocumentViewer.tsx` (NEW)
Markdown content viewer:
- Uses react-markdown with remark-gfm
- Styled prose classes for:
  - Headings, paragraphs, lists
  - Code blocks (inline and block)
  - Tables, blockquotes
  - Links

#### `components/documents/ApprovalActions.tsx` (NEW)
Approve/Reject buttons:
- Only shows for DRAFT documents
- Optional approval comment
- Required rejection reason
- Modal for rejection
- Loading states

#### `components/documents/ApprovalHistory.tsx` (NEW)
Approval timeline:
- Shows version creation events
- Shows approval/rejection events
- Chronological order (newest first)
- Comments displayed

### 6. Pages

#### `app/documents/page.tsx` (NEW)
Documents list page:
- Tab navigation: All, Drafts, Live, Archived
- Uses Sidebar and Header components
- Integrates DocumentList component

#### `app/documents/[id]/page.tsx` (NEW)
Document detail page:
- Full document viewer
- Metadata panel (file type, size, word count, etc.)
- Approval actions panel
- History timeline
- PII warning if redacted
- Link to Google Drive source

---

## Directories Created
```
app/api/documents/
app/api/documents/[id]/
app/api/documents/[id]/approve/
app/api/documents/[id]/reject/
app/documents/
app/documents/[id]/
components/documents/
```

---

## TypeScript Fixes Applied

### Supabase Join Array Handling
The Supabase foreign key joins return arrays instead of single objects. All fixes have been applied:

1. **`app/api/documents/[id]/approve/route.ts`** - ✅ FIXED
   - Extract first element from `current_version` array

2. **`app/api/documents/[id]/reject/route.ts`** - ✅ FIXED
   - Same pattern as approve route

3. **`app/api/documents/[id]/route.ts`** - ✅ FIXED
   - Handle `current_version` array
   - Fix category mapping with proper type handling

4. **`inngest/indexing.ts`** - ✅ FIXED
   - Fix category mapping with proper type handling

### Fix Pattern Used
For Supabase joins:
```typescript
// Handle Supabase join returning array
const currentVersion = Array.isArray(document.current_version)
  ? document.current_version[0]
  : document.current_version;
```

For category joins:
```typescript
.map((item: Record<string, unknown>) => {
  const category = item.category as { name: string } | { name: string }[] | null;
  if (Array.isArray(category)) return category[0]?.name;
  return category?.name;
})
```

---

## Pre-existing Errors (Not from Stage 4)
These errors existed before Stage 4 implementation:
- `app/api/google-drive/folders/route.ts` - GaxiosResponse type
- `app/api/pinecone/test/route.ts` - totalVectorCount property
- `inngest/functions.ts` - GaxiosResponse type
- `inngest/ingestion.ts` - Buffer type issues
- `types/pinecone.ts` - Metadata type issues
- `utils/google-oauth/server.ts` - null vs undefined
- `utils/llamaparse.ts` - Buffer type

---

## Environment Variables Required
Ensure these are in `.env.local`:
```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=knowbot-kms
```

---

## Testing Checklist

### API Endpoints
- [ ] GET /api/documents - List documents
- [ ] GET /api/documents?status=DRAFT - Filter by status
- [ ] GET /api/documents?search=keyword - Search
- [ ] GET /api/documents/[id] - Get single document
- [ ] POST /api/documents/[id]/approve - Approve document
- [ ] POST /api/documents/[id]/reject - Reject document

### UI Pages
- [ ] /documents - Document list page loads
- [ ] Tab switching works (All/Drafts/Live/Archived)
- [ ] Search functionality
- [ ] Pagination
- [ ] /documents/[id] - Detail page loads
- [ ] Markdown renders correctly
- [ ] Approve button works
- [ ] Reject with reason works

### Inngest Functions
- [ ] document/index event triggers indexDocument function
- [ ] Chunks are created correctly
- [ ] Embeddings are generated
- [ ] Vectors are upserted to Pinecone
- [ ] chunk_count is updated on document_version

---

## Next Steps

Stage 4 implementation is complete. To test:

1. **Run type check** (should show 0 errors in Stage 4 files):
   ```bash
   cd knowbot-kms && npx tsc --noEmit
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Test Inngest locally** (in separate terminal):
   ```bash
   npx inngest-cli@latest dev
   ```

4. **Navigate to**:
   - `/documents` - Document list page
   - `/documents/[id]` - Document detail page

5. **Test approval flow**:
   - View a DRAFT document
   - Click "Approve Document"
   - Check Inngest dashboard for `index-document` function
   - Verify vectors in Pinecone
