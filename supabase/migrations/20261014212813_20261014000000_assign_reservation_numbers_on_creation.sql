/*
# Assign reservation folios at creation time

1. Purpose
- Give every reservation a stable folio as soon as it is created, regardless of payment status.
- Make pending, paid, cancelled, and manually created reservations easy to identify.

2. Modified tables
- `reservations.reservation_number`: existing unique folio column is now populated automatically for new rows.
- Existing rows without a folio receive one without changing any customer, payment, tour, or reservation data.

3. Database behavior
- Adds a trigger function that uses the existing `generate_reservation_number()` function before inserts.
- Keeps an explicitly supplied folio unchanged.
- Backfills only rows where `reservation_number` is currently NULL.

4. Security and data safety
- No new tables, policies, or permissions are introduced.
- No rows are deleted and no existing non-null folios are changed.
*/

CREATE OR REPLACE FUNCTION set_reservation_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reservation_number IS NULL THEN
    NEW.reservation_number := generate_reservation_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_assign_number ON reservations;
CREATE TRIGGER reservations_assign_number
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_reservation_number();

UPDATE reservations
SET reservation_number = generate_reservation_number()
WHERE reservation_number IS NULL;
