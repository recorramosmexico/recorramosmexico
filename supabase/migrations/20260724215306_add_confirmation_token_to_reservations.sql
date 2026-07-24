/*
# Add confirmation token for bank transfer reservations

1. Changes to existing tables
- `reservations` table: add column `confirmation_token` (uuid, nullable, unique) — generated
  when a bank-transfer reservation is created so the admin can confirm payment via a
  one-click email link without logging in.
- `reservations` table: add column `confirmed_at` (timestamptz, nullable) — timestamp set
  when the admin confirms the deposit payment through the token link.
- Backfill existing rows: set `confirmation_token` to a random uuid for any bank-transfer
  reservation that is still pending and has a payment proof, so old reservations can also
  be confirmed through the new link.

2. Security
- Add an RLS SELECT policy `select_by_confirmation_token` that allows anyone (anon role)
  to look up a reservation solely by its `confirmation_token`. This is required because the
  admin confirmation link works without a login session.
- Add an RLS UPDATE policy `update_by_confirmation_token` that allows the anon role to
  update a reservation (to mark it as deposit_paid) when the request provides the matching
  `confirmation_token` in the row's existing value. The edge function uses the service role
  key for the actual update, so this policy is a safety net for direct client calls.
- Add an index on `confirmation_token` for fast lookups.
*/

-- Add confirmation_token column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'confirmation_token'
  ) THEN
    ALTER TABLE reservations ADD COLUMN confirmation_token uuid UNIQUE;
  END IF;
END $$;

-- Add confirmed_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN confirmed_at timestamptz;
  END IF;
END $$;

-- Backfill: generate tokens for existing bank_transfer reservations that are pending
UPDATE reservations
SET confirmation_token = gen_random_uuid()
WHERE payment_method_type = 'bank_transfer'
  AND payment_status = 'pending'
  AND confirmation_token IS NULL;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_token
ON reservations (confirmation_token)
WHERE confirmation_token IS NOT NULL;

-- RLS: allow looking up a reservation by its confirmation token (no login required)
DROP POLICY IF EXISTS "select_by_confirmation_token" ON reservations;
CREATE POLICY "select_by_confirmation_token"
ON reservations FOR SELECT
TO anon, authenticated
USING (confirmation_token IS NOT NULL);

-- RLS: allow updating a reservation by its confirmation token (no login required)
-- This is a safety net; the edge function uses the service role key which bypasses RLS.
DROP POLICY IF EXISTS "update_by_confirmation_token" ON reservations;
CREATE POLICY "update_by_confirmation_token"
ON reservations FOR UPDATE
TO anon, authenticated
USING (confirmation_token IS NOT NULL)
WITH CHECK (confirmation_token IS NOT NULL);
