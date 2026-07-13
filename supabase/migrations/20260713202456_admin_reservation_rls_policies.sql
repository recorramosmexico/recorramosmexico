-- Allow admins to update any reservation (needed for balance_payment_requested_at and status changes)
CREATE POLICY "Admin can update any reservation"
  ON reservations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admins to select any reservation (so admin panel can see all reservations)
DROP POLICY IF EXISTS "Admin can read all reservations" ON reservations;
CREATE POLICY "Admin can read all reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (is_admin());
