CREATE TABLE tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  google_drive_folder_id TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')) DEFAULT 'basic',
  settings JSONB DEFAULT '{
    "sync_interval_minutes": 5,
    "auto_approve": false,
    "require_approval": true,
    "max_file_size_mb": 50,
    "allowed_file_types": [".pdf", ".docx", ".doc", ".txt", ".md"]
  }'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = TRUE;

CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  google_file_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mime_type TEXT,
  file_extension TEXT,
  file_size_bytes BIGINT,

  current_version_id UUID,
  current_status TEXT CHECK (current_status IN ('DRAFT','REVIEW','LIVE','ARCHIVED')) DEFAULT 'DRAFT',

  google_drive_metadata JSONB DEFAULT '{}'::JSONB,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('pending','syncing','synced','failed')) DEFAULT 'pending',
  sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (tenant_id, google_file_id)
);


CREATE TABLE document_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  storage_path TEXT,
  content_hash TEXT NOT NULL,
  raw_content_hash TEXT,
  parsed_markdown TEXT,

  word_count INTEGER,
  chunk_count INTEGER,

  status TEXT CHECK (status IN ('DRAFT','REVIEW','LIVE','ARCHIVED')) DEFAULT 'DRAFT',

  effective_date TIMESTAMPTZ,
  scheduled_publish_date TIMESTAMPTZ,
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  parent_version_id UUID REFERENCES document_versions(id),
  root_version_id UUID,

  sync_metadata JSONB DEFAULT '{}'::JSONB,
  parser_metadata JSONB DEFAULT '{}'::JSONB,

  pii_redacted BOOLEAN DEFAULT FALSE,
  pii_redaction_stats JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (document_id, version_number)
);

ALTER TABLE documents
ADD CONSTRAINT fk_current_version
FOREIGN KEY (current_version_id)
REFERENCES document_versions(id)
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE document_versions
ADD CONSTRAINT one_live_version_per_document
EXCLUDE USING gist (
  document_id WITH =,
  status WITH =
)
WHERE (status = 'LIVE');

CREATE TABLE document_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE document_version_categories (
  document_version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES document_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (document_version_id, category_id)
);

