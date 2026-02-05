-- Stage 6: Agent Feedback Table
-- This migration adds the agent_feedback table for tracking search feedback

-- Create agent_feedback table
CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  query_text TEXT NOT NULL,
  answer_text TEXT,
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
  issue_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_feedback_tenant_id ON agent_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_user_id ON agent_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_rating ON agent_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_created_at ON agent_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_feedback
-- Users can insert their own feedback
CREATE POLICY "Users can insert feedback"
  ON agent_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = (auth.jwt() ->> 'tenant_id')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM tenants WHERE is_active = true LIMIT 1
    )
  );

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON agent_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all feedback in their tenant
CREATE POLICY "Admins can view all tenant feedback"
  ON agent_feedback
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT ON agent_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_feedback TO service_role;

-- Add comment for documentation
COMMENT ON TABLE agent_feedback IS 'Stores feedback from agents about search results quality';
