-- Add reservation_number column to reservations table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_number text UNIQUE;

-- Function to generate a unique reservation number (RM-XXXXXX)
-- Uses uppercase alphanumeric chars (A-Z, 2-9) — excludes 0/O and 1/I to avoid confusion
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := 'RM-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Ensure uniqueness
    IF NOT EXISTS (SELECT 1 FROM reservations WHERE reservation_number = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique reservation number after 100 attempts';
    END IF;
  END LOOP;
END;
$$;
