export interface Category {
  id: string;
  name_es: string;
  name_en: string;
  slug: string;
  icon_name: string;
  description_es: string;
  description_en: string;
  created_at: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface Supplement {
  name: string;
  price: number;
}

export interface Tour {
  id: string;
  title_es: string;
  title_en: string;
  slug: string;
  description_es: string;
  description_en: string;
  category_id: string | null;
  destination: string;
  price_mxn: number;
  presale_price_mxn: number | null;
  presale_end_date: string | null;
  duration_days: number;
  min_participants: number;
  max_capacity: number;
  difficulty: 'low' | 'medium' | 'high';
  meeting_point: string | null;
  departure_dates: string[];
  image_urls: string[];
  itinerary_es: ItineraryDay[];
  itinerary_en: ItineraryDay[];
  includes_es: string[];
  includes_en: string[];
  excludes_es: string[];
  excludes_en: string[];
  is_active: boolean;
  is_featured: boolean;
  deposit_percentage: number;
  supplements: Supplement[];
  created_at: string;
  categories?: Category;
}

export interface Reservation {
  id: string;
  tour_id: string | null;
  customer_name: string;
  email: string;
  phone: string;
  travelers: number;
  departure_date: string;
  total_price_mxn: number;
  payment_status: 'pending' | 'deposit_paid' | 'paid' | 'refunded' | 'cancelled';
  stripe_session_id: string;
  notes: string;
  deposit_percentage_applied: number | null;
  deposit_amount_mxn: number | null;
  remaining_balance_mxn: number | null;
  balance_payment_requested_at: string | null;
  balance_stripe_session_id: string | null;
  payment_method_type: string | null;
  payment_proof_url: string | null;
  reservation_number: string | null;
  review_request_sent_at: string | null;
  created_at: string;
  tours?: Tour;
}

export interface Review {
  id: string;
  customer_name: string;
  tour_id: string | null;
  rating: number;
  comment_es: string;
  comment_en: string;
  is_approved: boolean;
  created_at: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  tours?: Tour;
}

export interface BlogPost {
  id: string;
  title_es: string;
  title_en: string;
  slug: string;
  summary_es: string;
  summary_en: string;
  content_es: string;
  content_en: string;
  cover_image: string;
  category: 'destinos' | 'festivales' | 'tips' | 'cultura';
  is_published: boolean;
  created_at: string;
}

export interface ProductSize {
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  title_es: string;
  title_en: string;
  slug: string;
  description_es: string;
  description_en: string;
  price_mxn: number;
  shipping_cost_mxn: number;
  category: string;
  sizes: ProductSize[];
  image_urls: string[];
  is_active: boolean;
  created_at: string;
}

export interface ProductOrder {
  id: string;
  user_id: string;
  product_id: string | null;
  quantity: number;
  size: string;
  unit_price_mxn: number;
  total_mxn: number;
  shipping_cost_mxn: number;
  delivery_method: 'shipping' | 'personal_cdmx';
  shipping_address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    zip: string;
    references: string;
  } | null;
  tracking_number: string | null;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  payment_method_type: 'card' | 'oxxo' | 'bank_transfer' | null;
  stripe_session_id: string | null;
  payment_proof_url: string | null;
  confirmation_token: string | null;
  order_number: string | null;
  refund_status: string | null;
  refund_method: 'stripe' | 'bank_transfer' | null;
  refunded_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  products?: Pick<Product, 'title_es' | 'title_en' | 'image_urls' | 'slug'> | null;
}

export interface BookingFormData {
  customer_name: string;
  email: string;
  phone: string;
  travelers: number;
  departure_date: string;
  notes: string;
}

export function getMexicoCityDate(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs - 6 * 3600000);
}

export function getMexicoCityDateString(): string {
  return getMexicoCityDate().toISOString().slice(0, 10);
}

export function getEffectivePrice(tour: Pick<Tour, 'price_mxn' | 'presale_price_mxn' | 'presale_end_date'>): number {
  if (tour.presale_price_mxn != null && tour.presale_end_date) {
    const today = getMexicoCityDateString();
    if (today <= tour.presale_end_date) return tour.presale_price_mxn;
  }
  return tour.price_mxn;
}

export function isPresaleActive(tour: Pick<Tour, 'presale_price_mxn' | 'presale_end_date'>): boolean {
  if (tour.presale_price_mxn == null || !tour.presale_end_date) return false;
  const today = getMexicoCityDateString();
  return today <= tour.presale_end_date;
}
