/*
# Create inquiries table — Cotizaciones y Mensajes

## Propósito
Centraliza todos los formularios de contacto y cotizaciones (Servicios: Transporte, Tour Personalizado; página de Contacto) en una sola tabla dedicada, separándolos de `reservations` y `reviews` donde se guardaban incorrectamente.

## Nueva Tabla: `inquiries`
- `id` (uuid, primary key)
- `tipo` (text, not null) — valores: 'transporte', 'tour_personalizado', 'contacto'
- `nombre` (text, not null)
- `email` (text, not null)
- `telefono` (text, default '')
- `asunto` (text, default '')
- `mensaje` (text, not null) — contenido completo del formulario
- `status` (text, not null, default 'abierto') — valores: 'abierto', 'en_revision', 'cerrado'
- `admin_reply` (text, default '') — respuesta del administrador
- `replied_at` (timestamptz, nullable) — fecha de respuesta
- `is_deleted` (boolean, not null, default false) — soft-delete para auditoría
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Seguridad (RLS)
- Inserción: permitida para anon + authenticated (formularios públicos sin login)
- Lectura/Actualización/Eliminación: solo authenticated (panel admin)
- Las consultas del front filtran `is_deleted = false` para no cargar registros eliminados

## Notas
- Se agrega trigger `set_updated_at` para mantener `updated_at` automático
- Los formularios de Servicios dejan de guardarse en `reservations`
- El formulario de Contacto deja de guardarse en `reviews`
*/

CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('transporte', 'tour_personalizado', 'contacto')),
  nombre text NOT NULL,
  email text NOT NULL,
  telefono text NOT NULL DEFAULT '',
  asunto text NOT NULL DEFAULT '',
  mensaje text NOT NULL,
  status text NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_revision', 'cerrado')),
  admin_reply text NOT NULL DEFAULT '',
  replied_at timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Inserción pública (formularios sin login)
DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
CREATE POLICY "anon_insert_inquiries" ON inquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Lectura solo para admin (authenticated)
DROP POLICY IF EXISTS "admin_read_inquiries" ON inquiries;
CREATE POLICY "admin_read_inquiries" ON inquiries FOR SELECT
  TO authenticated USING (true);

-- Actualización solo para admin
DROP POLICY IF EXISTS "admin_update_inquiries" ON inquiries;
CREATE POLICY "admin_update_inquiries" ON inquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Eliminación (soft-delete via UPDATE) solo para admin
DROP POLICY IF EXISTS "admin_delete_inquiries" ON inquiries;
CREATE POLICY "admin_delete_inquiries" ON inquiries FOR DELETE
  TO authenticated USING (true);

-- Índice para filtrar por is_deleted y status (consultas frecuentes del admin)
CREATE INDEX IF NOT EXISTS idx_inquiries_is_deleted_status ON inquiries (is_deleted, status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inquiries_updated_at ON inquiries;
CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
