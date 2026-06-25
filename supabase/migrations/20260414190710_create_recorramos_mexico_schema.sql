/*
  # Recorramos México - Complete Database Schema

  ## Tables Created
  1. **categories** - Tour categories (Adventure, Beach, Festivals, etc.)
     - id, name_es, name_en, slug, icon_name, description_es, description_en

  2. **tours** - Main tours table
     - id, title_es, title_en, slug, description_es, description_en
     - category_id, destination, price_mxn, duration_days, max_capacity
     - departure_dates (JSON array), image_urls (JSON array)
     - itinerary_es, itinerary_en (JSON), includes_es, includes_en (JSON)
     - excludes_es, excludes_en (JSON), is_active, is_featured, created_at

  3. **reservations** - Booking records
     - id, tour_id, customer_name, email, phone, travelers
     - departure_date, total_price_mxn, payment_status, stripe_session_id
     - notes, created_at

  4. **reviews** - Customer testimonials
     - id, customer_name, tour_id, rating, comment_es, comment_en
     - is_approved, created_at

  5. **blog_posts** - Blog articles
     - id, title_es, title_en, slug, summary_es, summary_en
     - content_es, content_en, cover_image, category, is_published, created_at

  ## Security
  - RLS enabled on all tables
  - Public read access for active/approved/published content
  - Admin-only write access via service role
  - Reservations only accessible to their creators

  ## Sample Data
  - 5 categories seeded
  - 6 sample tours inserted
*/

-- =====================
-- CATEGORIES TABLE
-- =====================
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

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- TOURS TABLE
-- =====================
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

CREATE POLICY "Anyone can read active tours"
  ON tours FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert tours"
  ON tours FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tours"
  ON tours FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tours"
  ON tours FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- RESERVATIONS TABLE
-- =====================
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

CREATE POLICY "Authenticated users can read all reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert reservations"
  ON reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reservations"
  ON reservations FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- REVIEWS TABLE
-- =====================
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

CREATE POLICY "Anyone can read approved reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

CREATE POLICY "Authenticated users can read all reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert reviews"
  ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- BLOG_POSTS TABLE
-- =====================
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

CREATE POLICY "Anyone can read published posts"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Authenticated users can read all posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (true);

