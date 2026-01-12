# Testing Guide: Verify Implementation

This guide helps you test and verify all implemented features are working correctly.

## Prerequisites Checklist

### 1. Environment Variables

Create/verify `.env.local` file with all required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=knowbot-kms

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-oauth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for full functionality)
LLAMAPARSE_API_KEY=your-llamaparse-key
OPENAI_API_KEY=your-openai-key
PRESIDIO_API_URL=http://localhost:5001
```

### 2. Database Setup

Run all SQL migrations in order:

```sql
-- 1. Extensions
\i supabase/Extensions.sql

-- 2. Tables
\i supabase/Tables.sql

-- 3. Versioning
\i supabase/Versioning.sql

-- 4. Approval
\i supabase/Approval.sql

-- 5. Knowledge Gap
\i supabase/Knowledge_Gap.sql

-- 6. Sync Logs
\i supabase/Synclogs.sql

-- 7. Google OAuth
\i supabase/Google_OAuth.sql

-- 8. Enable RLS
\i supabase/EnableRLS.sql

-- 9. RLS Policies
\i supabase/RSL_Policies.sql

-- 10. Triggers & Functions
\i supabase/Triggers&Functions.sql

-- 11. Live Propagation
\i supabase/Live_propagation.sql
```

### 3. Install Dependencies

```bash
cd knowbot-kms
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

The app should start at `http://localhost:3000`

---

## Testing Checklist

### ✅ Stage 1 & 2: Foundation (Database & Auth)

#### Test 1: Database Connection

**Endpoint**: `GET http://localhost:3000/api/test-db?action=health`

**Expected**: 
```json
{
  "success": true,
  "database": { "status": "connected" },
  "tables": {
    "tenants": { "count": 0, "status": "ok" },
    "documents": { "count": 0, "status": "ok" },
    "document_versions": { "count": 0, "status": "ok" }
  }
}
```

**Manual Test**:
```bash
curl "http://localhost:3000/api/test-db?action=health"
```

#### Test 2: Authentication

1. **Navigate to**: `http://localhost:3000/login`
2. **Login** with test credentials
3. **Expected**: Redirects to `/dashboard`
4. **Verify**: User email displayed in dashboard

**Check Session**:
- Open browser DevTools → Application → Cookies
- Should see Supabase auth cookies

#### Test 3: Create Test Tenant

**Via API**:
```bash
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Company", "slug": "test-company", "tier": "basic"}'
```

**Via Database**:
```sql
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Test Company', 'test-company', 'basic')
RETURNING id, name, slug;
```

**Save the tenant ID** for next tests!

---

### ✅ Stage 2: Pinecone Namespace Wrapper

#### Test 4: Pinecone Connection

**Endpoint**: `GET http://localhost:3000/api/pinecone/test?action=health`

**Expected**:
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

**Manual Test**:
```bash
curl "http://localhost:3000/api/pinecone/test?action=health"
```

**If Error**: Check `PINECONE_API_KEY` and ensure index exists in Pinecone dashboard.

#### Test 5: Namespace Generation

**Endpoint**: `GET http://localhost:3000/api/pinecone/test?tenantId=<your-tenant-id>&action=namespace`

**Expected**:
```json
{
  "success": true,
  "tenantId": "your-tenant-id",
  "namespace": "your-tenant-id",
  "message": "Namespace generated successfully"
}
```

---

### ✅ Stage 3: Google Drive Connector

#### Test 6: Google OAuth Configuration

**Check**: Environment variables are set:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

**Verify in Google Cloud Console**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Verify OAuth 2.0 Client ID exists
4. Check Authorized redirect URIs includes: `http://localhost:3000/api/google-oauth/callback`

#### Test 7: Connect Google Drive (Manual)

1. **Get your tenant ID** from Test 3
2. **Navigate to**: `http://localhost:3000/dashboard`
3. **Update dashboard** to include tenant ID (or pass as query param)
4. **Click**: "Connect Google Drive" button
5. **Expected**: 
   - Redirects to Google OAuth consent screen
   - After approval, redirects back to dashboard
   - Shows "Connected to Google Drive" status

**Alternative - Direct OAuth URL**:
```
http://localhost:3000/api/google-oauth/authorize?tenantId=<your-tenant-id>
```

