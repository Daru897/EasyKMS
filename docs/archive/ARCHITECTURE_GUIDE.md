# Architecture Guide: Adding Features Safely

This guide explains how to add new features to the dashboard without breaking existing connections and integrations.

## 🏗️ Current Architecture

### Core Components (DO NOT MODIFY)
These are foundational and should remain stable:

1. **Authentication System**
   - `contexts/AuthContext.tsx` - User session management
   - `utils/supabase/client.ts` - Browser client (cookie-based)
   - `utils/supabase/server.ts` - Server client (cookie-based)
   - `utils/supabase/middleware.ts` - Route protection
   - `app/auth/callback/route.ts` - OAuth callback handler

2. **Database Layer**
   - `supabase/` - All SQL migrations
   - `utils/supabase/server.ts` - Database access utilities

3. **Integration Systems** (Keep Stable)
   - `lib/google-oauth.ts` - Google OAuth core
   - `utils/google-oauth/server.ts` - Google token management
   - `utils/google-drive/server.ts` - Google Drive operations
   - `lib/pinecone.ts` - Pinecone client
   - `utils/pinecone/server.ts` - Vector operations
   - `lib/inngest.ts` - Background jobs
   - `inngest/` - Job functions

### Dashboard Components (SAFE TO MODIFY)
These can be enhanced without affecting connections:

- `app/dashboard/page.tsx` - Main dashboard page
- `components/GoogleDriveConnector.tsx` - UI component (safe to style)
- `components/FolderSelector.tsx` - UI component (safe to style)

## ✅ Safe Feature Addition Patterns

### 1. Adding New Dashboard Sections

**Pattern:**
```typescript
// In app/dashboard/page.tsx
// Add new sections AFTER existing sections
return (
  <main>
    {/* Existing Google Drive Section - DON'T MODIFY */}
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {/* Google Drive content */}
    </div>

    {/* NEW FEATURE SECTION - Safe to add */}
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2>New Feature</h2>
      {/* Your new feature */}
    </div>
  </main>
);
```

**Rules:**
- ✅ Add new sections below existing ones
- ✅ Use same styling patterns (Tailwind classes)
- ✅ Don't modify existing section structure
- ✅ Create new API routes for new features

### 2. Adding New API Routes

**Pattern:**
```typescript
// app/api/new-feature/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Always check auth first
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Your feature logic here
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('[New Feature] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Rules:**
- ✅ Always authenticate first
- ✅ Use consistent error handling
- ✅ Don't modify existing API routes
- ✅ Create new routes in `app/api/your-feature/`

### 3. Adding New Database Tables

**Pattern:**
```sql
-- supabase/NewFeature.sql
-- Create new table
CREATE TABLE new_feature_table (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- your columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE new_feature_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their tenant's data"
  ON new_feature_table FOR SELECT
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));
```

**Rules:**
- ✅ Create new SQL files in `supabase/`
- ✅ Always include `tenant_id` for multi-tenancy
- ✅ Enable RLS and add policies
- ✅ Don't modify existing tables (use migrations if needed)

### 4. Adding New Components

**Pattern:**
```typescript
// components/NewFeature.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function NewFeature({ tenantId }: { tenantId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data
    fetch(`/api/new-feature?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => setData(data));
  }, [tenantId]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Your component */}
    </div>
  );
}
```

**Rules:**
- ✅ Create new files in `components/`
- ✅ Use `useAuth()` for user context
- ✅ Accept `tenantId` as prop for multi-tenancy
- ✅ Don't modify existing components' core logic

## 🚫 What NOT to Modify

### Critical Files (Breaking Changes)
- ❌ `contexts/AuthContext.tsx` - Core auth logic
- ❌ `utils/supabase/*` - Database/SSR clients
- ❌ `middleware.ts` - Route protection
- ❌ `lib/google-oauth.ts` - OAuth core
- ❌ `lib/pinecone.ts` - Vector DB client
- ❌ `lib/inngest.ts` - Job queue
- ❌ `inngest/functions.ts` - Sync logic
- ❌ `inngest/ingestion.ts` - Ingestion pipeline

### If You Must Modify
1. **Create a new version** (e.g., `AuthContextV2.tsx`)
2. **Test thoroughly** before replacing
3. **Keep old version** as backup
4. **Document changes** in `CHANGELOG.md`

## 📋 Feature Addition Checklist

Before adding a new feature:

- [ ] **Authentication**: Does it require user auth? Use `useAuth()` hook
- [ ] **Multi-tenancy**: Does it need tenant isolation? Pass `tenantId`
- [ ] **API Routes**: Create new routes in `app/api/your-feature/`
- [ ] **Database**: Create new tables in `supabase/YourFeature.sql`
- [ ] **Error Handling**: Use consistent error patterns
- [ ] **Styling**: Match existing Tailwind patterns
- [ ] **Testing**: Test with existing features enabled
- [ ] **Documentation**: Update relevant README files

## 🎯 Example: Adding a "Documents List" Feature

### Step 1: Create Database Table
```sql
-- supabase/DocumentsList.sql
-- (Already exists, but this is the pattern)
```

### Step 2: Create API Route
```typescript
// app/api/documents/list/route.ts
export async function GET(request: Request) {
  // Auth check
  // Fetch documents
  // Return JSON
}
```

### Step 3: Create Component
```typescript
// components/DocumentsList.tsx
export default function DocumentsList({ tenantId }: { tenantId: string }) {
  // Fetch and display documents
}
```

### Step 4: Add to Dashboard
```typescript
// app/dashboard/page.tsx
import DocumentsList from '@/components/DocumentsList';

// In return statement, add:
<DocumentsList tenantId={tenantId} />
```

## 🔒 Connection Safety

### Google Drive Integration
- **Status**: Working (with error handling)
- **Files**: `components/GoogleDriveConnector.tsx`, `components/FolderSelector.tsx`
- **Safe to**: Style, add UI enhancements
- **Don't modify**: Core connection logic in `utils/google-oauth/server.ts`

### Pinecone Integration
- **Status**: Working
- **Files**: `utils/pinecone/server.ts`, `lib/pinecone.ts`
- **Safe to**: Add new vector operations
- **Don't modify**: Namespace isolation logic

### Inngest Jobs
- **Status**: Working
- **Files**: `inngest/functions.ts`, `inngest/ingestion.ts`
- **Safe to**: Add new job functions
- **Don't modify**: Existing sync/ingestion logic

## 📝 Best Practices

1. **Isolation**: New features should be isolated modules
2. **No Side Effects**: Don't modify shared state unexpectedly
3. **Error Boundaries**: Wrap new features in error handling
4. **Progressive Enhancement**: Features should degrade gracefully
5. **Testing**: Test new features with all integrations enabled

## 🎨 Dashboard Enhancement Ideas (Safe to Add)

1. **Statistics Cards**
   - Document count
   - Sync status
   - Recent activity

2. **Document Management**
   - Document list view
   - Search/filter
   - Status badges

3. **Activity Feed**
   - Recent syncs
   - Document updates
   - User actions

4. **Settings Panel**
   - Tenant settings
   - Sync preferences
   - Notification settings

5. **Analytics Dashboard**
   - Usage stats
   - Performance metrics
   - Growth charts

All of these can be added as new components and sections without touching existing connection logic!

---

**Remember**: When in doubt, create new files rather than modifying existing ones. This ensures existing connections remain stable.
