# Google Drive Sync Watcher

This module implements the "Watcher" component that monitors Google Drive for changes and triggers document ingestion jobs.

## Architecture

### Components

1. **Inngest Functions** - Background job processing
   - `syncTenantDrive` - Polls Google Drive and detects changes
   - `handleNewFile` - Processes new files
   - `handleUpdatedFile` - Processes file updates
   - `handleDeletedFile` - Archives deleted files
   - `periodicSync` - Scheduled sync for all tenants

2. **API Endpoints**
   - `/api/google-drive/sync` - Manual sync trigger
   - `/api/google-drive/webhook` - Google Drive push notifications

3. **Utilities**
   - `utils/google-drive/server.ts` - File operations

## How It Works

### Polling Mode (Default)

1. **Scheduled Job** runs every 5 minutes (`periodicSync`)
2. For each active tenant with Google Drive connected:
   - Lists files in the configured folder
   - Compares with database records
   - Detects new, updated, or deleted files
   - Triggers appropriate ingestion jobs

### Webhook Mode (Optional)

1. **Google Drive Push Notifications** send webhooks to `/api/google-drive/webhook`
2. Webhook handler verifies and triggers sync
3. More efficient than polling (real-time)

### Change Detection

The sync function compares:
- **New Files**: Files in Drive but not in database
- **Updated Files**: Files with `modifiedTime` newer than `last_synced_at`
- **Deleted Files**: Files in database but not in Drive folder

## Setup

### 1. Environment Variables

```env
# Inngest (optional - uses local dev server by default)
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# Google Drive Webhook (optional)
GOOGLE_DRIVE_WEBHOOK_TOKEN=your-webhook-token
```

### 2. Inngest Setup

#### Local Development

Inngest runs locally with the dev server. No additional setup needed.

#### Production

1. Sign up at [inngest.com](https://www.inngest.com)
2. Create an app
3. Get your event key and signing key
4. Add to environment variables
5. Deploy your app (Inngest will discover functions automatically)

### 3. Google Drive Webhook Setup (Optional)

For real-time sync instead of polling:

1. **Create Webhook Channel**:
   ```typescript
   // Use Google Drive API to create a watch channel
   const response = await drive.files.watch({
     fileId: folderId,
     requestBody: {
       id: `tenant-${tenantId}`,
       type: 'web_hook',
       address: 'https://yourdomain.com/api/google-drive/webhook',
       token: `tenant-${tenantId}`, // Used to identify tenant
     },
   });
   ```

2. **Store Channel Info**:
   - Store `resourceId` and `expiration` in database
   - Renew channel before expiration (typically 7 days)

3. **Handle Webhooks**:
   - Endpoint already implemented at `/api/google-drive/webhook`
   - Verifies token and triggers sync

## Usage

### Manual Sync Trigger

```bash
# Trigger sync for a tenant
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "your-tenant-id"}'
```

### Check Sync Status

```bash
# Get sync status and recent logs
curl "http://localhost:3000/api/google-drive/sync?tenantId=your-tenant-id"
```

### Scheduled Sync

The `periodicSync` function runs automatically every 5 minutes. To change the schedule, edit `inngest/scheduled.ts`:

```typescript
{ cron: '*/5 * * * *' } // Every 5 minutes
{ cron: '*/10 * * * *' } // Every 10 minutes
{ cron: '0 * * * *' } // Every hour
```

## Event Flow

### New File Detected

1. `syncTenantDrive` detects new file
2. Sends `google-drive/file.new` event
3. `handleNewFile` function triggered
4. Logs to `sync_logs` table
5. Sends `document/ingest` event (triggers ingestion pipeline)

### File Updated

1. `syncTenantDrive` detects file modification
2. Sends `google-drive/file.updated` event
3. `handleUpdatedFile` function triggered
4. Finds existing document in database
5. Sends `document/ingest` event (creates new version)

### File Deleted

1. `syncTenantDrive` detects file missing
2. Sends `google-drive/file.deleted` event
3. `handleDeletedFile` function triggered
4. Archives document (sets status to ARCHIVED)
5. Archives current version if LIVE

## Sync Logs

All sync operations are logged to the `sync_logs` table:

```sql
SELECT * FROM sync_logs 
WHERE tenant_id = 'your-tenant-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

Log entries include:
- Action type (sync, create, update, delete, webhook)
- Status (started, success, failed)
- Details (JSONB with file info, counts, etc.)
- Duration (for completed operations)

## Monitoring

### Inngest Dashboard

View function runs, retries, and errors in the Inngest dashboard:
- Local: http://localhost:8288
- Production: https://app.inngest.com

### Database Queries

```sql
-- Recent sync activity
SELECT 
  tenant_id,
  action,
  status,
  details,
  created_at
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Sync success rate
SELECT 
  action,
  status,
  COUNT(*) as count
FROM sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action, status;
```

## Error Handling

### Retries

- `syncTenantDrive`: 2 retries
- `handleNewFile`: 3 retries
- `handleUpdatedFile`: 3 retries
- `handleDeletedFile`: 1 retry

### Failed Syncs

Failed syncs are logged with `status: 'failed'` and error details. Check logs:

```sql
SELECT * FROM sync_logs 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## Performance

### Polling vs Webhooks

- **Polling**: Simple, works everywhere, but less efficient
- **Webhooks**: Real-time, efficient, but requires public URL

### Optimization Tips

1. **Adjust Polling Interval**: Based on how often files change
2. **Use Webhooks**: For production with high file change frequency
3. **Batch Processing**: Process multiple files in parallel
4. **Filter File Types**: Only process allowed file types (configured in tenant settings)

## Troubleshooting

### Sync Not Running

1. Check Inngest is running: `http://localhost:8288`
2. Verify scheduled function is registered
3. Check function logs in Inngest dashboard
4. Verify tenant has `google_drive_folder_id` set

### Files Not Detected

1. Verify Google Drive is connected (check `google_oauth_tokens`)
2. Check folder ID is correct
3. Verify file types are allowed (check tenant settings)
4. Check sync logs for errors

### Webhook Not Working

1. Verify webhook URL is publicly accessible
2. Check webhook token matches
3. Verify channel is still active (expires after 7 days)
4. Check webhook logs in `sync_logs` table

## Next Steps

- ✅ Sync watcher implemented
- ⏳ Ingestion pipeline (Stage 3 - next)
- ⏳ Webhook channel management UI
- ⏳ Sync status dashboard
