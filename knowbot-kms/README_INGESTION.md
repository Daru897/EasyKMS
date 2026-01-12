# Document Ingestion Pipeline

This module implements the complete document ingestion pipeline that processes files from Google Drive and saves them as Draft documents in the database.

## Pipeline Steps

1. **Download File** - Downloads file from Google Drive
2. **Calculate Hash** - Creates content hash for duplicate detection
3. **Check Duplicate** - Verifies if document already exists
4. **Parse Document** - Converts PDF/DOCX to Markdown using LlamaParse
5. **PII Redaction** - Removes sensitive information (emails, phones, credit cards, SSNs)
6. **Auto-Tagging** - Suggests categories based on content
7. **Save as Draft** - Stores in database with DRAFT status

## Architecture

### Inngest Function

- **Function**: `ingestDocument`
- **Event**: `document/ingest`
- **Retries**: 2
- **Steps**: 9 steps with error handling

### Utilities

- `utils/pii-redaction.ts` - PII redaction (regex-based, with Presidio option)
- `utils/llamaparse.ts` - Document parsing (LlamaParse API)
- `utils/ml-tagging.ts` - Category suggestion (keyword-based, with OpenAI option)

## Setup

### 1. Environment Variables

```env
# LlamaParse (for document parsing)
LLAMAPARSE_API_KEY=your-llamaparse-api-key
LLAMAPARSE_API_URL=https://api.cloud.llamaindex.ai/api/parsing

# Microsoft Presidio (optional - for better PII redaction)
PRESIDIO_API_URL=http://localhost:5001

# OpenAI (optional - for better category tagging)
OPENAI_API_KEY=your-openai-api-key
```

### 2. LlamaParse Setup

