/*
# Security Hardening: Fix RLS Policies, Function Search Path, and Privilege Issues

## Summary
This migration fixes multiple security vulnerabilities identified by the Supabase security advisor.

## Changes

### 1. Fix is_admin() Mutable Search Path
The `is_admin()` function was missing `SET search_path = public`, which allows an attacker
with schema-creation rights to hijack the function by placing objects in a search_path that
resolves before `public`. Adding `SET search_path = public` fixes this.

### 2. Revoke Public EXECUTE on SECURITY DEFINER Functions
Both `is_admin()` and `handle_new_user()` are SECURITY DEFINER functions accessible via
`/rest/v1/rpc/`. Exposing them to anon/authenticated roles is unnecessary and a security risk.
- `handle_new_user()` is a trigger function — it should never be called directly.
- `is_admin()` is used only internally in RLS policies — not as a public API.

### 3. Fix Always-True INSERT RLS Policies
The INSERT policies on `reservations` and `reviews` used `WITH CHECK (true)`, which
effectively allowed any authenticated user to insert any row without restriction.
Fix: add a `user_id uuid DEFAULT auth.uid()` column to each table and restrict
INSERT to `WITH CHECK (auth.uid() = user_id)`. The DEFAULT ensures the client does
not need to pass user_id explicitly.

### 4. Revoke anon SELECT from Sensitive Tables
The following tables/views were visible to the `anon` role in the GraphQL schema.
None of them should be publicly accessible; revoking SELECT removes them from
GraphQL introspection and prevents anonymous queries:
- `profiles` — personal user data
- `reservations` — customer booking data
- `settings` — admin config including API keys
- `stripe_customers`, `stripe_orders`, `stripe_subscriptions` — payment data
- `stripe_user_orders`, `stripe_user_subscriptions` — payment views

Public content tables (tours, blog_posts, categories, reviews) are intentionally
left accessible to anon since the public website displays them.

### 5. Fix Storage Listing Policy for tour-images
The existing "Public read tour images" policy used `USING (bucket_id = 'tour-images')`
with no role restriction, which allowed anonymous clients to LIST all files in the bucket.
For a public bucket, files are served by direct URL without any SELECT policy.
The fix removes broad anon listing and replaces it with an authenticated-only SELECT policy
so only logged-in users (admins) can enumerate files, while public URLs still work.
*/

-- ============================================================
-- 1. Fix is_admin() search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- ============================================================
-- 2. Revoke EXECUTE from public roles on SECURITY DEFINER functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ============================================================
-- 3a. Fix reservations INSERT policy
--     Add user_id (nullable, defaults to auth.uid() so existing rows stay intact)
-- ============================================================
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

DROP POLICY IF EXISTS "User can insert own reservation" ON reservations;
CREATE POLICY "User can insert own reservation"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3b. Fix reviews INSERT policy
-- ============================================================
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid();

DROP POLICY IF EXISTS "User can insert review" ON reviews;
CREATE POLICY "User can insert review"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. Revoke anon SELECT from sensitive tables/views
-- ============================================================
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.reservations FROM anon;
REVOKE SELECT ON public.settings FROM anon;
REVOKE SELECT ON public.stripe_customers FROM anon;
REVOKE SELECT ON public.stripe_orders FROM anon;
REVOKE SELECT ON public.stripe_subscriptions FROM anon;
REVOKE SELECT ON public.stripe_user_orders FROM anon;
REVOKE SELECT ON public.stripe_user_subscriptions FROM anon;

-- ============================================================
-- 5. Fix storage.objects listing policy for tour-images
--    Drop the broad open SELECT; authenticated listing kept for admin panel.
--    Public bucket objects remain accessible via direct URL (no SELECT policy needed).
-- ============================================================
DROP POLICY IF EXISTS "Public read tour images" ON storage.objects;

CREATE POLICY "Auth list tour images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'tour-images');