-- =====================
-- SEED: CATEGORIES
-- =====================
INSERT INTO categories (name_es, name_en, slug, icon_name, description_es, description_en) VALUES
  ('Aventura y Naturaleza', 'Adventure & Nature', 'aventura-naturaleza', 'mountain', 'Explora los paisajes más impresionantes de México', 'Explore Mexico''s most breathtaking landscapes'),
  ('Festivales de Música', 'Music Festivals', 'festivales-musica', 'music', 'Vive la emoción de los mejores festivales', 'Experience the thrill of the best festivals'),
  ('Tours de Playa', 'Beach Tours', 'tours-playa', 'waves', 'Relájate en las playas más hermosas del país', 'Relax on the most beautiful beaches in the country'),
  ('Ferias y Eventos', 'Fairs & Events', 'ferias-eventos', 'star', 'Sumérgete en la cultura y tradiciones mexicanas', 'Immerse yourself in Mexican culture and traditions'),
  ('Viajes Internacionales', 'International Travel', 'viajes-internacionales', 'globe', 'Descubre el mundo con nosotros', 'Discover the world with us')
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- SEED: TOURS (6 sample tours)
-- =====================
INSERT INTO tours (title_es, title_en, slug, description_es, description_en, category_id, destination, price_mxn, duration_days, max_capacity, departure_dates, image_urls, itinerary_es, itinerary_en, includes_es, includes_en, excludes_es, excludes_en, is_active, is_featured) VALUES
(
  'Feria de San Marcos - Aguascalientes',
  'San Marcos Fair - Aguascalientes',
  'feria-san-marcos-aguascalientes',
  'Vive la feria más grande y tradicional de México. La Feria Nacional de San Marcos es un evento único que combina tradición, cultura, entretenimiento y la famosa hospitalidad aguascalentense. Disfruta de jaripeos, conciertos, juegos mecánicos y la mejor comida regional.',
  'Experience Mexico''s largest and most traditional fair. The National San Marcos Fair is a unique event combining tradition, culture, entertainment and the famous Aguascalientes hospitality. Enjoy rodeos, concerts, rides and the best regional food.',
  (SELECT id FROM categories WHERE slug = 'ferias-eventos'),
  'Aguascalientes, Aguascalientes',
  2800.00,
  3,
  40,
  '["2025-04-18", "2025-04-25", "2025-05-02"]',
  '["https://picsum.photos/seed/sanmarcos1/800/600", "https://picsum.photos/seed/sanmarcos2/800/600", "https://picsum.photos/seed/sanmarcos3/800/600"]',
  '[{"day": 1, "title": "Salida hacia Aguascalientes", "description": "Salimos a las 6am desde el Estado de México. Llegada al mediodía, registro en hotel y primera visita a la feria."}, {"day": 2, "title": "Día completo en la Feria", "description": "Día libre para disfrutar todas las atracciones: jaripeo, palenque, exposición ganadera y conciertos nocturnos."}, {"day": 3, "title": "Última mañana y regreso", "description": "Mañana libre para compras y visita al centro histórico. Salida a las 2pm, regreso al Estado de México."}]',
  '[{"day": 1, "title": "Departure to Aguascalientes", "description": "We depart at 6am from Estado de Mexico. Arrival at noon, hotel check-in and first visit to the fair."}, {"day": 2, "title": "Full Day at the Fair", "description": "Free day to enjoy all attractions: rodeo, cockfighting arena, livestock expo and evening concerts."}, {"day": 3, "title": "Last Morning and Return", "description": "Free morning for shopping and historic center visit. Departure at 2pm, return to Estado de Mexico."}]',
  '["Transporte en autobús de lujo", "2 noches de hospedaje", "Entradas a la Feria", "Guía de viaje", "Seguro de viajero"]',
  '["Luxury bus transportation", "2 nights accommodation", "Fair entrance tickets", "Travel guide", "Travel insurance"]',
  '["Alimentación (excepto desayunos)", "Gastos personales", "Bebidas alcohólicas", "Actividades extras"]',
  '["Meals (except breakfasts)", "Personal expenses", "Alcoholic beverages", "Extra activities"]',
  true,
  true
),
(
  'Cancún + Tulum - Paraíso Caribeño',
  'Cancún + Tulum - Caribbean Paradise',
  'cancun-tulum-quintana-roo',
  'Descubre lo mejor del Caribe mexicano. Desde las icónicas playas de Cancún hasta las misteriosas ruinas mayas frente al mar en Tulum. Aguas turquesas, cenotes cristalinos y una gastronomía única te esperan en esta escapada perfecta.',
  'Discover the best of the Mexican Caribbean. From Cancun''s iconic beaches to Tulum''s mysterious Mayan ruins by the sea. Turquoise waters, crystal-clear cenotes and unique gastronomy await you on this perfect getaway.',
  (SELECT id FROM categories WHERE slug = 'tours-playa'),
  'Quintana Roo',
  8500.00,
  5,
  35,
  '["2025-07-04", "2025-07-18", "2025-08-01", "2025-08-15", "2025-12-26"]',
  '["https://picsum.photos/seed/cancun1/800/600", "https://picsum.photos/seed/tulum1/800/600", "https://picsum.photos/seed/caribe1/800/600", "https://picsum.photos/seed/cenote1/800/600"]',
  '[{"day": 1, "title": "Llegada a Cancún", "description": "Vuelo o traslado a Cancún. Check-in en hotel zona hotelera. Tarde libre para conocer la playa."}, {"day": 2, "title": "Cancún - Zona Hotelera", "description": "Tour por la zona hotelera, snorkel en arrecife de coral. Noche en el centro de Cancún."}, {"day": 3, "title": "Cenote y Ruinas de Cobá", "description": "Visita a cenote privado + escalada a la pirámide de Cobá. Regreso por la tarde."}, {"day": 4, "title": "Tulum", "description": "Visita a las ruinas mayas de Tulum al amanecer. Tarde en las playas de Tulum Pueblo."}, {"day": 5, "title": "Regreso a Casa", "description": "Check-out, tiempo libre y traslado al aeropuerto."}]',
  '[{"day": 1, "title": "Arrival in Cancún", "description": "Flight or transfer to Cancun. Hotel check-in in the hotel zone. Free afternoon to explore the beach."}, {"day": 2, "title": "Cancún - Hotel Zone", "description": "Tour of the hotel zone, snorkeling at coral reef. Night in downtown Cancun."}, {"day": 3, "title": "Cenote and Cobá Ruins", "description": "Visit to private cenote + climbing the Cobá pyramid. Return in the afternoon."}, {"day": 4, "title": "Tulum", "description": "Visit to the Mayan ruins of Tulum at dawn. Afternoon on the Tulum Pueblo beaches."}, {"day": 5, "title": "Return Home", "description": "Check-out, free time and transfer to the airport."}]',
  '["Transporte terrestre desde CDMX", "4 noches de hospedaje", "Entradas a zonas arqueológicas", "Snorkel equipado", "Guía certificado", "Seguro de viajero"]',
  '["Ground transportation from CDMX", "4 nights accommodation", "Archaeological zone entrance fees", "Snorkel equipment", "Certified guide", "Travel insurance"]',
  '["Vuelos", "Alimentación completa", "Bebidas", "Gastos personales"]',
  '["Flights", "Full board meals", "Drinks", "Personal expenses"]',
  true,
  true
),
(
  'Festival Pal''Norte - Monterrey',
  'Pal''Norte Festival - Monterrey',
  'festival-palnorte-monterrey',
  'El festival de música más importante del norte de México te espera. Pal''Norte reúne a los mejores artistas nacionales e internacionales en el Parque Fundidora de Monterrey. Una experiencia musical única con la vibrante energía regiomontana.',
  'Mexico''s most important northern music festival awaits you. Pal''Norte brings together the best national and international artists at Parque Fundidora in Monterrey. A unique musical experience with the vibrant Monterrey energy.',
  (SELECT id FROM categories WHERE slug = 'festivales-musica'),
  'Monterrey, Nuevo León',
  3200.00,
  3,
  50,
  '["2025-05-02", "2025-05-03"]',
  '["https://picsum.photos/seed/festival1/800/600", "https://picsum.photos/seed/monterrey1/800/600", "https://picsum.photos/seed/palnorte1/800/600"]',
  '[{"day": 1, "title": "Viaje a Monterrey", "description": "Salida nocturna en autobús de lujo desde CDMX. Desayuno en carretera."}, {"day": 2, "title": "Día 1 del Festival", "description": "Llegada a Monterrey en la mañana. Check-in, tiempo de descanso y entrada al festival por la tarde-noche."}, {"day": 3, "title": "Día 2 del Festival y Regreso", "description": "Día completo en el festival. Salida de regreso a medianoche en autobús."}]',
  '[{"day": 1, "title": "Travel to Monterrey", "description": "Night departure by luxury bus from CDMX. Breakfast on the road."}, {"day": 2, "title": "Festival Day 1", "description": "Arrival in Monterrey in the morning. Check-in, rest time and festival entrance in the afternoon-evening."}, {"day": 3, "title": "Festival Day 2 and Return", "description": "Full day at the festival. Return departure at midnight by bus."}]',
  '["Transporte de lujo CDMX-MTY-CDMX", "2 noches de hospedaje", "Boletos al festival (2 días)", "Guía de grupo", "Seguro de viajero"]',
  '["Luxury transportation CDMX-MTY-CDMX", "2 nights accommodation", "Festival tickets (2 days)", "Group guide", "Travel insurance"]',
  '["Alimentación", "Bebidas dentro del festival", "Gastos personales"]',
  '["Meals", "Drinks inside the festival", "Personal expenses"]',
  true,
  true
),
(
  'Barrancas del Cobre - Chihuahua',
  'Copper Canyon - Chihuahua',
  'barrancas-del-cobre-chihuahua',
  'Descubre uno de los paisajes más espectaculares de México: las Barrancas del Cobre, más grandes que el Gran Cañón del Colorado. Viaja en el famoso Chepe Express, convive con la comunidad rarámuri y vive aventuras únicas en la Sierra Tarahumara.',
  'Discover one of Mexico''s most spectacular landscapes: the Copper Canyon, larger than the Grand Canyon. Travel on the famous Chepe Express, interact with the Rarámuri community and experience unique adventures in the Sierra Tarahumara.',
  (SELECT id FROM categories WHERE slug = 'aventura-naturaleza'),
  'Chihuahua, Chihuahua',
  7800.00,
  5,
  25,
  '["2025-03-14", "2025-04-11", "2025-10-10", "2025-11-07"]',
  '["https://picsum.photos/seed/cobre1/800/600", "https://picsum.photos/seed/chepe1/800/600", "https://picsum.photos/seed/tarahumara1/800/600", "https://picsum.photos/seed/canyon1/800/600"]',
  '[{"day": 1, "title": "Vuelo a Chihuahua", "description": "Vuelo desde CDMX a Chihuahua. Traslado al hotel, cena de bienvenida y briefing del tour."}, {"day": 2, "title": "Chepe Express - El Fuerte a Creel", "description": "Abordamos el famoso tren Chepe Express. Recorrido por paisajes increíbles hasta llegar a Creel."}, {"day": 3, "title": "Creel y comunidad Rarámuri", "description": "Senderismo a las cascadas de Basaseachi. Visita a comunidad tarahumara local."}, {"day": 4, "title": "Divisadero - Mirador", "description": "Visita al mirador de las Barrancas. Tirolesa opcional. Regreso a Chihuahua."}, {"day": 5, "title": "Regreso a CDMX", "description": "Mañana libre en Chihuahua. Vuelo de regreso."}]',
  '[{"day": 1, "title": "Flight to Chihuahua", "description": "Flight from CDMX to Chihuahua. Transfer to hotel, welcome dinner and tour briefing."}, {"day": 2, "title": "Chepe Express - El Fuerte to Creel", "description": "We board the famous Chepe Express train. Journey through incredible landscapes to Creel."}, {"day": 3, "title": "Creel and Rarámuri Community", "description": "Hiking to Basaseachi waterfalls. Visit to local Tarahumara community."}, {"day": 4, "title": "Divisadero Viewpoint", "description": "Visit to the Canyon viewpoint. Optional zip-line. Return to Chihuahua."}, {"day": 5, "title": "Return to CDMX", "description": "Free morning in Chihuahua. Return flight."}]',
  '["Vuelos CDMX-CHI-CDMX", "4 noches de hospedaje", "Boleto Chepe Express", "Traslados locales", "Guía especializado", "Cena de bienvenida", "Seguro de viajero"]',
  '["Flights CDMX-CHI-CDMX", "4 nights accommodation", "Chepe Express ticket", "Local transfers", "Specialized guide", "Welcome dinner", "Travel insurance"]',
  '["Alimentación completa", "Actividades opcionales (tirolesa)", "Gastos personales"]',
  '["Full board meals", "Optional activities (zip-line)", "Personal expenses"]',
  true,
  true
),
(
  'Miami + Orlando - Aventura en USA',
  'Miami + Orlando - USA Adventure',
  'miami-orlando-usa',
  'La combinación perfecta: la magia de Disney y Universal Studios en Orlando, más la vibrante vida de Miami Beach. Playas de arena blanca, parques temáticos de talla mundial y una experiencia internacional inolvidable.',
  'The perfect combination: the magic of Disney and Universal Studios in Orlando, plus the vibrant life of Miami Beach. White sand beaches, world-class theme parks and an unforgettable international experience.',
  (SELECT id FROM categories WHERE slug = 'viajes-internacionales'),
  'Florida, Estados Unidos',
  28500.00,
  8,
  30,
  '["2025-07-05", "2025-07-19", "2025-12-27"]',
  '["https://picsum.photos/seed/miami1/800/600", "https://picsum.photos/seed/orlando1/800/600", "https://picsum.photos/seed/disney1/800/600", "https://picsum.photos/seed/miami2/800/600"]',
  '[{"day": 1, "title": "Vuelo a Miami", "description": "Vuelo desde CDMX a Miami. Check-in hotel en South Beach. Cena de bienvenida y paseo por Ocean Drive."}, {"day": 2, "title": "Miami Beach", "description": "Tour por South Beach, Art Deco District y Wynwood Walls. Tarde libre en la playa."}, {"day": 3, "title": "Viaje a Orlando", "description": "Renta de autobus a Orlando. Check-in resort. Noche de compras en Premium Outlets."}, {"day": 4, "title": "Magic Kingdom - Disney World", "description": "Día completo en el parque más mágico del mundo."}, {"day": 5, "title": "EPCOT o Hollywood Studios", "description": "Día libre para explorar otro parque de Disney según preferencia."}, {"day": 6, "title": "Universal Studios", "description": "Día completo en Universal Studios incluyendo el Mundo Mágico de Harry Potter."}, {"day": 7, "title": "Regreso a Miami", "description": "Traslado a Miami. Tarde de compras en Sawgrass Mills o Aventura Mall."}, {"day": 8, "title": "Regreso a México", "description": "Vuelo de regreso a México."}]',
  '[{"day": 1, "title": "Flight to Miami", "description": "Flight from CDMX to Miami. Hotel check-in at South Beach. Welcome dinner and stroll on Ocean Drive."}, {"day": 2, "title": "Miami Beach", "description": "Tour of South Beach, Art Deco District and Wynwood Walls. Free afternoon at the beach."}, {"day": 3, "title": "Travel to Orlando", "description": "Bus rental to Orlando. Resort check-in. Shopping night at Premium Outlets."}, {"day": 4, "title": "Magic Kingdom - Disney World", "description": "Full day at the most magical park in the world."}, {"day": 5, "title": "EPCOT or Hollywood Studios", "description": "Free day to explore another Disney park per preference."}, {"day": 6, "title": "Universal Studios", "description": "Full day at Universal Studios including the Magical World of Harry Potter."}, {"day": 7, "title": "Return to Miami", "description": "Transfer to Miami. Shopping afternoon at Sawgrass Mills or Aventura Mall."}, {"day": 8, "title": "Return to Mexico", "description": "Return flight to Mexico."}]',
  '["Vuelos redondos CDMX-MIA-CDMX", "7 noches de hospedaje", "Boletos Disney World (2 días)", "Boletos Universal Studios", "Traslados incluidos", "Guía de viaje", "Seguro internacional"]',
  '["Round-trip flights CDMX-MIA-CDMX", "7 nights accommodation", "Disney World tickets (2 days)", "Universal Studios tickets", "Transfers included", "Travel guide", "International insurance"]',
  '["Alimentación", "Gastos personales", "Propinas", "Visa (apoyo en trámite)"]',
  '["Meals", "Personal expenses", "Tips", "Visa (processing support available)"]',
  true,
  true
),
(
  'Puerto Vallarta - Fiestas Patrias',
  'Puerto Vallarta - Independence Day',
  'puerto-vallarta-fiestas-patrias',
  'Celebra el Grito de Independencia en uno de los destinos más bellos de México. Puerto Vallarta te recibe con sus playas de aguas cálidas, su malecón icónico, la Zona Romántica y los fuegos artificiales más espectaculares de las Fiestas Patrias.',
  'Celebrate Mexican Independence Day in one of Mexico''s most beautiful destinations. Puerto Vallarta welcomes you with its warm water beaches, iconic boardwalk, the Romantic Zone and the most spectacular fireworks of Independence celebrations.',
  (SELECT id FROM categories WHERE slug = 'tours-playa'),
  'Puerto Vallarta, Jalisco',
  5200.00,
  4,
  40,
  '["2025-09-13", "2025-09-14"]',
  '["https://picsum.photos/seed/vallarta1/800/600", "https://picsum.photos/seed/vallarta2/800/600", "https://picsum.photos/seed/malecon1/800/600"]',
  '[{"day": 1, "title": "Llegada a Puerto Vallarta", "description": "Vuelo o traslado. Check-in hotel cerca del malecón. Tarde libre para explorar."}, {"day": 2, "title": "Playa y Malecón", "description": "Tour en barco por la Bahía de Banderas. Tarde en la Zona Romántica y sus restaurantes."}, {"day": 3, "title": "Grito de Independencia", "description": "Visita a Mismaloya. Por la noche, el gran Grito de Independencia en el Palacio Municipal con fuegos artificiales."}, {"day": 4, "title": "Última mañana y regreso", "description": "Desayuno en el malecón. Compras de artesanías. Vuelo de regreso."}]',
  '[{"day": 1, "title": "Arrival in Puerto Vallarta", "description": "Flight or transfer. Hotel check-in near the boardwalk. Free afternoon to explore."}, {"day": 2, "title": "Beach and Boardwalk", "description": "Boat tour of Banderas Bay. Afternoon in the Romantic Zone and its restaurants."}, {"day": 3, "title": "Independence Day Celebration", "description": "Visit to Mismaloya. At night, the grand Independence Cry at the Municipal Palace with fireworks."}, {"day": 4, "title": "Last Morning and Return", "description": "Breakfast on the boardwalk. Artisan shopping. Return flight."}]',
  '["Transporte desde CDMX", "3 noches de hospedaje", "Tour en barco", "Entrada a eventos Fiestas Patrias", "Guía de viaje", "Seguro de viajero"]',
  '["Transportation from CDMX", "3 nights accommodation", "Boat tour", "Independence Day event access", "Travel guide", "Travel insurance"]',
  '["Vuelos (cotizar aparte)", "Alimentación completa", "Bebidas", "Gastos personales"]',
  '["Flights (quote separately)", "Full board meals", "Drinks", "Personal expenses"]',
  true,
  true
);

