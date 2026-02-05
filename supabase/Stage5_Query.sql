-- Stage 5: Query Engine support (keyword search + gaps)

-- Add search text + tsvector columns for keyword search
ALTER TABLE document_versions
ADD COLUMN IF NOT EXISTS search_text TEXT,
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate search_text for existing rows
UPDATE document_versions dv
SET search_text = COALESCE(d.title, 'Untitled') || E'\n\n' || COALESCE(dv.parsed_markdown, '')
FROM documents d
WHERE dv.document_id = d.id
  AND dv.search_text IS NULL;

-- Maintain search_vector via trigger
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.search_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_versions_search_vector ON document_versions;

CREATE TRIGGER trg_document_versions_search_vector
BEFORE INSERT OR UPDATE OF search_text
ON document_versions
FOR EACH ROW
EXECUTE FUNCTION update_document_search_vector();

-- Backfill search_vector
UPDATE document_versions
SET search_vector = to_tsvector('english', COALESCE(search_text, ''));

-- Add GIN index
CREATE INDEX IF NOT EXISTS idx_document_versions_search_vector
ON document_versions
USING GIN (search_vector);
