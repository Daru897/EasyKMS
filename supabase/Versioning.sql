CREATE OR REPLACE FUNCTION generate_version_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM document_versions
  WHERE document_id = NEW.document_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_version
BEFORE INSERT ON document_versions
FOR EACH ROW
EXECUTE FUNCTION generate_version_number();
