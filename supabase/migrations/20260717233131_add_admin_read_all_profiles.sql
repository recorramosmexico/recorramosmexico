/*
# Add admin read-all profiles policy

## Propósito
Permitir que los administradores puedan consultar todos los perfiles de viajeros registrados desde el panel admin. Actualmente, la política `select_own_profile` solo permite leer el propio perfil.

## Cambios de Seguridad (RLS)
- Nueva política `admin_read_all_profiles` que permite a usuarios autenticados con `is_admin = true` leer todos los perfiles.
- La política existente `select_own_profile` se mantiene: cada usuario sigue pudiendo leer su propio perfil.
- No se modifica la política de UPDATE ni INSERT — siguen limitadas al propio perfil.

## Notas
- Usa la función `is_admin()` (SECURITY DEFINER, search_path fijado) para verificar el rol.
- No expone datos a anon (la política es `TO authenticated`).
*/

DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (is_admin());
