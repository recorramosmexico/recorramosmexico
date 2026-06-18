/*
  # Fix RLS Security Policies

  1. Issues Fixed
    - Remove overly permissive "anyone can insert" policies for public reservations and reviews
    - Add proper authentication checks for admin operations
    - Restrict operations to admin users only (via Supabase role)
    - Maintain public read access for published/approved content
    - Remove unrestricted write access for authenticated users

  2. Security Model
    - Public: Can READ active tours, published blog posts, approved reviews, categories
    - Authenticated admins: Can CRUD all content (enforced via Supabase role)
    - Reservations: Created via API endpoint (webhook) with proper validation
    - Reviews: Created via API endpoint with proper validation
*/

-- =====================
-- CATEGORIES - RESTRICT WRITE TO ADMINS
-- =====================
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

CREATE POLICY "Admin can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Admin can update categories" ON categories FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Admin can delete categories" ON categories FOR DELETE TO authenticated USING (false);

-- =====================
-- TOURS - RESTRICT WRITE TO ADMINS
-- =====================
DROP POLICY IF EXISTS "Authenticated users can insert tours" ON tours;
DROP POLICY IF EXISTS "Authenticated users can update tours" ON tours;
DROP POLICY IF EXISTS "Authenticated users can delete tours" ON tours;

CREATE POLICY "Admin can insert tours" ON tours FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Admin can update tours" ON tours FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Admin can delete tours" ON tours FOR DELETE TO authenticated USING (false);

-- =====================
-- RESERVATIONS - RESTRICT WRITES WITH VALIDATION
-- =====================
DROP POLICY IF EXISTS "Anyone can insert reservations" ON reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON reservations;

-- Only authenticated admins can INSERT (via API with validation)
CREATE POLICY "Admin can insert reservations" ON reservations FOR INSERT TO authenticated WITH CHECK (false);

-- Only authenticated admins can UPDATE
CREATE POLICY "Admin can update reservations" ON reservations FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

-- Only authenticated admins can DELETE
CREATE POLICY "Admin can delete reservations" ON reservations FOR DELETE TO authenticated USING (false);

-- =====================
-- REVIEWS - RESTRICT WRITES WITH VALIDATION
-- =====================
DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can update reviews" ON reviews;
DROP POLICY IF EXISTS "Authenticated users can delete reviews" ON reviews;

-- Only authenticated admins can INSERT (via API with validation)
CREATE POLICY "Admin can insert reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (false);

-- Only authenticated admins can UPDATE
CREATE POLICY "Admin can update reviews" ON reviews FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

-- Only authenticated admins can DELETE
CREATE POLICY "Admin can delete reviews" ON reviews FOR DELETE TO authenticated USING (false);

-- =====================
-- BLOG_POSTS - RESTRICT WRITE TO ADMINS
-- =====================
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON blog_posts;

CREATE POLICY "Admin can insert posts" ON blog_posts FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Admin can update posts" ON blog_posts FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Admin can delete posts" ON blog_posts FOR DELETE TO authenticated USING (false);

-- =====================
-- IMPORTANT NOTES
-- =====================
-- These policies use FALSE to prevent write access at the RLS layer.
-- Legitimate admin write operations should be done via:
-- 1. Edge Functions with proper authentication
-- 2. Direct database access with Supabase service role key (from backend only)
-- 3. Admin API with JWT verification
--
-- For the application to work, implement:
-- 1. Admin Edge Function endpoints for CRUD operations
-- 2. Verify JWT tokens server-side
-- 3. Check user roles/permissions in function logic
--
-- This ensures:
-- - No client-side bypass of security
-- - Proper audit trail
-- - Separation of concerns
-- - Defense in depth
