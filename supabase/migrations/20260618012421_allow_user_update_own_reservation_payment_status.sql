-- Allow authenticated users to update payment_status on their own reservations
-- This acts as a client-side fallback when the webhook is delayed or unavailable
CREATE POLICY "User can update own reservation payment status" ON reservations
  FOR UPDATE TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
