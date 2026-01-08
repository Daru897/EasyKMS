CREATE TABLE knowledge_gaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_context TEXT,
  agent_id UUID,
  confidence_score NUMERIC(3,2),
  cluster_id UUID,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by_document_version_id UUID REFERENCES document_versions(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gaps_tenant_created
ON knowledge_gaps (tenant_id, created_at DESC);


