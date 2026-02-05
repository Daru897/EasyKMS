# Testing Checklist

Use this checklist to verify all implemented features.

## Pre-Flight Checks

- [ ] `.env.local` file exists with all required variables
- [ ] Database migrations run successfully
- [ ] Next.js dev server starts without errors
- [ ] Inngest dev server accessible at `http://localhost:8288`

## Stage 1 & 2: Foundation

### Database
- [ ] Database connection test passes (`/api/test-db?action=health`)
- [ ] Can create tenant via API
- [ ] RLS policies working (test with different users)

### Authentication
- [ ] Can login with email/password
- [ ] Can login with magic link
- [ ] Session persists after page refresh
- [ ] Logout works correctly
- [ ] Protected routes redirect to login

### Pinecone
- [ ] Pinecone connection test passes (`/api/pinecone/test?action=health`)
- [ ] Namespace generation works (`/api/pinecone/test?tenantId=<id>&action=namespace`)
- [ ] Index exists in Pinecone dashboard

## Stage 3: Google Drive Integration

### OAuth Connection
- [ ] "Connect Google Drive" button appears in dashboard
- [ ] OAuth flow redirects to Google
- [ ] Can complete OAuth consent
- [ ] Redirects back to dashboard after approval
- [ ] Connection status shows "Connected"
- [ ] Google email displayed correctly

### Folder Selection
- [ ] Can list folders from Google Drive
- [ ] Folder selector UI displays folders
- [ ] Can select a folder
- [ ] Folder ID saved to tenant record
- [ ] Selected folder persists

### Sync Watcher
- [ ] Manual sync trigger works (`POST /api/google-drive/sync`)
- [ ] Sync status API returns data (`GET /api/google-drive/sync`)
- [ ] Inngest functions appear in dashboard
- [ ] `sync-tenant-drive` function runs
- [ ] Sync logs created in database
- [ ] Files detected correctly (new/updated/deleted)

### Ingestion Pipeline
- [ ] Ingestion function appears in Inngest dashboard
- [ ] New file triggers `document/ingest` event
- [ ] File downloads successfully
- [ ] Document parsing works (or fallback active)
- [ ] PII redaction runs (check stats)
- [ ] Categories suggested
- [ ] Document saved as DRAFT in database
- [ ] Document version created
- [ ] Categories linked to version

## Verification Queries

### Check Documents
```sql
SELECT 
  d.id,
  d.title,
  d.current_status,
  d.sync_status,
  dv.version_number,
  dv.word_count,
  dv.pii_redacted,
  d.created_at
FROM documents d
LEFT JOIN document_versions dv ON dv.document_id = d.id
WHERE d.tenant_id = '<tenant-id>'
ORDER BY d.created_at DESC;
```

### Check Sync Logs
```sql
SELECT 
  action,
  status,
  details,
  created_at
FROM sync_logs
WHERE tenant_id = '<tenant-id>'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Google OAuth
```sql
SELECT 
  tenant_id,
  google_user_email,
  is_active,
  expires_at,
  connected_at
FROM google_oauth_tokens
WHERE tenant_id = '<tenant-id>';
```

## End-to-End Test

1. [ ] Create tenant
2. [ ] Connect Google Drive
3. [ ] Select folder
4. [ ] Add test file to folder in Google Drive
5. [ ] Trigger sync
6. [ ] Wait for ingestion (30-60 seconds)
7. [ ] Verify document appears in database
8. [ ] Check document is DRAFT status
9. [ ] Verify parsed content exists
10. [ ] Check categories are linked

## Performance Checks

- [ ] Database queries complete in < 500ms
- [ ] Pinecone operations complete in < 1s
- [ ] Sync completes in < 30s for 10 files
- [ ] Ingestion completes in < 60s per file

## Error Handling

- [ ] Invalid tenant ID shows error
- [ ] Missing Google Drive connection shows error
- [ ] Failed sync logs error to database
- [ ] Failed ingestion logs error to database
- [ ] Retries work correctly (check Inngest dashboard)

---

**Status**: Use this checklist after each major feature implementation.

**Next**: Once all checked, proceed to Stage 4 (Approval Interface).
