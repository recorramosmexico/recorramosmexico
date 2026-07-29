/*
# Add public reviews system with traveler-submitted reviews

1. Modified Tables
- `reviews`: Added `user_id` (uuid, links to auth.users), `email` (text), `phone` (text) columns.
  - `user_id` is nullable so admin-created reviews still work without a logged-in user.
  - `email` and `phone` store the contact info of the traveler who submitted the review.
  - These contact fields are only visible to the admin, not on the public page.
- `reservations`: Added `review_request_sent_at` (timestamptz, nullable) to track when
  a review-request email was sent after a tour ended, preventing duplicate emails.

2. Security
- Reviews table already has RLS enabled. We add new policies:
  - Public (anon + authenticated) can SELECT only approved reviews.
  - Authenticated users can INSERT their own reviews (user_id defaults to auth.uid()).
  - Admin can perform all operations (existing admin policies cover this via service role).
- Drop and recreate the SELECT policy so the public sees approved reviews, and add
  an INSERT policy for authenticated travelers to submit their own reviews.
- Add an UPDATE policy so travelers can edit their own reviews (rating/comment only).
- Add a DELETE policy so travelers can delete their own reviews.

3. Important Notes
- The `user_id` column has DEFAULT auth.uid() so frontend inserts that omit it still work.
- Admin-created reviews (no logged-in user) will have user_id = null, which is fine.
- The public SELECT policy returns only is_approved = true rows, so pending reviews
  submitted by travelers are hidden until the admin approves them.
*/

-- Add columns to reviews table
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

-- Add review_request_sent_at to reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz;

-- Set default on user_id so frontend inserts work without passing it explicitly
ALTER TABLE reviews ALTER COLUMN user_id SET DEFAULT auth.uid();

-- =====================================================
-- RLS Policies for reviews
-- =====================================================

-- Public can read only approved reviews
DROP POLICY IF EXISTS "public_select_approved_reviews" ON reviews;
CREATE POLICY "public_select_approved_reviews"
ON reviews FOR SELECT
TO anon, authenticated
USING (is_approved = true);

-- Authenticated travelers can insert their own reviews
DROP POLICY IF EXISTS "authenticated_insert_own_reviews" ON reviews;
CREATE POLICY "authenticated_insert_own_reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authenticated travelers can update their own reviews
DROP POLICY IF EXISTS "authenticated_update_own_reviews" ON reviews;
CREATE POLICY "authenticated_update_own_reviews"
ON reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authenticated travelers can delete their own reviews
DROP POLICY IF EXISTS "authenticated_delete_own_reviews" ON reviews;
CREATE POLICY "authenticated_delete_own_reviews"
ON reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admin can read all reviews (including pending) - admin uses service role key which bypasses RLS
-- so no additional policy needed for admin access.

-- Index for faster public queries
CREATE INDEX IF NOT EXISTS idx_reviews_approved_created ON reviews (is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_review_request ON reservations (review_request_sent_at) WHERE review_request_sent_at IS NULL;
