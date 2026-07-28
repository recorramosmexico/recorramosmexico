-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es text NOT NULL,
  title_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  description_es text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  price_mxn numeric(10,2) NOT NULL DEFAULT 0,
  shipping_cost_mxn numeric(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  sizes jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of { size: string, stock: number }
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_active_products" ON products FOR SELECT
  TO anon, authenticated USING (is_active = true);

CREATE POLICY "admin_manage_products" ON products FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Product orders table
CREATE TABLE IF NOT EXISTS product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  size text NOT NULL DEFAULT '',
  unit_price_mxn numeric(10,2) NOT NULL DEFAULT 0,
  total_mxn numeric(10,2) NOT NULL DEFAULT 0,
  shipping_cost_mxn numeric(10,2) NOT NULL DEFAULT 0,
  delivery_method text NOT NULL DEFAULT 'shipping', -- 'shipping' | 'personal_cdmx'
  shipping_address jsonb, -- { street, number, neighborhood, city, zip, references }
  tracking_number text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','cancelled','refunded')),
  payment_method_type text, -- 'card' | 'oxxo' | 'bank_transfer'
  stripe_session_id text,
  payment_proof_url text,
  confirmation_token uuid DEFAULT gen_random_uuid(),
  order_number text,
  refund_status text, -- null | 'pending' | 'completed'
  refund_method text, -- 'stripe' | 'bank_transfer'
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_product_orders" ON product_orders FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "insert_own_product_orders" ON product_orders FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_product_orders" ON product_orders FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_all_product_orders" ON product_orders FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "read_product_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');

CREATE POLICY "upload_product_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "update_product_images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "delete_product_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'product-images');

-- Setting for products section visibility
INSERT INTO settings (key, value, updated_at)
VALUES ('products_section_enabled', 'false', now())
ON CONFLICT (key) DO NOTHING;

-- Order number generator RPC
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_number text;
BEGIN
  LOOP
    new_number := 'RM-' || lpad((floor(random() * 9000000) + 1000000)::text, 7, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM product_orders WHERE order_number = new_number);
  END LOOP;
  RETURN new_number;
END;
$$;