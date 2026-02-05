# API Reference

Complete API documentation for the IKMS platform.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Documents API](#documents-api)
3. [Google Drive API](#google-drive-api)
4. [Google OAuth API](#google-oauth-api)
5. [Pinecone API](#pinecone-api)
6. [Testing Utilities](#testing-utilities)
7. [Error Codes](#error-codes)
8. [Query Engine API](#query-engine-api)
9. [Knowledge Gaps API](#knowledge-gaps-api)
10. [Reindex API](#reindex-api)
11. [Feedback API](#feedback-api)
12. [Analytics API](#analytics-api)
13. [Knowledge Gaps Admin API](#knowledge-gaps-admin-api)
14. [Sync Logs API](#sync-logs-api)
15. [Analytics Exports API](#analytics-exports-api)
16. [Analytics Insights API](#analytics-insights-api)
17. [Reports UI](#reports-ui)

---

## Authentication

All API requests require authentication via Supabase session cookies.

### Authentication Flow

```
1. User logs in → Supabase Auth
2. JWT token generated with tenant_id
3. Token stored in httpOnly cookie
4. All requests include cookie automatically
5. API routes validate session
```

### Getting Current User

```typescript
import { createClient } from '@/utils/supabase/server';

const supabase = createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (error || !user) {
  // Unauthorized
}

const tenantId = user.user_metadata?.tenant_id;
```

---

## Documents API

### List Documents

**GET** `/api/documents`

List documents with filtering and pagination.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status (DRAFT/LIVE/ARCHIVED) |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page (max: 50) |
| `search` | string | No | - | Search in title |

#### Example Request

```bash
curl "http://localhost:3000/api/documents?status=DRAFT&page=1&limit=10" \
  -H "Cookie: session-cookie"
```

#### Example Response

```json
{
  "success": true,
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Refund Policy",
      "google_file_id": "1abc...xyz",
      "current_status": "DRAFT",
      "sync_status": "synced",
      "created_at": "2025-01-08T10:00:00Z",
      "updated_at": "2025-01-08T10:30:00Z",
      "current_version": {
        "id": "version-id",
        "version_number": 1,
        "word_count": 250,
        "pii_redacted": true,
        "chunk_count": null,
        "indexed_at": null
      }
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

---

### Get Document

**GET** `/api/documents/[id]`

Get full document details including version history.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Document ID |

#### Example Request

```bash
curl "http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000" \
  -H "Cookie: session-cookie"
```

#### Example Response

```json
{
  "success": true,
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Refund Policy",
    "google_file_id": "1abc...xyz",
    "current_status": "LIVE",
    "current_version": {
      "id": "version-id",
      "version_number": 2,
      "status": "LIVE",
      "parsed_markdown": "# Refund Policy\n\nTo process a refund...",
      "word_count": 250,
      "pii_redacted": true,
      "pii_redaction_stats": {
        "emailsFound": 1,
        "phonesFound": 0
      },
      "chunk_count": 3,
      "indexed_at": "2025-01-08T11:00:00Z",
      "created_at": "2025-01-08T10:30:00Z"
    },
    "categories": [
      { "id": "cat-id", "name": "Billing", "color": "#3B82F6" },
      { "id": "cat-id-2", "name": "Support", "color": "#10B981" }
    ],
    "versions": [
      {
        "id": "version-id-2",
        "version_number": 2,
        "status": "LIVE",
        "created_at": "2025-01-08T10:30:00Z"
      },
      {
        "id": "version-id-1",
        "version_number": 1,
        "status": "ARCHIVED",
        "created_at": "2025-01-08T10:00:00Z"
      }
    ],
    "approvals": [
      {
        "id": "approval-id",
        "approved_by_user_id": "user-id",
        "action": "APPROVED",
        "comment": "Looks good",
        "created_at": "2025-01-08T10:45:00Z"
      }
    ]
  }
}
```

---

### Approve Document

**POST** `/api/documents/[id]/approve`

Approve a DRAFT document, making it LIVE and triggering vector indexing.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Document ID |

#### Request Body

```json
{
  "comment": "Approved for publishing"  // Optional
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/documents/550e8400.../approve" \
  -H "Cookie: session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved for publishing"}'
```

#### Example Response

```json
{
  "success": true,
  "message": "Document approved successfully",
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "current_status": "LIVE",
    "current_version": {
      "id": "version-id",
      "version_number": 1,
      "status": "LIVE"
    }
  }
}
```

#### Side Effects

1. Document status updated to LIVE
2. Previous LIVE version archived (if exists)
3. Old vectors deleted from Pinecone
4. Inngest event triggered: `document/index`
5. Approval logged to `document_approvals`
6. Action logged to `sync_logs`

---

### Reject Document

**POST** `/api/documents/[id]/reject`

Reject a DRAFT document with a reason.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Document ID |

#### Request Body

```json
{
  "reason": "Incorrect information",  // Required
  "archive": false                    // Optional, default: false
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/documents/550e8400.../reject" \
  -H "Cookie: session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Incorrect information",
    "archive": false
  }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Document rejected successfully",
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "current_status": "DRAFT",  // or "ARCHIVED" if archive: true
    "rejection": {
      "reason": "Incorrect information",
      "rejected_by": "user-id",
      "rejected_at": "2025-01-08T11:00:00Z"
    }
  }
}
```

---

## Google Drive API

### Trigger Sync

**POST** `/api/google-drive/sync`

Manually trigger a sync for a tenant's Google Drive folder.

#### Request Body

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/google-drive/sync" \
  -H "Cookie: session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "550e8400-e29b-41d4-a716-446655440000"}'
```

#### Example Response

```json
{
  "success": true,
  "message": "Sync job triggered",
  "eventId": "evt_01HQZX...",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "folderId": "1abc...xyz"
}
```

#### Side Effects

- Inngest event sent: `google-drive/sync`
- Sync job runs in background
- New/updated/deleted files detected
- Ingestion jobs triggered for changes

---

### Get Sync Status

**GET** `/api/google-drive/sync`

Get recent sync activity and status for a tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | UUID | Yes | Tenant ID |

#### Example Request

```bash
curl "http://localhost:3000/api/google-drive/sync?tenantId=550e8400..." \
  -H "Cookie: session-cookie"
```

#### Example Response

```json
{
  "success": true,
  "connected": true,
  "folderId": "1abc...xyz",
  "recentSyncs": [
    {
      "id": "log-id",
      "action": "sync",
      "status": "success",
      "details": {
        "files_checked": 10,
        "new_files": 2,
        "updated_files": 1,
        "deleted_files": 0
      },
      "duration_ms": 3450,
      "created_at": "2025-01-08T10:00:00Z"
    }
  ],
  "lastSync": {
    "status": "success",
    "created_at": "2025-01-08T10:00:00Z"
  }
}
```

---

### List Folders

**GET** `/api/google-drive/folders`

List folders from Google Drive for selection.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | UUID | Yes | Tenant ID |

#### Example Request

```bash
curl "http://localhost:3000/api/google-drive/folders?tenantId=550e8400..." \
  -H "Cookie: session-cookie"
```

#### Example Response

```json
{
  "success": true,
  "folders": [
    {
      "id": "1abc...xyz",
      "name": "Company Documents",
      "modifiedTime": "2025-01-08T09:00:00Z"
    },
    {
      "id": "1def...uvw",
      "name": "SOPs",
      "modifiedTime": "2025-01-07T15:30:00Z"
    }
  ]
}
```

---

### Set Folder

**POST** `/api/google-drive/set-folder`

Set the Google Drive folder to sync for a tenant.

#### Request Body

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "folderId": "1abc...xyz"
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/google-drive/set-folder" \
  -H "Cookie: session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "550e8400...",
    "folderId": "1abc...xyz"
  }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Folder selected successfully",
  "tenant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "google_drive_folder_id": "1abc...xyz"
  }
}
```

---

### Webhook Handler

**POST** `/api/google-drive/webhook`

Handles Google Drive push notifications (webhooks).

#### Headers

| Header | Description |
|--------|-------------|
| `x-goog-channel-id` | Channel ID |
| `x-goog-resource-state` | State (sync/change/exists) |
| `x-goog-channel-token` | Token (contains tenant ID) |

#### Example (Google sends this)

```bash
# Google Drive sends this automatically
POST /api/google-drive/webhook
x-goog-channel-id: tenant-550e8400...
x-goog-resource-state: change
x-goog-channel-token: tenant-550e8400...
```

#### Response

```
200 OK
```

---

## Google OAuth API

### Authorize

**GET** `/api/google-oauth/authorize`

Initiates Google OAuth flow.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | UUID | Yes | Tenant ID |

#### Example

```
GET /api/google-oauth/authorize?tenantId=550e8400...
```

**Response**: Redirects to Google OAuth consent screen

---

### Callback

**GET** `/api/google-oauth/callback`

Handles OAuth callback from Google.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code |
| `state` | string | CSRF token |

#### Example (Google sends this)

```
GET /api/google-oauth/callback?code=4/0AfJ...&state=550e8400...
```

**Response**: Redirects to dashboard with success message

---

### Get Status

**GET** `/api/google-oauth/status`

Get Google Drive connection status for a tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | UUID | Yes | Tenant ID |

#### Example Request

```bash
curl "http://localhost:3000/api/google-oauth/status?tenantId=550e8400..." \
  -H "Cookie: session-cookie"
```

#### Example Response (Connected)

```json
{
  "success": true,
  "connected": true,
  "email": "user@gmail.com",
  "expiresAt": "2025-01-09T10:00:00Z"
}
```

#### Example Response (Not Connected)

```json
{
  "success": true,
  "connected": false
}
```

---

### Disconnect

**POST** `/api/google-oauth/disconnect`

Disconnect Google Drive for a tenant.

#### Request Body

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/google-oauth/disconnect" \
  -H "Cookie: session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "550e8400..."}'
```

#### Example Response

```json
{
  "success": true,
  "message": "Google Drive disconnected successfully"
}
```

---

## Pinecone API

### Test Connection

**GET** `/api/pinecone/test`

Test Pinecone connection and operations.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Action to perform |
| `tenantId` | UUID | No | Required for some actions |

#### Actions

**health** - Test connection:
```bash
curl "http://localhost:3000/api/pinecone/test?action=health"
```

Response:
```json
{
  "success": true,
  "message": "Pinecone connection successful",
  "index": {
    "name": "knowbot-kms",
    "dimension": 1536,
    "totalVectorCount": 150
  }
}
```

**namespace** - Get namespace for tenant:
```bash
curl "http://localhost:3000/api/pinecone/test?tenantId=550e8400...&action=namespace"
```

Response:
```json
{
  "success": true,
  "tenantId": "550e8400...",
  "namespace": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Namespace generated successfully"
}
```

**stats** - Get namespace statistics:
```bash
curl "http://localhost:3000/api/pinecone/test?tenantId=550e8400...&action=stats"
```

Response:
```json
{
  "success": true,
  "namespace": "550e8400...",
  "stats": {
    "vectorCount": 45,
    "dimension": 1536
  }
}
```

---

## Testing Utilities

### Database Test

**GET/POST** `/api/test-db`

Test database connection and operations.

#### GET - Health Check

```bash
curl "http://localhost:3000/api/test-db?action=health"
```

Response:
```json
{
  "success": true,
  "database": {
    "status": "connected"
  },
  "tables": {
    "tenants": { "count": 5, "status": "ok" },
    "documents": { "count": 23, "status": "ok" }
  }
}
```

#### POST - Create Test Tenant

```bash
curl -X POST "http://localhost:3000/api/test-db" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "slug": "test-company",
    "tier": "pro"
  }'
```

Response:
```json
{
  "success": true,
  "tenant": {
    "id": "550e8400...",
    "name": "Test Company",
    "slug": "test-company"
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid parameters or body |
| 401 | Unauthorized | No valid session |
| 403 | Forbidden | No access to resource |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate or conflicting resource |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",  // Optional
  "details": {}          // Optional additional info
}
```

### Common Error Codes

#### Authentication Errors

```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

```json
{
  "error": "No tenant association",
  "code": "NO_TENANT"
}
```

#### Validation Errors

```json
{
  "error": "Missing required parameter: tenantId",
  "code": "MISSING_PARAMETER"
}
```

```json
{
  "error": "Invalid UUID format",
  "code": "INVALID_FORMAT"
}
```

#### Resource Errors

```json
{
  "error": "Document not found",
  "code": "NOT_FOUND"
}
```

```json
{
  "error": "Document not in DRAFT status",
  "code": "INVALID_STATUS"
}
```

#### Integration Errors

```json
{
  "error": "Google Drive not connected",
  "code": "GOOGLE_DRIVE_NOT_CONNECTED"
}
```

```json
{
  "error": "Failed to refresh Google token",
  "code": "TOKEN_REFRESH_FAILED"
}
```

---

## Rate Limits

Currently no rate limits enforced. In production, consider:

- **API Routes**: 100 requests/minute per IP
- **Google Drive API**: Quota from Google Cloud
- **OpenAI API**: Based on your OpenAI plan
- **Pinecone**: Based on your Pinecone plan

---

## Webhooks

### Google Drive Webhook Format

```
POST /api/google-drive/webhook
Headers:
  x-goog-channel-id: tenant-{tenant_id}
  x-goog-resource-state: change
  x-goog-channel-token: tenant-{tenant_id}
  x-goog-message-number: 123
  x-goog-resource-id: abc123
```

---

## SDK Examples

### TypeScript/JavaScript

```typescript
// Approve document
const response = await fetch(`/api/documents/${documentId}/approve`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ comment: 'Approved' }),
  credentials: 'include'  // Important: include cookies
});

const result = await response.json();
if (result.success) {
  console.log('Document approved:', result.document);
}
```

### Python

```python
import requests

# Trigger sync
response = requests.post(
    'http://localhost:3000/api/google-drive/sync',
    json={'tenantId': 'tenant-id'},
    cookies=session_cookies
)

if response.ok:
    data = response.json()
    print(f"Sync triggered: {data['eventId']}")
```

### cURL

```bash
# Get documents
curl "http://localhost:3000/api/documents?status=DRAFT" \
  -H "Cookie: sb-access-token=..." \
  -H "Cookie: sb-refresh-token=..."
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

---

## Filtering

**Documents API** supports:
- `status`: Filter by status (DRAFT/LIVE/ARCHIVED)
- `search`: Search in title
- `category`: Filter by category ID (future)

Example:
```
GET /api/documents?status=DRAFT&search=refund&page=1
```

---

## Best Practices

### Authentication
- Always include session cookies
- Check for 401 responses and redirect to login
- Never expose API keys in client code

### Error Handling
```typescript
try {
  const response = await fetch('/api/documents');
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  // Handle success
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
}
```

### Polling
- Use reasonable intervals (5+ seconds)
- Implement exponential backoff on errors
- Stop polling when no longer needed

### Batch Operations
- Use pagination for large lists
- Process in chunks to avoid timeouts
- Use Inngest for long-running operations

---

*For implementation examples, see `03-DEVELOPMENT-GUIDE.md`*
*For testing, see `04-TESTING.md`*

---

## Query Engine API

### POST /api/query
Run a hybrid query (semantic + keyword) with silence protocol and optional time‑machine filtering.

**Body**:
```json
{
  "query": "How do I reset a customer password?",
  "asOf": "2025-01-10T12:00:00Z",
  "topK": 10,
  "minScore": 0.75
}
```

**Response**:
```json
{
  "type": "ANSWER",
  "answer": "To reset a customer password, verify identity then use the reset tool in the CRM. [1]",
  "confidence": 0.84,
  "sources": [
    {
      "document_id": "uuid",
      "document_version_id": "uuid",
      "document_title": "Password Reset SOP",
      "chunk_index": 2,
      "chunk_text": "Step 1: Verify identity ...",
      "score": 0.84,
      "effective_date": "2025-01-05T00:00:00Z"
    }
  ],
  "retrieval": {
    "semanticCount": 10,
    "keywordCount": 3,
    "mergedCount": 10
  },
  "timings": {
    "embeddingMs": 123,
    "semanticMs": 210,
    "keywordMs": 85,
    "llmMs": 420,
    "totalMs": 920
  }
}
```

---

## Knowledge Gaps API

### GET /api/knowledge-gaps
Read knowledge gaps logged by the silence protocol.

**Query Parameters**:
- `limit` (optional, default 50, max 200)
- `resolved` (optional, `true|false`)

**Response**:
```json
{
  "success": true,
  "gaps": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "query_text": "What is the refund SLA?",
      "query_context": "{\"asOf\":null,\"minScore\":0.75,\"topScore\":0.31}",
      "agent_id": "uuid",
      "confidence_score": 0.31,
      "is_resolved": false,
      "created_at": "2025-01-12T10:15:00Z"
    }
  ]
}
```

---

## Reindex API

### POST /api/reindex
Reindex LIVE document versions to backfill Pinecone metadata.

**Body**:
```json
{
  "limit": 50
}
```

---

## Feedback API

### POST /api/feedback
Submit agent feedback about an answer.

**Body**:
```json
{
  "queryText": "How do I reset a password?",
  "answerText": "Verify identity then use the CRM reset tool. [1]",
  "rating": "helpful",
  "issue": "Optional issue description"
}
```

**Response**:
```json
{
  "success": true,
  "feedbackId": "uuid"
}
```

---

## Analytics API

### GET /api/analytics/usage
Get usage statistics for the admin dashboard.

**Query Parameters**:
- `days` (optional, default 30)

**Response**:
```json
{
  "totalQueries": 1200,
  "queriesWithAnswers": 980,
  "queriesNoData": 220,
  "avgResponseTimeMs": 640,
  "queryTrend": [
    { "date": "2026-02-01", "count": 40 }
  ],
  "topQueries": [
    { "query": "refund policy", "count": 31 }
  ]
}
```

### GET /api/analytics/reports
Get report-ready aggregated metrics with filters.

**Query Parameters**:
- `days` (optional, default 30)
- `channel` (optional, `all|agent|admin|api`)
- `responseType` (optional, `all|ANSWER|NO_DATA`)
- `category` (optional, string)

**Response**:
```json
{
  "totalQueries": 1200,
  "queriesWithAnswers": 980,
  "queriesNoData": 220,
  "avgResponseTimeMs": 640,
  "topQueries": [
    { "query": "refund policy", "count": 31 }
  ]
}
```

### GET /api/analytics/trends
Get trend data for a specific metric.

**Query Parameters**:
- `days` (optional, default 30)
- `metric` (optional, `queries|answer_rate|latency|no_data`)
- `channel` (optional, `all|agent|admin|api`)
- `responseType` (optional, `all|ANSWER|NO_DATA`)
- `category` (optional, string)

**Response**:
```json
{
  "success": true,
  "metric": "queries",
  "trend": [
    { "date": "2026-02-01", "value": 40 }
  ]
}
```

---

## Analytics Exports API

### GET /api/analytics/exports
Export query logs as CSV or JSON.

**Query Parameters**:
- `days` (optional, default 30)
- `format` (optional, `csv|json`, default `json`)
- `channel` (optional, `all|agent|admin|api`)
- `responseType` (optional, `all|ANSWER|NO_DATA`)
- `category` (optional, string)

**Response (CSV)**:
Returns a CSV file download.

**Response (JSON)**:
```json
{
  "success": true,
  "logs": [
    {
      "query_text": "refund policy",
      "response_type": "ANSWER",
      "confidence_score": 0.82,
      "latency_ms": 640,
      "sources_count": 4,
      "categories": ["Billing"],
      "channel": "agent",
      "created_at": "2026-02-05T12:00:00Z"
    }
  ]
}
```

---

## Analytics Insights API

### GET /api/analytics/insights
Get insight summaries for dashboards.

**Query Parameters**:
- `days` (optional, default 30)
- `channel` (optional, `all|agent|admin|api`)
- `responseType` (optional, `all|ANSWER|NO_DATA`)
- `category` (optional, string)

**Response**:
```json
{
  "success": true,
  "topNoDataQueries": [
    { "query": "refund SLA", "count": 8 }
  ],
  "topAnsweredQueries": [
    { "query": "reset password", "count": 12 }
  ],
  "trendingUpQueries": [
    { "query": "chargeback process", "delta": 5 }
  ],
  "topCategories": [
    { "category": "Billing", "count": 14 }
  ]
}
```

---

## Reports UI

**Route**: `/admin/reports`

Provides export controls for CSV/JSON reports with filters:
- Date range (7/30/90)
- Channel
- Response type
- Category

---

## Knowledge Gaps Admin API

### GET /api/knowledge-gaps/[id]
Get a single knowledge gap entry.

**Response**:
```json
{
  "success": true,
  "gap": {
    "id": "uuid",
    "query_text": "What is the refund SLA?",
    "is_resolved": false
  }
}
```

### PATCH /api/knowledge-gaps/[id]
Resolve or unresolve a knowledge gap.

**Body**:
```json
{
  "isResolved": true,
  "resolution": "Added updated refund SLA SOP"
}
```

**Response**:
```json
{
  "success": true
}
```

---

## Sync Logs API

### GET /api/google-drive/sync/logs
Get recent Google Drive sync activity.

**Query Parameters**:
- `tenantId` (required)
- `limit` (optional, default 10)

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "id": "log-id",
      "action": "sync",
      "status": "success",
      "created_at": "2026-02-05T10:00:00Z"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "reindexed": 12
}
```