#### Test 8: Check Connection Status

**Endpoint**: `GET http://localhost:3000/api/google-oauth/status?tenantId=<tenant-id>`

**Expected** (if connected):
```json
{
  "success": true,
  "connected": true,
  "email": "your-email@gmail.com",
  "expiresAt": "2025-01-09T12:00:00Z"
}
```

**Expected** (if not connected):
```json
{
  "success": true,
  "connected": false
}
```

#### Test 9: List Google Drive Folders

**Endpoint**: `GET http://localhost:3000/api/google-drive/folders?tenantId=<tenant-id>`

**Expected**:
```json
{
  "success": true,
  "folders": [
    {
      "id": "folder-id-1",
      "name": "My Folder",
      "modifiedTime": "2025-01-08T10:00:00Z"
    }
  ]
}
```

**Note**: Requires Google Drive to be connected first.

#### Test 10: Select Folder

**Endpoint**: `POST http://localhost:3000/api/google-drive/set-folder`
**Body**:
```json
{
  "tenantId": "<tenant-id>",
  "folderId": "<folder-id-from-test-9>"
}
```

**Expected**:
```json
{
  "success": true,
  "message": "Folder selected successfully",
  "tenant": { "google_drive_folder_id": "<folder-id>" }
}
```

**Verify in Database**:
```sql
SELECT id, name, google_drive_folder_id 
FROM tenants 
WHERE id = '<tenant-id>';
```

---

### ✅ Stage 3: Sync Watcher

#### Test 11: Inngest Setup

1. **Start Inngest Dev Server** (if not auto-started):
   ```bash
   npx inngest-cli dev
   ```
   Should start at `http://localhost:8288`

2. **Check Inngest Dashboard**: `http://localhost:8288`
   - Should show registered functions:
     - `sync-tenant-drive`
     - `handle-new-file`
     - `handle-updated-file`
     - `handle-deleted-file`
     - `periodic-sync-all-tenants`
     - `ingest-document`

#### Test 12: Manual Sync Trigger

**Endpoint**: `POST http://localhost:3000/api/google-drive/sync`
**Body**:
```json
{
  "tenantId": "<tenant-id>"
}
```

**Expected**:
```json
{
  "success": true,
  "message": "Sync job triggered",
  "eventId": "event-id",
  "tenantId": "<tenant-id>",
  "folderId": "<folder-id>"
}
```

**Check Inngest Dashboard**:
- Go to `http://localhost:8288`
- Look for `sync-tenant-drive` function run
- Check logs for sync results

#### Test 13: Check Sync Status

**Endpoint**: `GET http://localhost:3000/api/google-drive/sync?tenantId=<tenant-id>`

**Expected**:
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
  ],
  "lastSync": { ... }
}
```

**Check Database**:
```sql
SELECT * FROM sync_logs 
WHERE tenant_id = '<tenant-id>' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

### ✅ Stage 3: Ingestion Pipeline

#### Test 14: Trigger Ingestion (Manual)

**Prerequisites**:
- Google Drive connected
- Folder selected
- At least one file in the folder

**Method 1: Via Sync** (Recommended)
- Run Test 12 (Manual Sync)
- If new files detected, ingestion will trigger automatically

**Method 2: Direct Event** (For Testing)
```bash
# Using Inngest dashboard or API
curl -X POST http://localhost:3000/api/inngest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "document/ingest",
    "data": {
      "tenantId": "<tenant-id>",
      "fileId": "<google-drive-file-id>"
    }
  }'
```

**Check Inngest Dashboard**:
- Look for `ingest-document` function run
- Check step-by-step execution
- Verify no errors

#### Test 15: Verify Document Created

**Check Database**:
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
- `parsed_markdown` field populated
- `pii_redacted` flag set (if PII found)
- `word_count` > 0

#### Test 16: Verify Categories

**Check Database**:
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

## End-to-End Test Flow

### Complete Workflow Test

1. **Setup**:
   ```bash
   # 1. Start dev server
   npm run dev
   
   # 2. Start Inngest (in another terminal)
   npx inngest-cli dev
   ```

2. **Create Tenant**:
   - Use Test 3 to create a tenant
   - Save tenant ID

