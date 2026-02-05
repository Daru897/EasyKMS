-- Stage 7: Advanced Reporting & Analytics (Sprint 1)

-- Core query logs table
CREATE TABLE IF NOT EXISTS query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  query_text TEXT NOT NULL,
  response_type TEXT CHECK (response_type IN ('ANSWER', 'NO_DATA')),
  confidence_score NUMERIC(4,3),
  latency_ms INTEGER,
  sources_count INTEGER,
  categories JSONB DEFAULT '[]'::jsonb,
  channel TEXT CHECK (channel IN ('agent', 'admin', 'api')) DEFAULT 'api',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_tenant_created
ON query_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_logs_tenant_response
ON query_logs (tenant_id, response_type);

-- Backward-compatible add (in case table already exists)
ALTER TABLE query_logs
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

-- Optional backfill (best-effort) from existing tables
-- 1) knowledge_gaps -> NO_DATA entries
INSERT INTO query_logs (tenant_id, user_id, query_text, response_type, confidence_score, channel, created_at)
SELECT
  tenant_id,
  agent_id,
  query_text,
  'NO_DATA',
  confidence_score,
  'api',
  created_at
FROM knowledge_gaps
WHERE NOT EXISTS (
  SELECT 1
  FROM query_logs ql
  WHERE ql.tenant_id = knowledge_gaps.tenant_id
    AND ql.query_text = knowledge_gaps.query_text
    AND ql.created_at = knowledge_gaps.created_at
);

-- 2) agent_feedback -> ANSWER entries (inferred)
INSERT INTO query_logs (tenant_id, user_id, query_text, response_type, channel, created_at)
SELECT
  tenant_id,
  user_id,
  query_text,
  'ANSWER',
  'agent',
  created_at
FROM agent_feedback
WHERE NOT EXISTS (
  SELECT 1
  FROM query_logs ql
  WHERE ql.tenant_id = agent_feedback.tenant_id
    AND ql.query_text = agent_feedback.query_text
    AND ql.created_at = agent_feedback.created_at
);
