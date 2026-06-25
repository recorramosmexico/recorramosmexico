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
  payment_status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  stripe_session_id: string;
  notes: string;
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
