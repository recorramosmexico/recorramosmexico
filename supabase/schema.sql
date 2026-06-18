-- ============================================================
-- Recorramos México - Complete Database Schema
-- Generated for Supabase
-- ============================================================

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_es text NOT NULL,
  name_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon_name text NOT NULL DEFAULT 'map-pin',
  description_es text DEFAULT '',
  description_en text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete categories" ON categories FOR DELETE TO authenticated USING (true);

-- TOURS
CREATE TABLE IF NOT EXISTS tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es text NOT NULL,
  title_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  description_es text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  destination text NOT NULL DEFAULT '',
  price_mxn numeric(10,2) NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 1,
  max_capacity integer NOT NULL DEFAULT 20,
  departure_dates jsonb NOT NULL DEFAULT '[]',
  image_urls jsonb NOT NULL DEFAULT '[]',
  itinerary_es jsonb NOT NULL DEFAULT '[]',
  itinerary_en jsonb NOT NULL DEFAULT '[]',
  includes_es jsonb NOT NULL DEFAULT '[]',
  includes_en jsonb NOT NULL DEFAULT '[]',
  excludes_es jsonb NOT NULL DEFAULT '[]',
  excludes_en jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tours" ON tours FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Authenticated users can insert tours" ON tours FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tours" ON tours FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete tours" ON tours FOR DELETE TO authenticated USING (true);

-- RESERVATIONS
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES tours(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  travelers integer NOT NULL DEFAULT 1,
  departure_date text NOT NULL,
  total_price_mxn numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  stripe_session_id text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all reservations" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert reservations" ON reservations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update reservations" ON reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete reservations" ON reservations FOR DELETE TO authenticated USING (true);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  tour_id uuid REFERENCES tours(id) ON DELETE SET NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment_es text NOT NULL DEFAULT '',
  comment_en text DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved reviews" ON reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "Authenticated users can read all reviews" ON reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert reviews" ON reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update reviews" ON reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete reviews" ON reviews FOR DELETE TO authenticated USING (true);

-- BLOG POSTS
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es text NOT NULL,
  title_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  summary_es text NOT NULL DEFAULT '',
  summary_en text NOT NULL DEFAULT '',
  content_es text NOT NULL DEFAULT '',
  content_en text NOT NULL DEFAULT '',
  cover_image text DEFAULT '',
  category text NOT NULL DEFAULT 'destinos' CHECK (category IN ('destinos', 'festivales', 'tips', 'cultura')),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published posts" ON blog_posts FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Authenticated users can read all posts" ON blog_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert posts" ON blog_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update posts" ON blog_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete posts" ON blog_posts FOR DELETE TO authenticated USING (true);