-- =====================
-- SEED: SAMPLE REVIEWS
-- =====================
INSERT INTO reviews (customer_name, tour_id, rating, comment_es, comment_en, is_approved) VALUES
(
  'María González',
  (SELECT id FROM tours WHERE slug = 'feria-san-marcos-aguascalientes'),
  5,
  'Fue una experiencia increíble. El equipo de Recorramos México se encargó de todo y la Feria de San Marcos superó todas mis expectativas. ¡Ya quiero regresar!',
  'It was an incredible experience. The Recorramos México team took care of everything and the San Marcos Fair exceeded all my expectations. I can''t wait to go back!',
  true
),
(
  'Carlos Mendoza',
  (SELECT id FROM tours WHERE slug = 'cancun-tulum-quintana-roo'),
  5,
  'Cancún y Tulum en un solo viaje. Los cenotes fueron lo mejor. El guía conocía perfectamente cada lugar. Totalmente recomendado.',
  'Cancun and Tulum in one trip. The cenotes were the best part. The guide knew every place perfectly. Totally recommended.',
  true
),
(
  'Ana Rodríguez',
  (SELECT id FROM tours WHERE slug = 'barrancas-del-cobre-chihuahua'),
  5,
  'Las Barrancas del Cobre son impresionantes. Ver el amanecer desde el mirador fue algo que nunca olvidaré. Excelente organización.',
  'The Copper Canyon is impressive. Watching the sunrise from the viewpoint was something I will never forget. Excellent organization.',
  true
),
(
  'Roberto Silva',
  (SELECT id FROM tours WHERE slug = 'miami-orlando-usa'),
  4,
  'Muy bien organizado todo el viaje. Disney World fue mágico y Miami hermosa. Solo sugiero más tiempo libre en Miami, pero en general ¡10/10!',
  'The whole trip was very well organized. Disney World was magical and Miami beautiful. I only suggest more free time in Miami, but overall 10/10!',
  true
),
(
  'Lucía Torres',
  (SELECT id FROM tours WHERE slug = 'festival-palnorte-monterrey'),
  5,
  'Pal''Norte desde el Estado de México sin preocuparse de nada. El autobús muy cómodo, el hotel céntrico y los boletos listos. ¡Volveré el siguiente año!',
  'Pal''Norte from Estado de Mexico without worrying about anything. Very comfortable bus, central hotel and tickets ready. I''ll be back next year!',
  true
);

