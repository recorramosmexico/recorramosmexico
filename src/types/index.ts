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

export interface BookingFormData {
  customer_name: string;
  email: string;
  phone: string;
  travelers: number;
  departure_date: string;
  notes: string;
}

export function getEffectivePrice(tour: Pick<Tour, 'price_mxn' | 'presale_price_mxn' | 'presale_end_date'>): number {
  if (tour.presale_price_mxn != null && tour.presale_end_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(tour.presale_end_date + 'T00:00:00');
    if (today <= end) return tour.presale_price_mxn;
  }
  return tour.price_mxn;
}

export function isPresaleActive(tour: Pick<Tour, 'presale_price_mxn' | 'presale_end_date'>): boolean {
  if (tour.presale_price_mxn == null || !tour.presale_end_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(tour.presale_end_date + 'T00:00:00');
  return today <= end;
}
