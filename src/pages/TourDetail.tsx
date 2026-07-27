import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import {
  MapPin, Clock, Users, Calendar, Check, X as XIcon,
  ChevronDown, ChevronUp, Phone, Mail, User, MessageSquare,
  ArrowLeft, Share2, LogIn, CheckCircle, CreditCard, Banknote, Building2,
  Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { sendEmail } from '../lib/email';
import type { Tour, BookingFormData } from '../types';
import { getEffectivePrice, isPresaleActive } from '../types';
import TourCard from '../components/ui/TourCard';
import { useSEO } from '../hooks/useSEO';
import { tourSchema, breadcrumbSchema } from '../lib/structuredData';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050';

function cleanHtml(raw: string): string {
  if (!raw) return '';
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  doc.querySelectorAll('[class],[style]').forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
  });
  // Replace FB emoji images with their alt text
  doc.querySelectorAll('img').forEach((img) => {
    img.replaceWith(img.alt || '');
  });
  // Unwrap meaningless spans/divs that only wrap inline text
  doc.querySelectorAll('span').forEach((span) => {
    span.replaceWith(...Array.from(span.childNodes));
  });
  // Convert div wrappers to paragraphs
  doc.querySelectorAll('div').forEach((div) => {
    const p = doc.createElement('p');
    p.append(...Array.from(div.childNodes));
    div.replaceWith(p);
  });
  return doc.body.innerHTML;
}

