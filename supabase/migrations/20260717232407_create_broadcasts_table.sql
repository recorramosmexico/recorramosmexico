/*
# Create broadcasts table — Comunicados masivos

## Propósito
Almacena el historial de comunicados enviados a todos los viajeros registrados desde el panel admin. Cada registro guarda el asunto, contenido HTML, número de destinatarios, estado del envío y fecha.

## Nueva Tabla: `broadcasts`
- `id` (uuid, primary key)
- `subject` (text, not null) — asunto del correo
- `html_content` (text, not null) — contenido HTML del correo
- `recipients_count` (integer, default 0) — cuántos viajeros recibieron el correo
- `status` (text, default 'sent') — valores: 'sent', 'failed'
- `sent_by` (uuid, nullable) — id del admin que envió el comunicado (REFERENCIA a auth.users)
- `created_at` (timestamptz, default now())

## Seguridad (RLS)
- Todas las operaciones solo para authenticated (admin)
- Los usuarios públicos (anon) no tienen acceso

## Notas
- Los archivos adjuntos se suben a Supabase Storage y se referencian dentro del HTML con <img> tags
- No se guardan los attachments directamente en la tabla, solo el HTML que los referencia
*/

CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  html_content text NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_broadcasts" ON broadcasts;
CREATE POLICY "admin_read_broadcasts" ON broadcasts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_broadcasts" ON broadcasts;
CREATE POLICY "admin_insert_broadcasts" ON broadcasts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_broadcasts" ON broadcasts;
CREATE POLICY "admin_delete_broadcasts" ON broadcasts FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created_at ON broadcasts (created_at DESC);

-- Crear bucket público para attachments de comunicados (imágenes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('broadcasts', 'broadcasts', true)
ON CONFLICT (id) DO NOTHING;

-- Política: lectura pública del bucket (las imágenes deben ser accesibles por URL pública en los correos)
DROP POLICY IF EXISTS "public_read_broadcasts_bucket" ON storage.objects;
CREATE POLICY "public_read_broadcasts_bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'broadcasts');

-- Política: solo admin puede subir archivos al bucket
DROP POLICY IF EXISTS "admin_upload_broadcasts_bucket" ON storage.objects;
CREATE POLICY "admin_upload_broadcasts_bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'broadcasts');

-- Política: solo admin puede eliminar archivos del bucket
DROP POLICY IF EXISTS "admin_delete_broadcasts_bucket" ON storage.objects;
CREATE POLICY "admin_delete_broadcasts_bucket" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'broadcasts');
