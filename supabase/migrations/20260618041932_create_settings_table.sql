
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_settings" ON settings FOR SELECT TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

CREATE POLICY "admin_insert_settings" ON settings FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

CREATE POLICY "admin_update_settings" ON settings FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true)
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- Seed default values
INSERT INTO settings (key, value) VALUES
  ('smtp2go_api_key',   'api-7CA2D2C705C14CDBB5ADAE1D3FDEE360'),
  ('from_email',        'contacto@recorramosmexico.com.mx'),
  ('from_name',         'Recorramos México'),
  ('admin_email',       'contacto@recorramosmexico.com.mx')
ON CONFLICT (key) DO NOTHING;
