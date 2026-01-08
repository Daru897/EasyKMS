CREATE TABLE approval_workflow_steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, order_index)
);

CREATE TABLE document_approvals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
  workflow_step_id UUID REFERENCES approval_workflow_steps(id),
  approver_user_id UUID,
  status TEXT CHECK (status IN ('pending','approved','rejected','skipped')) DEFAULT 'pending',
  comments TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
