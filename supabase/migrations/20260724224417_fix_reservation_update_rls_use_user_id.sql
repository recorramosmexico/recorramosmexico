-- Replace policies that queried auth.users (permission denied for authenticated role)
-- with user_id-based ownership checks that don't need to read auth.users.

DROP POLICY IF EXISTS "User can update own reservation payment status" ON reservations;
DROP POLICY IF EXISTS "allow_user_update_balance_session" ON reservations;

CREATE POLICY "User can update own reservation payment status" ON reservations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "allow_user_update_balance_session" ON reservations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
