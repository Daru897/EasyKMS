CREATE OR REPLACE FUNCTION update_document_current_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'LIVE' THEN
    UPDATE documents
    SET current_version_id = NEW.id,
        current_status = 'LIVE',
        updated_at = NOW()
    WHERE id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_document_current_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'LIVE' THEN
    UPDATE documents
    SET current_version_id = NEW.id,
        current_status = 'LIVE',
        updated_at = NOW()
    WHERE id = NEW.document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
