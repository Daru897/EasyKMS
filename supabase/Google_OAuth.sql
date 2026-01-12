-- Google OAuth Token Storage
-- Stores encrypted OAuth tokens per tenant for Google Drive integration

CREATE TABLE google_oauth_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- OAuth token data (encrypted in application layer)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  
  -- Google account info
  google_user_id TEXT,
  google_user_email TEXT,
  
  -- Connection metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One active connection per tenant
  UNIQUE (tenant_id)
);

CREATE INDEX idx_google_oauth_tenant ON google_oauth_tokens(tenant_id);
CREATE INDEX idx_google_oauth_active ON google_oauth_tokens(tenant_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_google_oauth_expires ON google_oauth_tokens(expires_at) WHERE is_active = TRUE;

-- RLS Policies for google_oauth_tokens
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- READ: Only tenant members can view their own tokens
CREATE POLICY google_oauth_read
ON google_oauth_tokens
FOR SELECT
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- INSERT/UPDATE: Only admins/managers can manage tokens
CREATE POLICY google_oauth_write
ON google_oauth_tokens
FOR ALL
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('admin', 'manager', 'service_role')
);