3. **Connect Google Drive**:
   - Use Test 7 to connect
   - Verify connection (Test 8)

4. **Select Folder**:
   - Use Test 9 to list folders
   - Use Test 10 to select a folder
   - Add a test file to that folder in Google Drive

5. **Trigger Sync**:
   - Use Test 12 to trigger sync
   - Wait 10-30 seconds for processing

6. **Verify Results**:
   - Check Inngest dashboard for function runs
   - Use Test 15 to verify document created
   - Check document appears in database as DRAFT

---

## Troubleshooting

### Issue: Database Connection Fails

**Symptoms**: `api/test-db` returns error

**Solutions**:
1. Verify Supabase URL and keys in `.env.local`
2. Check Supabase project is active
3. Verify network connectivity
4. Check RLS policies are applied

### Issue: Pinecone Connection Fails

**Symptoms**: `api/pinecone/test` returns error

**Solutions**:
1. Verify `PINECONE_API_KEY` is set
2. Check index exists in Pinecone dashboard
3. Verify index name matches `PINECONE_INDEX_NAME`
4. Check API key has correct permissions

### Issue: Google OAuth Fails

**Symptoms**: Redirect fails or "Invalid client" error

**Solutions**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
2. Check redirect URI matches exactly in Google Cloud Console
3. Verify Google Drive API is enabled
4. Check OAuth consent screen is configured

### Issue: Sync Not Detecting Files

**Symptoms**: Sync runs but no files detected

**Solutions**:
1. Verify folder ID is correct
2. Check files are in the selected folder
3. Verify file types are allowed (check tenant settings)
4. Check sync logs for errors:
   ```sql
   SELECT * FROM sync_logs 
   WHERE tenant_id = '<tenant-id>' 
   AND status = 'failed'
   ORDER BY created_at DESC;
   ```

### Issue: Ingestion Fails

**Symptoms**: Document not created after sync

**Solutions**:
1. Check Inngest dashboard for errors
2. Verify Google Drive tokens are valid
3. Check file size is within limits
4. Verify LlamaParse API key (if using)
5. Check ingestion logs:
   ```sql
   SELECT * FROM sync_logs 
   WHERE action IN ('create', 'update')
   AND status = 'failed'
   ORDER BY created_at DESC;
   ```

### Issue: Inngest Functions Not Running

**Symptoms**: Functions don't appear in dashboard

**Solutions**:
1. Verify `/api/inngest` route is accessible
2. Check Inngest dev server is running
3. Verify function exports in `app/api/inngest/route.ts`
4. Restart dev server and Inngest

---

## Quick Health Check Script

Create a simple test script to check everything:

```bash
# test-health.sh
#!/bin/bash

echo "=== Health Check ==="

echo "1. Database..."
curl -s "http://localhost:3000/api/test-db?action=health" | jq '.success'

echo "2. Pinecone..."
curl -s "http://localhost:3000/api/pinecone/test?action=health" | jq '.success'

echo "3. Inngest..."
curl -s "http://localhost:8288/api/health" | jq '.'

echo "=== Done ==="
```

---

## Next Steps After Testing

Once everything is verified:

1. ✅ **Stage 1 & 2**: Foundation complete
2. ✅ **Stage 3**: Google Drive sync complete
3. ⏳ **Stage 4**: Approval interface (next)
4. ⏳ **Stage 5**: Query engine
5. ⏳ **Stage 6**: UI completion

---

## Test Data Setup

### Create Test Tenant with Sample Data

```sql
-- 1. Create tenant
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Test BPO Company', 'test-bpo', 'pro')
RETURNING id;

-- 2. Create test user (via Supabase Auth dashboard)
-- Note: User should have tenant_id in user_metadata

-- 3. Create test categories
INSERT INTO document_categories (tenant_id, name, color)
VALUES 
  ('<tenant-id>', 'Billing', '#3B82F6'),
  ('<tenant-id>', 'Support', '#10B981'),
  ('<tenant-id>', 'Technical', '#F59E0B');
```

---

*For detailed component testing, refer to individual README files:*
- `README_PINECONE.md` - Pinecone testing
- `README_GOOGLE_DRIVE.md` - Google Drive testing
- `README_SYNC_WATCHER.md` - Sync testing
- `README_INGESTION.md` - Ingestion testing
