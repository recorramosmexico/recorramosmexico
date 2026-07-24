/*
# Add payment proof upload for bank transfer reservations

1. Changes to existing tables
- `reservations` table: add column `payment_proof_url` (text, nullable) — stores the public URL of the
  payment proof file (image or PDF) uploaded by the traveler when paying via bank transfer.
- `reservations` table: add column `payment_method_type` already exists (text, nullable) — now also
  used to store 'bank_transfer' for manual transfer reservations. No change needed to the column itself.

2. Storage
- Create storage bucket `payment-proofs` (public read) for storing payment proof files.
- Storage policies: authenticated users can upload to the bucket; anyone (anon) can read since the
  URLs are used in admin panel and emails (public read is acceptable for proof files referenced by URL).

3. Security
- No new RLS policies needed on `reservations` — existing policies already cover SELECT/INSERT/UPDATE.
- The new `payment_proof_url` column is writable via the existing UPDATE policy that allows users to
  update their own reservations.
*/

-- Add payment_proof_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'payment_proof_url'
  ) THEN
    ALTER TABLE reservations ADD COLUMN payment_proof_url text;
  END IF;
END $$;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, anyone can read
DROP POLICY IF EXISTS "Anyone can read payment proofs" ON storage.objects;
CREATE POLICY "Anyone can read payment proofs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Authenticated can upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Authenticated can update payment proofs" ON storage.objects;
CREATE POLICY "Authenticated can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs') WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Authenticated can delete payment proofs" ON storage.objects;
CREATE POLICY "Authenticated can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');