1. Sign up at [LlamaIndex Cloud](https://cloud.llamaindex.ai/)
2. Get your API key
3. Add to environment variables

**Note**: LlamaParse is recommended for best results, especially for PDFs with tables and complex formatting.

### 3. PII Redaction

**Current Implementation**: Regex-based redaction
- Detects: emails, phone numbers, credit cards, SSNs
- Fast and works offline
- Good for common patterns

**Upgrade Option**: Microsoft Presidio
- More accurate name detection
- Better entity recognition
- Requires Presidio service running

### 4. Auto-Tagging

**Current Implementation**: Keyword-based
- Matches content against predefined category keywords
- Fast and works offline
- Returns top 3 categories

**Upgrade Options**:
- OpenAI embeddings + similarity search
- Transformers.js for client-side ML
- FastAPI service with custom ML models

## Usage

### Automatic Triggering

The ingestion pipeline is automatically triggered when:
1. New file detected in Google Drive → `handleNewFile` → `document/ingest`
2. File updated in Google Drive → `handleUpdatedFile` → `document/ingest`

### Manual Triggering

```typescript
import { inngest } from '@/lib/inngest';

await inngest.send({
  name: 'document/ingest',
  data: {
    tenantId: 'tenant-uuid',
    fileId: 'google-drive-file-id',
    documentId: 'existing-doc-id', // Optional, for updates
  },
});
```

## Pipeline Flow

### Step 1: Get File Metadata
- Retrieves file info from Google Drive
- Gets name, size, mime type, etc.

### Step 2: Download File
- Downloads file content as buffer
- Handles different file types

### Step 3: Calculate Hash
- Creates SHA-256 hash of file content
- Used for duplicate detection

### Step 4: Check Duplicate
- Compares content hash with existing versions
- Skips ingestion if exact duplicate found

### Step 5: Parse Document
- **Text files**: Direct text extraction
- **PDF/DOCX**: LlamaParse API
- **Fallback**: Simple extraction if LlamaParse unavailable
- Preserves tables, formatting, structure

### Step 6: PII Redaction
- Scans parsed text for sensitive data
- Replaces with `[TYPE_REDACTED]` placeholders
- Tracks redaction statistics

### Step 7: Auto-Tagging
- Analyzes content for category keywords
- Suggests top 3 categories
- Creates categories if they don't exist

### Step 8: Save as Draft
- Creates/updates document record
- Creates document version with:
  - Parsed markdown (redacted)
  - Content hash
  - Word count
  - PII redaction stats
  - Parser metadata
- Links suggested categories
- Sets status to DRAFT

### Step 9: Log Success
- Logs ingestion to `sync_logs` table
- Records version info, word count, categories

## Database Schema

### Documents Table
- `id` - Document UUID
- `tenant_id` - Tenant UUID
- `google_file_id` - Google Drive file ID
- `title` - Document title
- `current_status` - Set to 'DRAFT'
- `sync_status` - 'syncing' → 'synced'

### Document Versions Table
- `id` - Version UUID
- `document_id` - Parent document
- `version_number` - Auto-incremented
- `content_hash` - SHA-256 hash
- `parsed_markdown` - Redacted markdown content
- `pii_redacted` - Boolean flag
- `pii_redaction_stats` - JSONB with stats
- `parser_metadata` - JSONB with parser info
- `status` - Set to 'DRAFT'

## Error Handling

### Retries
- Function retries 2 times on failure
- Each step can fail independently
- Failed steps are logged

### Duplicate Detection
- Skips ingestion if content hash matches
- Returns existing version ID
- Prevents duplicate processing

### Fallbacks
- **LlamaParse unavailable**: Falls back to simple extraction
- **Presidio unavailable**: Falls back to regex redaction
- **OpenAI unavailable**: Falls back to keyword tagging

## Monitoring

### Check Ingestion Status

```sql
-- Recent ingestions
SELECT 
  d.title,
  dv.version_number,
  dv.status,
  dv.word_count,
  dv.pii_redacted,
  sl.created_at
FROM sync_logs sl
JOIN documents d ON d.id = sl.document_id
JOIN document_versions dv ON dv.document_id = d.id
WHERE sl.action IN ('create', 'update')
  AND sl.tenant_id = 'your-tenant-id'
ORDER BY sl.created_at DESC
LIMIT 10;
```

### Check PII Redaction Stats

```sql
SELECT 
  d.title,
  dv.pii_redaction_stats
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
WHERE dv.pii_redacted = true
  AND d.tenant_id = 'your-tenant-id'
ORDER BY dv.created_at DESC;
```

## Performance

### Processing Time
- **Text files**: ~1-2 seconds
- **PDF files**: ~5-10 seconds (with LlamaParse)
- **DOCX files**: ~3-5 seconds (with LlamaParse)

### Optimization Tips
1. **Use LlamaParse**: Better quality parsing
2. **Batch Processing**: Process multiple files in parallel
3. **Cache Results**: Cache parsed content for unchanged files
4. **Async Processing**: All steps run asynchronously

## Troubleshooting

### Ingestion Failing

1. **Check Inngest Dashboard**: View function runs and errors
2. **Check Sync Logs**: Look for failed ingestions
3. **Verify Google Drive Access**: Ensure tokens are valid
4. **Check File Size**: Verify file is within limits

### Parsing Issues

1. **LlamaParse Errors**: Check API key and quota
2. **Fallback Active**: Verify fallback parsing works
3. **File Format**: Ensure file type is supported

### PII Redaction Not Working

1. **Check Stats**: Verify `pii_redaction_stats` in database
2. **Test Patterns**: Verify regex patterns match your data
3. **Presidio Setup**: If using Presidio, check service is running

### Categories Not Suggested

1. **Check Keywords**: Verify category keywords match content
2. **Content Quality**: Ensure parsed text is readable
3. **Custom Categories**: Check if tenant has custom categories

## Next Steps

- ✅ Ingestion pipeline implemented
- ⏳ Approval interface (Stage 4)
- ⏳ Vector indexing (Stage 4)
- ⏳ Query engine (Stage 5)

## Upgrades

### Better PII Redaction
- Integrate Microsoft Presidio service
- Add custom entity recognition
- Support for international formats

### Better Parsing
- Use LlamaParse for all file types
- Add OCR for scanned PDFs
- Preserve more formatting

### Better Tagging
- Use OpenAI embeddings
- Train custom ML models
- Support for tenant-specific categories
