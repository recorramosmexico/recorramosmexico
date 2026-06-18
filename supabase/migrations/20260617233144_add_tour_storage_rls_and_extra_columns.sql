
-- =====================
-- FIX RLS: Allow admin users to write to all content tables
-- =====================

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CATEGORIES
DROP POLICY IF EXISTS "Admin can insert categories" ON categories;
DROP POLICY IF EXISTS "Admin can update categories" ON categories;
DROP POLICY IF EXISTS "Admin can delete categories" ON categories;

CREATE POLICY "Admin can insert categories" ON categories
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update categories" ON categories
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin can delete categories" ON categories
  FOR DELETE TO authenticated USING (is_admin());

-- TOURS
DROP POLICY IF EXISTS "Admin can insert tours" ON tours;
DROP POLICY IF EXISTS "Admin can update tours" ON tours;
DROP POLICY IF EXISTS "Admin can delete tours" ON tours;

CREATE POLICY "Admin can insert tours" ON tours
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update tours" ON tours
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin can delete tours" ON tours
  FOR DELETE TO authenticated USING (is_admin());

-- RESERVATIONS
DROP POLICY IF EXISTS "Admin can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Admin can update reservations" ON reservations;
DROP POLICY IF EXISTS "Admin can delete reservations" ON reservations;

CREATE POLICY "Admin can insert reservations" ON reservations
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update reservations" ON reservations
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin can delete reservations" ON reservations
  FOR DELETE TO authenticated USING (is_admin());

-- Also allow non-admin authenticated users to insert their own reservation (from TourDetail booking form)
DROP POLICY IF EXISTS "User can insert own reservation" ON reservations;
CREATE POLICY "User can insert own reservation" ON reservations
  FOR INSERT TO authenticated WITH CHECK (true);

-- REVIEWS
DROP POLICY IF EXISTS "Admin can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can update reviews" ON reviews;
DROP POLICY IF EXISTS "Admin can delete reviews" ON reviews;

CREATE POLICY "Admin can insert reviews" ON reviews
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update reviews" ON reviews
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin can delete reviews" ON reviews
  FOR DELETE TO authenticated USING (is_admin());

-- Allow non-admin users to insert a review (contact form / after tour)
DROP POLICY IF EXISTS "User can insert review" ON reviews;
CREATE POLICY "User can insert review" ON reviews
  FOR INSERT TO authenticated WITH CHECK (true);

-- BLOG_POSTS
DROP POLICY IF EXISTS "Admin can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin can delete posts" ON blog_posts;

CREATE POLICY "Admin can insert posts" ON blog_posts
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "Admin can update posts" ON blog_posts
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin can delete posts" ON blog_posts
  FOR DELETE TO authenticated USING (is_admin());

-- =====================
-- ADMIN READ POLICIES (so admin can see all tours, not just active ones)
-- =====================
DROP POLICY IF EXISTS "Admin can read all tours" ON tours;
CREATE POLICY "Admin can read all tours" ON tours
  FOR SELECT TO authenticated
  USING (is_admin() OR is_active = true);

-- =====================
-- ADD EXTRA COLUMNS TO TOURS TABLE
-- =====================
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS meeting_point text,
  ADD COLUMN IF NOT EXISTS min_participants integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium'
    CHECK (difficulty IN ('low', 'medium', 'high'));

-- =====================
-- SUPABASE STORAGE BUCKET FOR TOUR IMAGES
-- =====================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tour-images',
  'tour-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Public read tour images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload tour images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update tour images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete tour images" ON storage.objects;

CREATE POLICY "Public read tour images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour-images');

CREATE POLICY "Auth upload tour images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tour-images');

CREATE POLICY "Auth update tour images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tour-images');

CREATE POLICY "Auth delete tour images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tour-images');
