/*
# Admin can edit and delete traveler profiles

## Purpose
Allows administrators to update and delete any row in the `profiles` table from the
admin panel (AdminViajeros). Previously only the owner could update their own profile
(`update_own_profile`) and no delete policy existed.

## Changes
1. Adds an UPDATE policy on `profiles` scoped to admins via `is_admin()`.
   - The existing `update_own_profile` policy is preserved, so users can still
     edit their own profile. PostgreSQL ORs multiple policies of the same verb.
2. Adds a DELETE policy on `profiles` scoped to admins via `is_admin()`.
   - No prior DELETE policy existed; profiles were only removed by the
     `ON DELETE CASCADE` foreign key from `auth.users`.

## Security
- Both policies use the existing `is_admin()` SECURITY DEFINER function
  (search_path fixed in 20260708000001_security_hardening.sql).
- `TO authenticated` — only signed-in users can hit these policies.
- Admins cannot delete their own account through this path because the UI
  blocks self-deletion; the DB policy itself does not need to enforce that
  (defense in depth is handled in the edge function).
*/

DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete any profile" ON profiles;
CREATE POLICY "Admin can delete any profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());