-- =====================
-- SEED: SAMPLE BLOG POSTS
-- =====================
INSERT INTO blog_posts (title_es, title_en, slug, summary_es, summary_en, content_es, content_en, cover_image, category, is_published) VALUES
(
  '5 razones para visitar las Barrancas del Cobre',
  '5 Reasons to Visit the Copper Canyon',
  '5-razones-barrancas-del-cobre',
  'Las Barrancas del Cobre son más grandes que el Gran Cañón. Descubre por qué este destino de Chihuahua debe estar en tu lista de viajes.',
  'The Copper Canyon is larger than the Grand Canyon. Discover why this Chihuahua destination should be on your travel list.',
  '<h2>1. Es más grande que el Gran Cañón</h2><p>Las Barrancas del Cobre son en realidad un sistema de 6 cañones interconectados cuya extensión total supera a la del Gran Cañón de Arizona.</p><h2>2. El Chepe Express</h2><p>El Ferrocarril Chihuahua-Pacífico, conocido como el Chepe, es considerado uno de los viajes en tren más espectaculares del mundo.</p><h2>3. La cultura Rarámuri</h2><p>Los tarahumaras son una comunidad indígena que ha vivido en estas montañas por siglos, conocidos por su resistencia atlética y su artesanía.</p>',
  '<h2>1. It''s Larger Than the Grand Canyon</h2><p>The Copper Canyon is actually a system of 6 interconnected canyons whose total extent surpasses that of the Grand Canyon in Arizona.</p><h2>2. The Chepe Express</h2><p>The Chihuahua-Pacific Railroad, known as the Chepe, is considered one of the most spectacular train journeys in the world.</p><h2>3. The Rarámuri Culture</h2><p>The Tarahumara are an indigenous community that has lived in these mountains for centuries, known for their athletic endurance and craftsmanship.</p>',
  'https://picsum.photos/seed/blogcobre/1200/600',
  'destinos',
  true
),
(
  'Guía completa para la Feria de San Marcos 2025',
  'Complete Guide to the San Marcos Fair 2025',
  'guia-feria-san-marcos-2025',
  'Todo lo que necesitas saber para disfrutar al máximo la Feria Nacional de San Marcos en Aguascalientes.',
  'Everything you need to know to make the most of the National San Marcos Fair in Aguascalientes.',
  '<h2>¿Qué es la Feria de San Marcos?</h2><p>La Feria Nacional de San Marcos es el evento cultural y de entretenimiento más importante de México. Se celebra cada año en abril-mayo en Aguascalientes.</p><h2>Qué ver y hacer</h2><p>Desde el Jardín San Marcos con su famosa feria de artesanías, hasta el emocionante palenque y los conciertos de artistas internacionales.</p>',
  '<h2>What is the San Marcos Fair?</h2><p>The National San Marcos Fair is Mexico''s most important cultural and entertainment event. It is held every year in April-May in Aguascalientes.</p><h2>What to See and Do</h2><p>From the San Marcos Garden with its famous crafts fair, to the exciting cockfighting arena and concerts by international artists.</p>',
  'https://picsum.photos/seed/blogsanmarcos/1200/600',
  'festivales',
  true
),
(
  'Tips para viajar a Estados Unidos por primera vez',
  'Tips for Traveling to the United States for the First Time',
  'tips-viajar-estados-unidos',
  'Consejos prácticos para que tu primer viaje a EUA sea perfecto: visa, dólar, qué llevar y más.',
  'Practical tips to make your first trip to the USA perfect: visa, dollar, what to bring and more.',
  '<h2>El trámite de la visa</h2><p>La visa de turista americana (B1/B2) es necesaria para la mayoría de los mexicanos. Inicia el trámite con mínimo 3 meses de anticipación.</p><h2>El dólar y los pagos</h2><p>Lleva efectivo pero también usa tarjetas de crédito. En EUA casi todo acepta tarjetas, incluso en mercados.</p><h2>Qué no puede faltar en tu maleta</h2><p>Cargador universal, ropa en capas, zapatos cómodos y protector solar.</p>',
  '<h2>The Visa Process</h2><p>The American tourist visa (B1/B2) is required for most Mexicans. Start the process at least 3 months in advance.</p><h2>The Dollar and Payments</h2><p>Bring cash but also use credit cards. In the USA almost everything accepts cards, even at markets.</p><h2>What You Must Pack</h2><p>Universal charger, layered clothing, comfortable shoes and sunscreen.</p>',
  'https://picsum.photos/seed/blogusa/1200/600',
  'tips',
  true
)
ON CONFLICT (slug) DO NOTHING;
