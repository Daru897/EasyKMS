# Quick Start: Testing Your Implementation

This is a quick guide to verify everything is working.

## Step 1: Environment Setup

### Check Environment Variables

```powershell
# Run the environment check script
npm run test:env
```

Or manually verify `.env.local` has:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `PINECONE_API_KEY`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`

## Step 2: Database Setup

### Run SQL Migrations

In Supabase SQL Editor, run in order:

1. `supabase/Extensions.sql`
2. `supabase/Tables.sql`
3. `supabase/Versioning.sql`
4. `supabase/Approval.sql`
5. `supabase/Knowledge_Gap.sql`
6. `supabase/Synclogs.sql`
7. `supabase/Google_OAuth.sql`
8. `supabase/EnableRLS.sql`
9. `supabase/RSL_Policies.sql`
10. `supabase/Triggers&Functions.sql`
11. `supabase/Live_propagation.sql`

### Create Test Tenant

```sql
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Test Company', 'test-company', 'basic')
RETURNING id, name, slug;
```

**Save the `id` - you'll need it!**

## Step 3: Start Services

### Terminal 1: Next.js Dev Server
```bash
cd knowbot-kms
npm run dev
```

### Terminal 2: Inngest Dev Server
```bash
npx inngest-cli dev
```

**Verify**:
- Next.js: `http://localhost:3000`
- Inngest: `http://localhost:8288`

## Step 4: Run Health Checks

### Option A: Automated Script

```bash
npm run test:health
```

### Option B: Manual Browser Test

1. Navigate to: `http://localhost:3000/test-system`
2. Enter your tenant ID
3. Click "Run All Tests"

### Option C: Manual API Tests

```bash
# 1. Database
curl "http://localhost:3000/api/test-db?action=health"

# 2. Pinecone
curl "http://localhost:3000/api/pinecone/test?action=health"

# 3. Google Drive Status (replace tenant-id)
curl "http://localhost:3000/api/google-oauth/status?tenantId=<tenant-id>"
```

## Step 5: Test Authentication

1. Go to: `http://localhost:3000/login`
2. Login with test credentials
3. Should redirect to `/dashboard`
4. Verify user email is displayed

## Step 6: Test Google Drive Connection

1. In dashboard, enter tenant ID (or update code to auto-load)
2. Click "Connect Google Drive"
3. Complete OAuth flow
4. Verify "Connected" status appears
5. Select a folder from the list

## Step 7: Test Sync & Ingestion

### Manual Sync Trigger

```bash
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<your-tenant-id>"}'
```

### Check Inngest Dashboard

1. Go to: `http://localhost:8288`
2. Look for function runs:
   - `sync-tenant-drive`
   - `ingest-document` (if files detected)

### Verify Documents Created

```sql
SELECT 
  d.id,
  d.title,
  d.current_status,
  dv.version_number,
  dv.word_count,
  dv.pii_redacted
FROM documents d
LEFT JOIN document_versions dv ON dv.document_id = d.id
WHERE d.tenant_id = '<your-tenant-id>'
ORDER BY d.created_at DESC;
```

## Expected Results

### ✅ All Systems Working

- Database: Connected, tables accessible
- Pinecone: Connected, index accessible
- Authentication: Login works, session persists
- Google Drive: Can connect, folders listed
- Sync: Runs without errors, detects files
- Ingestion: Documents created as DRAFT

### Common Issues

| Issue | Solution |
|-------|----------|
| Database connection fails | Check Supabase URL/keys |
| Pinecone fails | Verify API key and index exists |
| Google OAuth fails | Check redirect URI matches exactly |
| Sync finds no files | Verify folder ID and file types |
| Ingestion fails | Check Inngest logs, verify file format |

## Next Steps

Once everything is verified:

1. ✅ **Stage 1-2**: Foundation complete
2. ✅ **Stage 3**: Google Drive sync complete
3. ⏳ **Stage 4**: Build approval interface
4. ⏳ **Stage 5**: Implement query engine
5. ⏳ **Stage 6**: Complete UI

## Detailed Testing

For comprehensive testing, see: `TESTING_GUIDE.md`
