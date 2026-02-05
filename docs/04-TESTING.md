# Testing Guide

Comprehensive testing procedures for the IKMS platform.

---

## Table of Contents

1. [Quick Start Testing](#quick-start-testing)
2. [Stage-by-Stage Testing](#stage-by-stage-testing)
3. [End-to-End Testing](#end-to-end-testing)
4. [Performance Testing](#performance-testing)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start Testing

### 5-Minute Health Check

**Prerequisites**:
- Development servers running
- `.env.local` configured
- Database migrations applied

**Steps**:

1. **Start Services**:
   ```bash
   # Terminal 1
   cd knowbot-kms && npm run dev
   
   # Terminal 2
   npx inngest-cli dev
   ```

2. **Run Automated Tests**:
   
   **Option A - Browser** (Recommended):
   ```
   Navigate to: http://localhost:3000/test-system
   Enter tenant ID
   Click "Run All Tests"
   ```
   
   **Option B - Command Line**:
   ```bash
   npm run test:health
   ```

3. **Verify Results**:
   - ✅ Database connected
   - ✅ Pinecone connected
   - ✅ Inngest running

---

## Stage-by-Stage Testing

### Stage 1 & 2: Foundation

#### Test 1: Database Connection

**Endpoint**: `GET /api/test-db?action=health`

**Command**:
```bash
curl "http://localhost:3000/api/test-db?action=health"
```

**Expected Response**:
```json
{
  "success": true,
  "database": {
    "status": "connected"
  },
  "tables": {
    "tenants": { "count": 0, "status": "ok" },
    "documents": { "count": 0, "status": "ok" },
    "document_versions": { "count": 0, "status": "ok" }
  }
}
```

**Troubleshooting**:
- Verify Supabase URL and keys in `.env.local`
- Check Supabase project is active
- Ensure RLS policies applied

#### Test 2: Create Tenant

**SQL**:
```sql
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Test Company', 'test-company', 'pro')
RETURNING id, name, slug;
```

**API**:
```bash
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "slug": "test-company",
    "tier": "pro"
  }'
```

**Save the tenant ID** for subsequent tests.

#### Test 3: Authentication

**Steps**:
1. Navigate to `http://localhost:3000/login`
2. Login with credentials
3. Verify redirect to `/dashboard`
4. Check session cookie in DevTools

**Verify Session**:
- Open DevTools → Application → Cookies
- Should see Supabase auth cookies

#### Test 4: Pinecone Connection

**Endpoint**: `GET /api/pinecone/test?action=health`

**Command**:
```bash
curl "http://localhost:3000/api/pinecone/test?action=health"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Pinecone connection successful",
  "index": {
    "name": "knowbot-kms",
    "dimension": 1536,
    "totalVectorCount": 0
  }
}
```

**Troubleshooting**:
- Verify `PINECONE_API_KEY` is set
- Check index exists in Pinecone console
- Verify dimensions are 1536

#### Test 5: Namespace Generation

**Endpoint**: `GET /api/pinecone/test?tenantId=<uuid>&action=namespace`

**Command**:
```bash
curl "http://localhost:3000/api/pinecone/test?tenantId=<your-tenant-id>&action=namespace"
```

**Expected Response**:
```json
{
  "success": true,
  "tenantId": "your-tenant-id",
  "namespace": "your-tenant-id",
  "message": "Namespace generated successfully"
}
```

---

### Stage 3: Google Drive Integration

#### Test 6: Google OAuth Configuration

**Verify Environment Variables**:
```bash
npm run test:env
```

Should show:
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET
- ✅ GOOGLE_REDIRECT_URI

**Verify Google Cloud Console**:
1. OAuth 2.0 Client ID exists
2. Redirect URI includes: `http://localhost:3000/api/google-oauth/callback`
3. Google Drive API is enabled

#### Test 7: Connect Google Drive

**Manual Flow**:
1. Navigate to `http://localhost:3000/dashboard`
2. Click "Connect Google Drive"
3. Complete OAuth flow
4. Verify "Connected" status

**Direct URL**:
```
http://localhost:3000/api/google-oauth/authorize?tenantId=<your-tenant-id>
```

#### Test 8: Check Connection Status

**Endpoint**: `GET /api/google-oauth/status?tenantId=<uuid>`

**Command**:
```bash
curl "http://localhost:3000/api/google-oauth/status?tenantId=<your-tenant-id>"
```

**Expected (Connected)**:
```json
{
  "success": true,
  "connected": true,
  "email": "user@gmail.com",
  "expiresAt": "2025-01-10T12:00:00Z"
}
```

**Expected (Not Connected)**:
```json
{
  "success": true,
  "connected": false
}
```

#### Test 9: List Google Drive Folders

**Endpoint**: `GET /api/google-drive/folders?tenantId=<uuid>`

**Command**:
```bash
curl "http://localhost:3000/api/google-drive/folders?tenantId=<your-tenant-id>"
```

**Expected Response**:
```json
{
  "success": true,
  "folders": [
    {
      "id": "folder-id-1",
      "name": "My Documents",
      "modifiedTime": "2025-01-08T10:00:00Z"
    }
  ]
}
```

#### Test 10: Select Folder

**Endpoint**: `POST /api/google-drive/set-folder`

**Command**:
```bash
curl -X POST http://localhost:3000/api/google-drive/set-folder \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "<your-tenant-id>",
    "folderId": "<folder-id-from-test-9>"
  }'
```

**Verify in Database**:
```sql
SELECT google_drive_folder_id 
FROM tenants 
WHERE id = '<tenant-id>';
```

#### Test 11: Inngest Setup

**Check Functions Registered**:
1. Open `http://localhost:8288`
2. Verify functions visible:
   - sync-tenant-drive
   - handle-new-file
   - handle-updated-file
   - handle-deleted-file
   - periodic-sync-all-tenants
   - ingest-document
   - index-document

#### Test 12: Manual Sync Trigger

**Endpoint**: `POST /api/google-drive/sync`

**Command**:
```bash
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<your-tenant-id>"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Sync job triggered",
  "eventId": "event-id",
  "tenantId": "your-tenant-id",
  "folderId": "folder-id"
}
```

**Check Inngest Dashboard**:
- Go to `http://localhost:8288`
- Look for `sync-tenant-drive` function run
- Check logs for results

#### Test 13: Check Sync Status

**Endpoint**: `GET /api/google-drive/sync?tenantId=<uuid>`

**Command**:
```bash
curl "http://localhost:3000/api/google-drive/sync?tenantId=<your-tenant-id>"
```

**Expected Response**:
```json
{
  "success": true,
  "connected": true,
  "recentSyncs": [
    {
      "id": "log-id",
      "action": "sync",
      "status": "success",
      "details": {
        "files_checked": 5,
        "changes_detected": 2
      },
      "created_at": "2025-01-08T12:00:00Z"
    }
  ]
}
```

**Check Database**:
```sql
SELECT * FROM sync_logs 
WHERE tenant_id = '<tenant-id>' 
ORDER BY created_at DESC 
LIMIT 5;
```

#### Test 14: Trigger Ingestion

**Prerequisites**:
- Google Drive connected
- Folder selected
- At least one file in folder

**Method 1 - Via Sync**:
```bash
# Run Test 12 (Manual Sync)
# If new files detected, ingestion triggers automatically
```

**Check Inngest Dashboard**:
- Look for `ingest-document` function run
- Check step-by-step execution
- Verify no errors

#### Test 15: Verify Document Created

**Query Database**:
```sql
-- Check documents
SELECT 
  id, 
  title, 
  current_status, 
  sync_status,
  created_at
FROM documents 
WHERE tenant_id = '<tenant-id>'
ORDER BY created_at DESC;

-- Check document versions
SELECT 
  dv.id,
  dv.version_number,
  dv.status,
  dv.word_count,
  dv.pii_redacted,
  d.title
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
WHERE d.tenant_id = '<tenant-id>'
ORDER BY dv.created_at DESC;
```

**Expected**:
- Document with `current_status = 'DRAFT'`
- Document version with `status = 'DRAFT'`
- `parsed_markdown` populated
- `word_count` > 0

#### Test 16: Verify Categories

**Query Database**:
```sql
SELECT 
  c.name as category,
  d.title as document
FROM document_version_categories dvc
JOIN document_categories c ON c.id = dvc.category_id
JOIN document_versions dv ON dv.id = dvc.document_version_id
JOIN documents d ON d.id = dv.document_id
WHERE d.tenant_id = '<tenant-id>';
```

**Expected**: Categories linked to document versions

---

### Stage 4: Approval & Indexing

#### Test 17: List Documents

**Endpoint**: `GET /api/documents`

**Command**:
```bash
curl "http://localhost:3000/api/documents?status=DRAFT"
```

**Expected Response**:
```json
{
  "success": true,
  "documents": [
    {
      "id": "doc-id",
      "title": "Test Document",
      "current_status": "DRAFT",
      "current_version": {
        "version_number": 1,
        "word_count": 150
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

#### Test 18: Get Document Detail

**Endpoint**: `GET /api/documents/[id]`

**Command**:
```bash
curl "http://localhost:3000/api/documents/<document-id>"
```

**Expected**: Full document with version history

#### Test 19: Approve Document

**Endpoint**: `POST /api/documents/[id]/approve`

**Command**:
```bash
curl -X POST http://localhost:3000/api/documents/<document-id>/approve \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved for publishing"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Document approved successfully",
  "document": {
    "id": "doc-id",
    "current_status": "LIVE"
  }
}
```

**Check Inngest**:
- Look for `index-document` function run
- Verify chunking completed
- Check embeddings generated
- Verify vectors upserted

#### Test 20: Verify Vectors in Pinecone

**Endpoint**: `GET /api/pinecone/test?tenantId=<uuid>&action=stats`

**Command**:
```bash
curl "http://localhost:3000/api/pinecone/test?tenantId=<tenant-id>&action=stats"
```

**Expected**: `vectorCount` > 0

**Query Database**:
```sql
SELECT 
  dv.chunk_count,
  dv.indexed_at,
  d.title
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
WHERE d.tenant_id = '<tenant-id>'
  AND dv.status = 'LIVE';
```

**Expected**: `chunk_count` > 0, `indexed_at` set

#### Test 21: Reject Document

**Endpoint**: `POST /api/documents/[id]/reject`

**Command**:
```bash
curl -X POST http://localhost:3000/api/documents/<document-id>/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Incorrect information",
    "archive": false
  }'
```

---

## End-to-End Testing

### Complete Workflow Test

This test verifies the entire pipeline from Google Drive to searchable vectors.

**Preparation**:
1. Clean test tenant (no documents)
2. Google Drive connected
3. Folder selected
4. One test file in folder

**Step 1: Add Test Document**
- Create `Test_SOP.txt` in Google Drive folder
- Content:
  ```
  # Refund Policy
  
  To process a refund:
  1. Verify order number
  2. Check eligibility (within 30 days)
  3. Process via original payment method
  4. Send confirmation to customer@example.com
  ```

**Step 2: Trigger Sync**
```bash
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<tenant-id>"}'
```

Wait 30-60 seconds for processing.

**Step 3: Verify Document Created**
```sql
SELECT * FROM documents 
WHERE tenant_id = '<tenant-id>' 
  AND title LIKE '%Test_SOP%';
```

Expected: 1 row with `status = 'DRAFT'`

**Step 4: Verify Ingestion**
```sql
SELECT 
  dv.parsed_markdown,
  dv.word_count,
  dv.pii_redacted,
  dv.pii_redaction_stats
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
WHERE d.tenant_id = '<tenant-id>'
  AND d.title LIKE '%Test_SOP%';
```

Expected:
- `parsed_markdown` contains content
- `word_count` > 0
- `pii_redacted = true` (email detected)
- `pii_redaction_stats` shows email count

**Step 5: Approve Document**
```bash
curl -X POST http://localhost:3000/api/documents/<doc-id>/approve \
  -H "Content-Type: application/json" \
  -d '{"comment": "Test approval"}'
```

**Step 6: Verify Indexing**

Check Inngest:
```
http://localhost:8288
→ Look for index-document run
→ Verify completed successfully
```

Check Database:
```sql
SELECT chunk_count, indexed_at 
FROM document_versions
WHERE document_id = '<doc-id>';
```

Expected: `chunk_count > 0`, `indexed_at` set

Check Pinecone:
```bash
curl "http://localhost:3000/api/pinecone/test?tenantId=<tenant-id>&action=stats"
```

Expected: `vectorCount` increased

**Step 7: Test Update**

1. Edit file in Google Drive
2. Trigger sync
3. New version should be created as DRAFT
4. Approve new version
5. Old vectors replaced with new ones

---

## Performance Testing

### Metrics to Measure

#### Database Query Performance
```sql
-- Enable timing
\timing

-- Test query
SELECT * FROM documents 
WHERE tenant_id = '<tenant-id>' 
  AND current_status = 'DRAFT';
```

**Target**: < 100ms

#### Vector Search Performance
```bash
# Time a query
time curl "http://localhost:3000/api/pinecone/test?tenantId=<tenant-id>&action=query"
```

**Target**: < 500ms

#### Ingestion Performance

Check Inngest dashboard for function duration:
- **Parsing**: < 10s per document
- **Embedding**: < 5s per 10 chunks
- **Total ingestion**: < 60s per document

### Load Testing

#### Multiple Documents
1. Add 10 documents to Google Drive folder
2. Trigger sync
3. Monitor Inngest for parallel processing
4. Check for failures

**Target**: 90%+ success rate

#### Large Documents
1. Add 50-page PDF to Google Drive
2. Trigger ingestion
3. Monitor memory usage
4. Verify chunking completed

**Target**: Successfully processes 100+ page documents

---

## Troubleshooting

### Database Issues

#### "Cannot connect to database"

**Symptoms**: API returns database connection errors

**Solutions**:
1. Verify `.env.local` has correct Supabase URL/keys
2. Check Supabase project is active
3. Test connection manually:
   ```bash
   curl "http://localhost:3000/api/test-db?action=health"
   ```
4. Check network connectivity
5. Verify RLS policies don't block queries

**Debug Queries**:
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Pinecone Issues

#### "Index not found"

**Symptoms**: Pinecone API returns 404

**Solutions**:
1. Verify index name in `.env.local` matches Pinecone console
2. Check index exists: `PINECONE_INDEX_NAME=knowbot-kms`
3. Verify API key is correct
4. Check API key has access to index

#### "Namespace not found"

**Symptoms**: Query returns no results

**Solutions**:
1. Verify tenant_id is correct UUID format
2. Check namespace exists:
   ```bash
   curl "http://localhost:3000/api/pinecone/test?tenantId=<id>&action=stats"
   ```
3. Verify vectors were upserted
4. Check document was approved (status = LIVE)

### Google OAuth Issues

#### "Redirect URI mismatch"

**Symptoms**: Google returns error after authorization

**Solutions**:
1. Verify exact match in Google Cloud Console:
   - `http://localhost:3000/api/google-oauth/callback`
2. No trailing slashes
3. Match protocol (http vs https)
4. Clear browser cookies and retry

#### "Token expired"

**Symptoms**: Sync fails with authentication error

**Solutions**:
1. Check token refresh logic is working
2. Verify refresh token is stored
3. Check token expiration in database:
   ```sql
   SELECT expires_at, google_user_email 
   FROM google_oauth_tokens 
   WHERE tenant_id = '<tenant-id>';
   ```
4. Reconnect Google Drive if needed

### Sync Issues

#### "Sync not detecting files"

**Symptoms**: Sync runs but finds 0 files

**Solutions**:
1. Verify folder ID is correct:
   ```sql
   SELECT google_drive_folder_id FROM tenants WHERE id = '<tenant-id>';
   ```
2. Check files are in the selected folder (not subfolders)
3. Verify file types are allowed
4. Check Google Drive API quota

**Debug**:
```bash
# Test folder listing directly
curl "http://localhost:3000/api/google-drive/folders?tenantId=<tenant-id>"
```

#### "Ingestion fails"

**Symptoms**: Document not created after sync

**Solutions**:
1. Check Inngest dashboard for errors
2. Verify Google Drive tokens valid
3. Check file size within limits
4. Review ingestion logs:
   ```sql
   SELECT * FROM sync_logs 
   WHERE action IN ('create', 'update')
     AND status = 'failed'
   ORDER BY created_at DESC;
   ```

### Inngest Issues

#### "Functions not appearing"

**Symptoms**: Inngest dashboard shows no functions

**Solutions**:
1. Ensure Inngest dev server running: `npx inngest-cli dev`
2. Verify `/api/inngest` route is accessible
3. Check function exports in `app/api/inngest/route.ts`
4. Restart both servers (Next.js + Inngest)

#### "Function failing repeatedly"

**Symptoms**: Function shows red in dashboard

**Solutions**:
1. Click on function run to see error details
2. Check step-by-step execution
3. Verify required environment variables
4. Review function code for bugs

---

## Test Data Setup

### Create Complete Test Environment

```sql
-- 1. Create tenant
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Test BPO', 'test-bpo', 'pro')
RETURNING id;

-- 2. Create categories
INSERT INTO document_categories (tenant_id, name, color)
VALUES 
  ('<tenant-id>', 'Billing', '#3B82F6'),
  ('<tenant-id>', 'Support', '#10B981'),
  ('<tenant-id>', 'Technical', '#F59E0B');

-- 3. Create test user (via Supabase Auth dashboard)
-- Add tenant_id to user_metadata
```

---

## Testing Checklist

Use this checklist to verify all features:

- [ ] Database connection works
- [ ] Tenant creation successful
- [ ] Authentication working (login/logout)
- [ ] Pinecone connection established
- [ ] Google Drive OAuth flow completes
- [ ] Folder selection works
- [ ] Manual sync triggers successfully
- [ ] Files detected in sync
- [ ] Document ingestion creates DRAFT
- [ ] PII redaction working
- [ ] Categories suggested correctly
- [ ] Document list API returns data
- [ ] Document detail API works
- [ ] Approval changes status to LIVE
- [ ] Vector indexing completes
- [ ] Chunks created correctly
- [ ] Vectors in Pinecone namespace
- [ ] Rejection works with reason

---

## Continuous Testing

### Daily Health Check
```bash
npm run test:health
```

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] Inngest functions registered
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] SSL certificates valid (production)

---

*For API details, see `05-API-REFERENCE.md`*
*For development guide, see `03-DEVELOPMENT-GUIDE.md`*
