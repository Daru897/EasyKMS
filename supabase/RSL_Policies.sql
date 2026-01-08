-- READ
CREATE POLICY documents_read
ON documents
FOR SELECT
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- INSERT
CREATE POLICY documents_insert
ON documents
FOR INSERT
WITH CHECK (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin','service_role')
);

-- UPDATE
CREATE POLICY documents_update
ON documents
FOR UPDATE
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin','service_role')
);


-- READ
CREATE POLICY categories_read
ON document_categories
FOR SELECT
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- INSERT
CREATE POLICY categories_insert
ON document_categories
FOR INSERT
WITH CHECK (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin')
);

-- UPDATE
CREATE POLICY categories_update
ON document_categories
FOR UPDATE
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin')
);

-- DELETE
CREATE POLICY categories_delete
ON document_categories
FOR DELETE
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin')
);


-- READ
CREATE POLICY workflow_read
ON approval_workflow_steps
FOR SELECT
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
);

-- WRITE
CREATE POLICY workflow_insert
ON approval_workflow_steps
FOR INSERT
WITH CHECK (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin')
);

CREATE POLICY workflow_update
ON approval_workflow_steps
FOR UPDATE
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin')
);

CREATE POLICY workflow_delete
ON approval_workflow_steps
FOR DELETE
USING (
  tenant_id::text =
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  AND current_setting('request.jwt.claims', true)::json->>'role'
      IN ('manager','admin')
);


CREATE POLICY approvals_all
ON document_approvals
FOR ALL
USING (
  document_version_id IN (
    SELECT dv.id
    FROM document_versions dv
    JOIN documents d ON d.id = dv.document_id
    WHERE d.tenant_id::text =
      current_setting('request.jwt.claims', true)::json->>'tenant_id'
  )
);


