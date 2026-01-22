-- Knowledge Gaps Table
-- Tracks queries that didn't find relevant documents (Silence Protocol)
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  top_similarity_score FLOAT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'addressed', 'ignored')),
  notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for querying by tenant
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_tenant_id ON knowledge_gaps(tenant_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(status);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_created_at ON knowledge_gaps(created_at DESC);

-- Enable Row Level Security
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their tenant's knowledge gaps
CREATE POLICY "Users can view their tenant's knowledge gaps"
ON knowledge_gaps
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- RLS Policy: Only admins can update knowledge gaps
CREATE POLICY "Admins can update knowledge gaps"
ON knowledge_gaps
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND tenant_id = knowledge_gaps.tenant_id
    AND role IN ('tenant_admin', 'super_admin')
  )
);

-- Comment on table
COMMENT ON TABLE knowledge_gaps IS 'Tracks queries that did not find relevant documents (Silence Protocol). Used for identifying documentation gaps.';
