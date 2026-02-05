# Getting Started with IKMS

This guide will help you set up and run the IKMS platform in under 30 minutes.

---

## Prerequisites

### Required Software
- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **npm**: v9 or higher (comes with Node.js)
- **Git**: For version control ([Download](https://git-scm.com/))

### Required Accounts & Services
- **Supabase Account** ([Sign up](https://supabase.com/))
- **Pinecone Account** ([Sign up](https://www.pinecone.io/))
- **Google Cloud Account** ([Sign up](https://console.cloud.google.com/))
- **OpenAI Account** ([Sign up](https://platform.openai.com/)) - For embeddings

### Optional Services
- **LlamaParse Account** ([Sign up](https://cloud.llamaindex.ai/)) - For better document parsing
- **Inngest Account** ([Sign up](https://www.inngest.com/)) - For production deployment

---

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone <your-repo-url>
cd IKMS

# Navigate to the Next.js project
cd knowbot-kms

# Install dependencies
npm install
```

---

## Step 2: Set Up Supabase

### 2.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Choose organization, name, database password
4. Select region closest to you
5. Wait for project to be created (~2 minutes)

### 2.2 Get Your Credentials

From your Supabase project dashboard:
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJh...`)
3. Go to **Settings** → **Database** → **Connection String**
4. Switch to **Connection Pooling** mode
5. Copy the **service_role key** from **Settings** → **API** → **service_role**

### 2.3 Run Database Migrations

1. Open Supabase **SQL Editor**
2. Run migrations in this exact order:

```sql
-- 1. Extensions
-- Copy and paste from: ../supabase/Extensions.sql

-- 2. Tables
-- Copy and paste from: ../supabase/Tables.sql

-- 3. Versioning
-- Copy and paste from: ../supabase/Versioning.sql

-- 4. Approval
-- Copy and paste from: ../supabase/Approval.sql

-- 5. Knowledge Gap
-- Copy and paste from: ../supabase/Knowledge_Gap.sql

-- 6. Sync Logs
-- Copy and paste from: ../supabase/Synclogs.sql

-- 7. Google OAuth
-- Copy and paste from: ../supabase/Google_OAuth.sql

-- 8. Enable RLS
-- Copy and paste from: ../supabase/EnableRLS.sql

-- 9. RLS Policies
-- Copy and paste from: ../supabase/RSL_Policies.sql

-- 10. Triggers & Functions
-- Copy and paste from: ../supabase/Triggers&Functions.sql

-- 11. Live Propagation
-- Copy and paste from: ../supabase/Live_propagation.sql
```

**Verify**: Run this query to confirm tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see: `tenants`, `documents`, `document_versions`, etc.

---

## Step 3: Set Up Pinecone

### 3.1 Create Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Click "Create Index"
3. Configure:
   - **Name**: `knowbot-kms`
   - **Dimensions**: `1536` (for OpenAI embeddings)
   - **Metric**: `cosine`
   - **Cloud**: Choose your region
4. Click "Create Index"

### 3.2 Get API Key

1. Go to **API Keys** in Pinecone dashboard
2. Copy your API key (starts with `pcsk_...`)

---

## Step 4: Set Up Google Cloud

### 4.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Note your project name

### 4.2 Enable Google Drive API

1. Navigate to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click **Enable**

### 4.3 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **External** (unless G Suite)
   - App name: `IKMS` (or your choice)
   - Support email: Your email
   - Add scope: `https://www.googleapis.com/auth/drive.readonly`
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `IKMS Web Client`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/google-oauth/callback` (development)
     - `https://yourdomain.com/api/google-oauth/callback` (production)
5. Click **Create**
6. Copy **Client ID** and **Client Secret**

---

## Step 5: Set Up OpenAI

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys**
3. Click **Create new secret key**
4. Name it (e.g., "IKMS Development")
5. Copy the key (starts with `sk-...`)

---

## Step 6: Configure Environment Variables

Create a `.env.local` file in the `knowbot-kms/` directory:

```bash
cd knowbot-kms
touch .env.local
```

Add the following (replace with your actual values):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Pinecone
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=knowbot-kms

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-oauth/callback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# Optional: LlamaParse (for better document parsing)
LLAMAPARSE_API_KEY=llx-...
LLAMAPARSE_API_URL=https://api.cloud.llamaindex.ai/api/parsing

# Optional: Microsoft Presidio (for advanced PII redaction)
PRESIDIO_API_URL=http://localhost:5001

# Optional: Inngest (for production deployment)
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Verify Environment Variables

```bash
npm run test:env
```

This will check if all required variables are set.

---

## Step 7: Create Your First Tenant

### Option A: Via SQL (Recommended for First Setup)

Open Supabase SQL Editor and run:

```sql
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Test Company', 'test-company', 'pro')
RETURNING id, name, slug;
```

**Save the `id`** - you'll need this for testing!

### Option B: Via API (After Server is Running)

```bash
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "slug": "test-company",
    "tier": "pro"
  }'
```

---

## Step 8: Start the Development Server

### Terminal 1: Next.js Dev Server

```bash
cd knowbot-kms
npm run dev
```

The app will start at: `http://localhost:3000`

### Terminal 2: Inngest Dev Server

```bash
npx inngest-cli dev
```

The Inngest dashboard will be at: `http://localhost:8288`

---

## Step 9: Verify Installation

### Quick Health Check (Browser)

1. Navigate to: `http://localhost:3000/test-system`
2. Enter your tenant ID (from Step 7)
3. Click "Run All Tests"
4. All checks should pass ✅

### Quick Health Check (Command Line)

```bash
# Check database connection
curl "http://localhost:3000/api/test-db?action=health"

# Check Pinecone connection
curl "http://localhost:3000/api/pinecone/test?action=health"

# Check if Inngest is running
curl "http://localhost:8288/api/health"
```

Expected results:
- Database: `{"success": true, "database": {"status": "connected"}}`
- Pinecone: `{"success": true, "message": "Pinecone connection successful"}`
- Inngest: Health status JSON

---

## Step 10: Connect Google Drive

1. Navigate to: `http://localhost:3000/dashboard`
2. Login with test credentials (or create an account)
3. Click **"Connect Google Drive"**
4. Complete OAuth flow
5. Select a folder from your Google Drive
6. Click **"Sync Now"** to start syncing documents

---

## Step 11: Test Document Ingestion

### 11.1 Add Test Document to Google Drive

1. Create a simple text file or PDF in your selected folder
2. Example: "Test_SOP.txt" with content:
   ```
   # Refund Policy
   
   To process a refund:
   1. Verify order number
   2. Check refund eligibility (within 30 days)
   3. Process refund via original payment method
   4. Send confirmation email to customer@example.com
   ```

### 11.2 Trigger Sync

```bash
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<your-tenant-id>"}'
```

### 11.3 Check Results

1. Go to Inngest Dashboard: `http://localhost:8288`
2. Look for:
   - `sync-tenant-drive` function run
   - `ingest-document` function run
3. Check database:
   ```sql
   SELECT d.title, d.current_status, dv.version_number, dv.word_count
   FROM documents d
   JOIN document_versions dv ON dv.document_id = d.id
   WHERE d.tenant_id = '<your-tenant-id>'
   ORDER BY d.created_at DESC;
   ```

Expected: Document with status `DRAFT`

---

## Common Setup Issues

### Issue: "Cannot connect to database"

**Solutions:**
1. Verify Supabase URL and keys in `.env.local`
2. Check Supabase project is active
3. Ensure RLS policies are applied
4. Try restarting dev server

### Issue: "Pinecone index not found"

**Solutions:**
1. Verify index name matches `PINECONE_INDEX_NAME`
2. Check index exists in Pinecone console
3. Verify API key has correct permissions
4. Ensure dimensions are set to 1536

### Issue: "Google OAuth redirect mismatch"

**Solutions:**
1. Verify redirect URI in Google Cloud Console matches exactly:
   - `http://localhost:3000/api/google-oauth/callback`
2. No trailing slashes
3. Check protocol (http vs https)
4. Clear browser cookies and try again

### Issue: "Sync not detecting files"

**Solutions:**
1. Verify folder ID is correct in database:
   ```sql
   SELECT google_drive_folder_id FROM tenants WHERE id = '<tenant-id>';
   ```
2. Check files are in the selected folder (not subfolders)
3. Verify Google Drive API quota not exceeded
4. Check sync logs for errors:
   ```sql
   SELECT * FROM sync_logs 
   WHERE tenant_id = '<tenant-id>' 
   ORDER BY created_at DESC LIMIT 5;
   ```

### Issue: "Inngest functions not appearing"

**Solutions:**
1. Ensure Inngest dev server is running (`npx inngest-cli dev`)
2. Verify `/api/inngest` route is accessible
3. Check terminal for function registration logs
4. Restart both dev servers

---

## Next Steps

Now that your development environment is set up:

1. **Explore the Architecture**: Read `02-ARCHITECTURE.md`
2. **Start Development**: See `03-DEVELOPMENT-GUIDE.md`
3. **Run Tests**: Follow `04-TESTING.md`
4. **Learn APIs**: Reference `05-API-REFERENCE.md`

---

## Quick Reference

### Start Development
```bash
# Terminal 1
cd knowbot-kms && npm run dev

# Terminal 2
npx inngest-cli dev
```

### Access Points
- **App**: http://localhost:3000
- **Inngest**: http://localhost:8288
- **Test System**: http://localhost:3000/test-system

### Useful Commands
```bash
# Check environment
npm run test:env

# Health check
curl "http://localhost:3000/api/test-db?action=health"

# Trigger sync
curl -X POST http://localhost:3000/api/google-drive/sync \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "<id>"}'
```

---

## Support & Resources

- **Documentation**: `/docs` folder
- **Project Overview**: `00-PROJECT-OVERVIEW.md`
- **Issues**: Check Inngest dashboard and database logs
- **Troubleshooting**: See `04-TESTING.md` for detailed guides

---

*Setup complete! You're ready to start developing. 🚀*
