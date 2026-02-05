# How to Test Everything

## 🚀 Quick Start (5 Minutes)

### 1. Start Services

**Terminal 1:**
```bash
cd knowbot-kms
npm run dev
```

**Terminal 2:**
```bash
npx inngest-cli dev
```

### 2. Run Health Check

**Option A: Browser (Easiest)**
1. Go to: `http://localhost:3000/test-system`
2. Enter your tenant ID
3. Click "Run All Tests"

**Option B: Command Line**
```bash
npm run test:health
```

**Option C: Check Environment**
```bash
npm run test:env
```

---

## 📋 Step-by-Step Testing

### Step 1: Verify Environment

```bash
npm run test:env
```

**Fix any missing variables** before proceeding.

### Step 2: Test Database

```bash
curl "http://localhost:3000/api/test-db?action=health"
```

**Expected**: `{"success": true, "database": {"status": "connected"}}`

### Step 3: Test Pinecone

```bash
curl "http://localhost:3000/api/pinecone/test?action=health"
```

**Expected**: `{"success": true, "message": "Pinecone connection successful"}`

### Step 4: Test Authentication

1. Go to: `http://localhost:3000/login`
2. Login with credentials
3. Should redirect to `/dashboard`

### Step 5: Create Test Tenant

```bash
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Company", "slug": "test-company"}'
```

**Save the `id` from response!**

### Step 6: Test Google Drive Connection

1. Go to: `http://localhost:3000/dashboard`
2. Enter tenant ID (or update dashboard code)
3. Click "Connect Google Drive"
4. Complete OAuth flow
5. Verify "Connected" status

### Step 7: Test Sync

```bash
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<your-tenant-id>"}'
```

**Check Inngest Dashboard**: `http://localhost:8288`
- Look for `sync-tenant-drive` function run
- Check logs for results

### Step 8: Verify Documents

**In Supabase SQL Editor:**
```sql
SELECT 
  d.title,
  d.current_status,
  dv.version_number,
  dv.word_count
FROM documents d
JOIN document_versions dv ON dv.document_id = d.id
WHERE d.tenant_id = '<your-tenant-id>'
ORDER BY d.created_at DESC;
```

**Expected**: Documents with `current_status = 'DRAFT'`

---

## 🎯 Visual Testing Page

**Best Option**: Use the built-in test page!

1. Navigate to: `http://localhost:3000/test-system`
2. Enter tenant ID
3. Click "Run All Tests"
4. See results with ✅/❌ indicators

This page tests:
- ✅ Database connection
- ✅ Pinecone connection
- ✅ Google Drive status
- ✅ Sync status
- ✅ Document count

---

## 🔍 Detailed Component Tests

### Database Tests

```bash
# Health check
curl "http://localhost:3000/api/test-db?action=health"

# Create test tenant
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "slug": "test"}'

# Test connection
curl "http://localhost:3000/api/test-db?action=test-connection"
```

### Pinecone Tests

```bash
# Health check
curl "http://localhost:3000/api/pinecone/test?action=health"

# Get namespace (replace tenant-id)
curl "http://localhost:3000/api/pinecone/test?tenantId=<tenant-id>&action=namespace"

# Get stats
curl "http://localhost:3000/api/pinecone/test?tenantId=<tenant-id>&action=stats"
```

### Google Drive Tests

```bash
# Check connection status
curl "http://localhost:3000/api/google-oauth/status?tenantId=<tenant-id>"

# List folders (requires connection)
curl "http://localhost:3000/api/google-drive/folders?tenantId=<tenant-id>"

# Trigger sync
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<tenant-id>"}'
```

---

## 📊 Monitoring

### Inngest Dashboard

**URL**: `http://localhost:8288`

**Check**:
- Functions registered
- Function runs
- Success/failure rates
- Error logs

### Database Queries

```sql
-- Recent sync activity
SELECT * FROM sync_logs 
WHERE tenant_id = '<tenant-id>'
ORDER BY created_at DESC 
LIMIT 10;

-- Draft documents
SELECT * FROM documents 
WHERE current_status = 'DRAFT'
AND tenant_id = '<tenant-id>';

-- Ingestion stats
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN pii_redacted THEN 1 ELSE 0 END) as with_pii,
  AVG(word_count) as avg_words
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
WHERE d.tenant_id = '<tenant-id>';
```

---

## ✅ Success Criteria

### All Systems Green ✅

- [ ] Database: Health check passes
- [ ] Pinecone: Health check passes
- [ ] Authentication: Can login/logout
- [ ] Google Drive: Can connect and list folders
- [ ] Sync: Runs without errors
- [ ] Ingestion: Documents created as DRAFT
- [ ] Inngest: Functions visible in dashboard

### Expected Database State

After successful sync and ingestion:

```sql
-- Should have:
-- 1. Tenant record
SELECT COUNT(*) FROM tenants; -- > 0

-- 2. Google OAuth token (if connected)
SELECT COUNT(*) FROM google_oauth_tokens; -- > 0

-- 3. Documents (if files in Drive)
SELECT COUNT(*) FROM documents; -- > 0

-- 4. Document versions
SELECT COUNT(*) FROM document_versions; -- > 0

-- 5. Sync logs
SELECT COUNT(*) FROM sync_logs; -- > 0
```

---

## 🐛 Troubleshooting

### Database Not Connecting

1. Check `.env.local` has correct Supabase URL/key
2. Verify Supabase project is active
3. Check network connectivity
4. Verify RLS policies are applied

### Pinecone Not Connecting

1. Verify `PINECONE_API_KEY` is set
2. Check index exists in Pinecone dashboard
3. Verify index name matches `PINECONE_INDEX_NAME`
4. Check API key permissions

### Google OAuth Fails

1. Verify redirect URI matches exactly
2. Check Google Cloud Console settings
3. Ensure Google Drive API is enabled
4. Verify OAuth consent screen configured

### Sync Not Working

1. Check Inngest is running: `http://localhost:8288`
2. Verify Google Drive is connected
3. Check folder ID is set
4. Look at sync logs in database

### Ingestion Not Working

1. Check Inngest dashboard for errors
2. Verify file types are allowed
3. Check file size limits
4. Review ingestion logs

---

## 📚 Additional Resources

- **Full Testing Guide**: `TESTING_GUIDE.md`
- **Quick Start**: `QUICK_START.md`
- **Testing Checklist**: `TESTING_CHECKLIST.md`
- **Component Docs**:
  - `README_PINECONE.md`
  - `README_GOOGLE_DRIVE.md`
  - `README_SYNC_WATCHER.md`
  - `README_INGESTION.md`

---

## 🎯 Next Steps After Testing

Once everything is verified:

1. ✅ **Foundation**: Database, Auth, Pinecone - Complete
2. ✅ **Google Drive**: OAuth, Sync, Ingestion - Complete
3. ⏳ **Approval Interface**: Build manager dashboard
4. ⏳ **Vector Indexing**: Index approved documents
5. ⏳ **Query Engine**: Implement search
6. ⏳ **UI Completion**: Agent & Admin views

---

**Quick Test URL**: `http://localhost:3000/test-system`
