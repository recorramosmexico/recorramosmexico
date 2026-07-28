CREATE POLICY "public_select_settings" ON settings
  FOR SELECT TO anon, authenticated
  USING (true);