export default function TourDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tour, setTour] = useState<Tour | null>(null);
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [openItinerary, setOpenItinerary] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [profilePrefilled, setProfilePrefilled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'oxxo' | 'bank_transfer'>('card');
  const [transferReservation, setTransferReservation] = useState<{ id: string; reservationNumber: string | null } | null>(null);
  const [availability, setAvailability] = useState<Record<string, number>>({});

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<BookingFormData>({
    defaultValues: { travelers: 1 },
  });

  const travelers = watch('travelers') || 1;
  const selectedDate = watch('departure_date');
  const selectedDateSpots = selectedDate ? (availability[selectedDate] ?? 0) : 0;

  const _seoTitle = tour ? `${lang === 'en' ? tour.title_en : tour.title_es} desde ${getEffectivePrice(tour).toLocaleString('es-MX')} MXN` : '';
  const _seoDesc = tour ? (lang === 'en' ? tour.description_en : tour.description_es).slice(0, 155) : '';
  const _seoJsonLd = tour ? [
    tourSchema(tour, lang),
    breadcrumbSchema([
      { name: 'Inicio', path: '/' },
      { name: 'Tours', path: '/tours' },
      { name: lang === 'en' ? tour.title_en : tour.title_es, path: `/tours/${tour.slug}` },
    ]),
  ] : [];

  useSEO({
    title: _seoTitle,
    description: _seoDesc,
    path: tour ? `/tours/${tour.slug}` : '',
    image: tour?.image_urls?.[0] || '/Logo_Bandera.jpg',
    type: 'product',
    jsonLd: _seoJsonLd,
  });

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase.from('tours').select('*, categories(*)').eq('slug', slug).maybeSingle();
      if (data) {
        setTour(data);
        const { data: related } = await supabase
          .from('tours')
          .select('*')
          .eq('is_active', true)
          .eq('category_id', data.category_id)
          .neq('slug', slug)
          .limit(3);
        if (related) setRelatedTours(related);

        const { data: avail, error: availErr } = await supabase.rpc('get_tour_availability', { p_tour_id: data.id });
        if (!availErr && avail) {
          const map: Record<string, number> = {};
          for (const row of avail as { departure_date: string; available_spots: number }[]) {
            map[row.departure_date] = row.available_spots;
          }
          setAvailability(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  // Pre-fill booking form from user profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = data?.full_name || user.user_metadata?.full_name || '';
        const phone = data?.phone || '';
        const email = user.email || '';
        if (name || phone || email) {
          reset((prev) => ({
            ...prev,
            departure_date: tour?.departure_dates?.length === 1 ? tour.departure_dates[0] : prev.departure_date,
            customer_name: name,
            email,
            phone,
          }));
          setProfilePrefilled(true);
        }
      });
  }, [user, reset]);

  const onSubmit = async (data: BookingFormData, method?: 'card' | 'oxxo' | 'bank_transfer') => {
    // If only one departure date exists, use it directly regardless of form value
    if (tour?.departure_dates?.length === 1) {
      data.departure_date = tour.departure_dates[0];
    }
    if (!tour) return;

    if (!user) {
      navigate(`/login?redirect=/tours/${slug}`);
      return;
    }

    const effectiveMethod = method ?? paymentMethod;

    setSubmitting(true);
    setCheckoutError('');

    const numTravelers = Number(data.travelers);
    const unitPrice = getEffectivePrice(tour);
    const totalPrice = unitPrice * numTravelers;
    const depositPct = tour.deposit_percentage ?? 40;
    const depositAmount = Math.ceil(totalPrice * depositPct / 100);
    const remainingBalance = totalPrice - depositAmount;
    const tourTitle = lang === 'en' ? tour.title_en : tour.title_es;

    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        tour_id: tour.id,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone,
        travelers: numTravelers,
        departure_date: data.departure_date,
        total_price_mxn: totalPrice,
        deposit_percentage_applied: depositPct,
        deposit_amount_mxn: depositAmount,
        remaining_balance_mxn: remainingBalance,
        payment_status: 'pending',
        payment_method_type: effectiveMethod,
        confirmation_token: effectiveMethod === 'bank_transfer' ? crypto.randomUUID() : null,
        notes: data.notes || '',
      })
      .select('id')
      .single();

    if (reservationError || !reservation) {
      const msg = reservationError?.message ?? '';
      if (msg.includes('Capacidad insuficiente')) {
        setCheckoutError(lang === 'en'
          ? 'Sorry, there are not enough spots available for this date. Please select another date or fewer travelers.'
          : 'No hay suficientes lugares disponibles para esta fecha. Por favor selecciona otra fecha o menos viajeros.');
      } else {
        setCheckoutError(lang === 'en' ? 'Failed to save reservation. Please try again.' : 'Error al guardar la reserva. Intenta de nuevo.');
      }
      setSubmitting(false);
      return;
    }

    const emailData = {
      tour_title: tourTitle,
      customer_name: data.customer_name,
      email: data.email,
      phone: data.phone,
      departure_date: data.departure_date,
      travelers: String(numTravelers),
      total: String(totalPrice),
      deposit_amount: String(depositAmount),
      remaining_balance: String(remainingBalance),
      deposit_percentage: String(depositPct),
      notes: data.notes || '',
      payment_method: effectiveMethod,
    };

    // Bank transfer: skip Stripe entirely, show transfer instructions screen
    if (effectiveMethod === 'bank_transfer') {
      sendEmail('reservation_bank_transfer', data.email, emailData);
      sendEmail('reservation_admin', 'contacto@recorramosmexico.com.mx', emailData);
      setTransferReservation({ id: reservation.id, reservationNumber: null });
      setSubmitting(false);
      return;
    }

    // For async payment methods (OXXO), send a "pending" email explaining
    // the reservation is not confirmed until payment is received (max 72h).
    // For card payments, the webhook sends the confirmation email once payment is confirmed.
    if (effectiveMethod === 'oxxo') {
      sendEmail('reservation_pending_payment', data.email, emailData);
    }
    sendEmail('reservation_admin', 'contacto@recorramosmexico.com.mx', emailData);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate(`/login?redirect=/tours/${slug}`);
      return;
    }

    // Charge only the deposit amount
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unit_amount: Math.round(depositAmount * 100),
          quantity: 1,
          product_name: `${tourTitle} — Anticipo ${depositPct}%`,
          reservation_id: reservation.id,
          payment_method: paymentMethod,
          payment_type: 'deposit',
          success_url: `${window.location.origin}/success?reservation_id=${reservation.id}&session_id={CHECKOUT_SESSION_ID}&method=${paymentMethod}`,
          cancel_url: `${window.location.origin}/cancel?reservation_id=${reservation.id}`,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.url) {
      setCheckoutError(result.error || (lang === 'en' ? 'Error creating checkout session.' : 'Error al crear la sesión de pago.'));
      setSubmitting(false);
      return;
    }

    window.location.href = result.url;
  };



  const handleWhatsAppBook = () => {
    if (!tour) return;
    const title = lang === 'en' ? tour.title_en : tour.title_es;
    const todayStr = new Date().toISOString().slice(0, 10);
    const hasFuture = (tour.departure_dates ?? []).some((d) => d >= todayStr);
    const lastDate = (tour.departure_dates ?? []).slice().sort().pop() || '';
    const msg = !hasFuture
      ? `¡Hola! Me interesa saber si próximamente habrá nuevas fechas de este tour que ya pasó: *${title}*\nFecha: ${lastDate}`
      : user
        ? `¡Hola! Me interesa reservar el tour: *${title}*\nFecha: ${selectedDate || 'Por confirmar'}\nViajeros: ${travelers}\nPrecio estimado: ${(getEffectivePrice(tour) * travelers).toLocaleString('es-MX')} MXN`
        : `¡Hola! Me interesa reservar el tour: *${title}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-3 h-3 bg-[#E8670A] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('common.notFound')}</h1>
        <Link to="/tours" className="text-[#E8670A] font-semibold hover:underline flex items-center gap-2">
          <ArrowLeft size={18} /> {lang === 'en' ? 'Back to tours' : 'Volver a tours'}
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-white rounded-3xl p-10 shadow-lg max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-[#1B4332]" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">{t('tourDetail.confirmation.title')}</h1>
          <p className="text-[#E8670A] font-semibold mb-4">{t('tourDetail.confirmation.subtitle')}</p>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">{t('tourDetail.confirmation.message')}</p>
          <div className="flex flex-col gap-3">
            <Link to="/" className="px-6 py-3 bg-[#E8670A] text-white font-bold rounded-xl">
              {t('tourDetail.confirmation.backHome')}
            </Link>
            <Link to="/tours" className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">
              {t('tourDetail.confirmation.viewTours')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const futureDates = (tour.departure_dates ?? []).filter((d) => d >= today);
  const isPastTour = futureDates.length === 0;

  const title = lang === 'en' ? tour.title_en : tour.title_es;
  const description = lang === 'en' ? tour.description_en : tour.description_es;
  const itinerary = lang === 'en' ? tour.itinerary_en : tour.itinerary_es;
  const includes = lang === 'en' ? tour.includes_en : tour.includes_es;
  const excludes = lang === 'en' ? tour.excludes_en : tour.excludes_es;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/tours" className="flex items-center gap-2 text-gray-500 hover:text-[#E8670A] transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            {lang === 'en' ? 'All tours' : 'Todos los tours'}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 text-sm font-medium truncate">{title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-gray-200">
                <img
                  src={tour.image_urls?.[selectedImage] || `https://picsum.photos/seed/${tour.slug}/1200/675`}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    const msg = `${window.location.href}`;
                    navigator.clipboard?.writeText(msg);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow"
                >
                  <Share2 size={16} className="text-gray-700" />
                </button>
              </div>
              {tour.image_urls?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {tour.image_urls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === selectedImage ? 'border-[#E8670A]' : 'border-transparent'}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-[#E8670A]/10 text-[#E8670A] text-xs font-bold rounded-full uppercase tracking-wide">
                  {(tour as Tour & { categories?: { name_es: string; name_en: string } })?.categories?.[lang === 'en' ? 'name_en' : 'name_es']}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <MapPin size={12} /> {tour.destination}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <Clock size={12} /> {tour.duration_days} {t('tourDetail.days')}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <Users size={12} /> {lang === 'en' ? 'Max' : 'Máx'} {tour.max_capacity}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{title}</h1>
              <div className="text-gray-600 leading-relaxed prose prose-lg max-w-none prose-headings:font-black prose-headings:text-gray-900 prose-a:text-[#E8670A] prose-strong:text-gray-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: cleanHtml(description) }} />
            </div>

            {/* Includes / Excludes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-2xl p-6">
                <h3 className="font-bold text-[#1B4332] text-lg mb-4 flex items-center gap-2">
                  <Check size={20} className="text-[#1B4332]" /> {t('tourDetail.includes')}
                </h3>
                <ul className="space-y-2">
                  {(includes || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check size={16} className="text-[#1B4332] mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 rounded-2xl p-6">
                <h3 className="font-bold text-red-700 text-lg mb-4 flex items-center gap-2">
                  <XIcon size={20} className="text-red-600" /> {t('tourDetail.excludes')}
                </h3>
                <ul className="space-y-2">
                  {(excludes || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <XIcon size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Itinerary */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-4">{t('tourDetail.itinerary')}</h2>
              <div className="space-y-3">
                {(itinerary || []).map((day, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setOpenItinerary(openItinerary === i ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-[#E8670A] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {day.day}
                        </span>
                        <span className="font-semibold text-gray-800">{day.title}</span>
                      </div>
                      {openItinerary === i ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </button>
                    {openItinerary === i && (
                      <div className="px-5 pb-5 ml-11">
                        <div className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-[#E8670A] prose-strong:text-gray-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: cleanHtml(day.description) }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Departure Dates */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-4">{t('tourDetail.departureDates')}</h2>
              <div className="flex flex-wrap gap-3">
                {(tour.departure_dates || []).map((date, i) => {
                  const spots = availability[date] ?? 0;
                  const soldOut = spots <= 0;
                  return (
                    <div key={i} className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm ${soldOut ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                      <Calendar size={15} className={soldOut ? 'text-red-400' : 'text-[#E8670A]'} />
                      <span className="font-medium text-gray-800">{formatDate(date)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${soldOut ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-50'}`}>
                        {soldOut
                          ? (lang === 'en' ? 'Sold out' : 'Agotado')
                          : `${spots} ${t('tourDetail.spotsLeft')}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Booking */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-[#1A1A1A] p-6">
                  <p className="text-gray-400 text-sm">{t('tourDetail.from')}</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl font-black text-[#E8670A]">
                      ${getEffectivePrice(tour).toLocaleString('es-MX')}
                    </span>
                    <span className="text-gray-400 text-sm">{t('tourDetail.perPerson')}</span>
                    {isPresaleActive(tour) && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                        Preventa
                      </span>
                    )}
                  </div>
                  {isPresaleActive(tour) && tour.price_mxn !== getEffectivePrice(tour) && (
                    <p className="text-gray-500 text-xs mt-1 line-through">
                      ${tour.price_mxn.toLocaleString('es-MX')} {t('common.currency')}
                    </p>
                  )}
                  {isPresaleActive(tour) && tour.presale_end_date && (
                    <p className="text-green-400 text-xs mt-1">
                      {lang === 'en' ? 'Presale ends' : 'Preventa termina'} {new Date(tour.presale_end_date + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">{t('common.currency')} · {tour.duration_days} {t('tourDetail.days')}</p>
                </div>

                {!user ? (
                  <div className="p-6 space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg">{t('tourDetail.bookingForm.title')}</h3>
                    <div className="py-6 flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center">
                        <LogIn size={24} className="text-[#E8670A]" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-base">
                          {lang === 'en' ? 'Sign in to book online' : 'Inicia sesión para reservar en línea'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {lang === 'en'
                            ? 'Create an account or sign in to complete your booking securely.'
                            : 'Crea una cuenta o inicia sesión para completar tu reserva de forma segura.'}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/login?redirect=/tours/${slug}`}
                      className="w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors flex items-center justify-center gap-2"
                    >
                      <LogIn size={18} />
                      {lang === 'en' ? 'Sign In' : 'Iniciar Sesión'}
                    </Link>
                    <div className="relative flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400 font-medium">{lang === 'en' ? 'or' : 'o'}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <button
                      type="button"
                      onClick={handleWhatsAppBook}
                      className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE57] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      {t('tourDetail.bookingForm.whatsappBook')}
                    </button>
                  </div>
                ) : isPastTour ? (
                <div className="p-6 space-y-4">
                  <div className="flex flex-col items-center text-center gap-4 py-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Calendar size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-base">
                        {lang === 'en' ? 'This tour has ended' : 'Este tour ya finalizó'}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {lang === 'en'
                          ? 'There are no upcoming dates for this tour. Contact us to find out about future editions.'
                          : 'No hay fechas próximas para este tour. Contáctanos para conocer ediciones futuras.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleWhatsAppBook}
                    className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE57] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {lang === 'en' ? 'Ask about future dates' : 'Preguntar por fechas futuras'}
                  </button>
                </div>
        ) : (
                <form onSubmit={handleSubmit((data) => onSubmit(data))} className="p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg">{t('tourDetail.bookingForm.title')}</h3>

                  {profilePrefilled && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <CheckCircle size={13} className="flex-shrink-0" />
                      <span>
                        {lang === 'en'
                          ? 'Data loaded from your profile. You can edit before submitting.'
                          : 'Datos cargados desde tu perfil. Puedes editarlos antes de enviar.'}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('tourDetail.bookingForm.name')}</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        {...register('customer_name', { required: true })}
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.customer_name ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('tourDetail.bookingForm.email')}</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        {...register('email', { required: true })}
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('tourDetail.bookingForm.phone')}</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        {...register('phone', { required: true })}
                        placeholder="+52 55 1234 5678"
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('tourDetail.bookingForm.travelers')}</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedDateSpots > 0 ? selectedDateSpots : tour.max_capacity}
                        {...register('travelers', { required: true, min: 1, max: selectedDateSpots > 0 ? selectedDateSpots : tour.max_capacity })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
                      />
                      {selectedDateSpots > 0 && selectedDateSpots < tour.max_capacity && (
                        <p className="text-xs text-orange-600 mt-1">
                          {lang === 'en' ? `${selectedDateSpots} spots left for this date` : `${selectedDateSpots} lugares disponibles para esta fecha`}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('tourDetail.bookingForm.departureDate')}</label>
                      {futureDates.length === 1 ? (
                        <div className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 font-medium">
                          {formatDate(futureDates[0])}
                        </div>
                      ) : (
                      <select
                        {...register('departure_date', { required: true })}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 ${errors.departure_date ? 'border-red-400' : 'border-gray-200'}`}
                      >
                        <option value="">{t('tourDetail.bookingForm.selectDate')}</option>
                        {futureDates.map((d) => {
                          const spots = availability[d] ?? 0;
                          return (
                            <option key={d} value={d} disabled={spots <= 0}>
                              {formatDate(d)}{spots <= 0 ? (lang === 'en' ? ' — Sold out' : ' — Agotado') : ` (${spots} ${lang === 'en' ? 'spots' : 'lugares'})`}
                            </option>
                          );
                        })}
                      </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t('tourDetail.bookingForm.notes')}</label>
                    <div className="relative">
                      <MessageSquare size={16} className="absolute left-3 top-3 text-gray-400" />
                      <textarea
                        {...register('notes')}
                        rows={3}
                        placeholder={t('tourDetail.bookingForm.notesPlaceholder')}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
                      />
                    </div>
                  </div>

                  {travelers > 0 && (
                    <div className="space-y-2">
                      <div className="bg-orange-50 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">{t('tourDetail.bookingForm.total')}</span>
                          <span className="text-lg font-black text-gray-700 line-through opacity-50">
                            ${(getEffectivePrice(tour) * travelers).toLocaleString('es-MX')} MXN
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-[#E8670A]">
                            {lang === 'en' ? `Deposit (${tour.deposit_percentage ?? 40}%)` : `Anticipo (${tour.deposit_percentage ?? 40}%)`}
                          </span>
                          <span className="text-xl font-black text-[#E8670A]">
                            ${Math.ceil(getEffectivePrice(tour) * travelers * (tour.deposit_percentage ?? 40) / 100).toLocaleString('es-MX')} MXN
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 border-t border-orange-100 pt-2">
                          {lang === 'en'
                            ? `Remaining balance ${(getEffectivePrice(tour) * travelers - Math.ceil(getEffectivePrice(tour) * travelers * (tour.deposit_percentage ?? 40) / 100)).toLocaleString('es-MX')} MXN paid in cash when boarding.`
                            : `Saldo restante ${(getEffectivePrice(tour) * travelers - Math.ceil(getEffectivePrice(tour) * travelers * (tour.deposit_percentage ?? 40) / 100)).toLocaleString('es-MX')} MXN se paga en efectivo al abordar.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment method selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">
                      {lang === 'en' ? 'Payment method' : 'Método de pago'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'card', label: lang === 'en' ? 'Card' : 'Tarjeta', Icon: CreditCard },
                        { id: 'oxxo', label: 'OXXO', Icon: Banknote },
                      ] as const).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPaymentMethod(id)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                            paymentMethod === id
                              ? 'border-[#E8670A] bg-orange-50 text-[#E8670A]'
                              : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                    {paymentMethod === 'oxxo' && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                        {lang === 'en'
                          ? 'You will receive a voucher to pay at any OXXO store within 3 days.'
                          : 'Recibirás un voucher para pagar en cualquier tienda OXXO en 3 días.'}
                      </p>
                    )}
                  </div>

                  {checkoutError && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || (selectedDate && selectedDateSpots <= 0)}
                    className="w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
                  >
                    {submitting ? t('common.loading') : (selectedDate && selectedDateSpots <= 0 ? (lang === 'en' ? 'No spots available' : 'Sin lugares disponibles') : t('tourDetail.bookingForm.proceedPayment'))}
                  </button>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-xs text-gray-400 font-medium">
                        {lang === 'en' ? 'or pay by' : 'o paga con'}
                      </span>
                    </div>
                  </div>

                  {/* Bank transfer section */}
                  <div className="border-2 border-blue-100 rounded-xl p-4 bg-blue-50/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 size={18} className="text-blue-600" />
                      <span className="text-sm font-bold text-gray-700">
                        {lang === 'en' ? 'Bank Transfer (SPEI)' : 'Transferencia Bancaria (SPEI)'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Banco</span>
                        <span className="font-semibold">Bancomer (BBVA)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tarjeta</span>
                        <span className="font-mono font-semibold">4152 3141 0698 0256</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">CLABE</span>
                        <span className="font-mono font-semibold">012180004833647476</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Titular</span>
                        <span className="font-semibold">Trinidad Gil Martinez</span>
                      </div>
                    </div>
                    {travelers > 0 && (
                      <div className="bg-orange-50 rounded-lg px-3 py-2 mb-3 text-xs">
                        <span className="font-semibold text-[#E8670A]">
                          {lang === 'en' ? 'Deposit to transfer: ' : 'Anticipo a transferir: '}
                        </span>
                        <span className="font-black text-[#E8670A]">
                          ${Math.ceil(getEffectivePrice(tour) * travelers * (tour.deposit_percentage ?? 40) / 100).toLocaleString('es-MX')} MXN
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSubmit((data) => onSubmit(data, 'bank_transfer'))()}
                      disabled={submitting || (selectedDate && selectedDateSpots <= 0)}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                    >
                      {submitting ? t('common.loading') : (lang === 'en' ? 'Reserve with Bank Transfer' : 'Reservar con Transferencia')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleWhatsAppBook}
                    className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE57] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {t('tourDetail.bookingForm.whatsappBook')}
                  </button>
                </form>
              )}

              {/* Bank transfer confirmation screen */}
              {transferReservation && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">
                        {lang === 'en' ? 'Reservation Created!' : '¡Reserva Creada!'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {lang === 'en' ? 'Complete your bank transfer to confirm your spot.' : 'Completa tu transferencia para confirmar tu lugar.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <Building2 size={16} /> {lang === 'en' ? 'Bank Details' : 'Datos Bancarios'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Banco</span>
                        <span className="font-bold text-gray-900">Bancomer (BBVA)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tarjeta</span>
                        <span className="font-mono font-bold text-gray-900">4152 3141 0698 0256</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">CLABE</span>
                        <span className="font-mono font-bold text-gray-900">012180004833647476</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Titular</span>
                        <span className="font-bold text-gray-900">Trinidad Gil Martinez</span>
                      </div>
                    </div>
                    {travelers > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex justify-between">
                          <span className="font-semibold text-[#E8670A]">{lang === 'en' ? 'Deposit to transfer' : 'Anticipo a transferir'}</span>
                          <span className="font-black text-[#E8670A] text-lg">
                            ${Math.ceil(getEffectivePrice(tour) * travelers * (tour.deposit_percentage ?? 40) / 100).toLocaleString('es-MX')} MXN
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800 font-semibold mb-1">
                      {lang === 'en' ? 'Important: You have 72 hours to complete the transfer.' : 'Importante: Tienes 72 horas para realizar la transferencia.'}
                    </p>
                    <p className="text-xs text-amber-700">
                      {lang === 'en'
                        ? 'Once you make the transfer, upload your payment proof from "My Reservations" in your account so we can confirm your reservation.'
                        : 'Una vez que hagas la transferencia, sube tu comprobante de pago desde "Mis Reservas" en tu cuenta para que confirmemos tu reserva.'}
                    </p>
                  </div>

                  <Link
                    to="/mi-cuenta"
                    className="w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    {lang === 'en' ? 'Go to My Reservations' : 'Ir a Mis Reservas'}
                  </Link>

                  <a
                    href={`https://wa.me/525623872050?text=${encodeURIComponent(`Hola, acabo de hacer una reserva para el tour "${tour ? (lang === 'en' ? tour.title_en : tour.title_es) : ''}". Adjunto mi comprobante de transferencia.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE57] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {lang === 'en' ? 'Send Proof via WhatsApp' : 'Enviar Comprobante por WhatsApp'}
                  </a>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Related Tours */}
        {relatedTours.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-black text-gray-900 mb-6">{t('tourDetail.relatedTours')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedTours.map((t) => (
                <TourCard key={t.id} tour={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
