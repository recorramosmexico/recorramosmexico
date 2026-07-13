import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mountain, Music, Waves, Star, Globe, Bus, Compass, Ticket, ChevronRight, Quote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category, Tour, Review } from '../types';
import TourCard from '../components/ui/TourCard';
import StarRating from '../components/ui/StarRating';

const ICON_MAP: Record<string, React.ReactNode> = {
  Mountain: <Mountain size={32} />,
  mountain: <Mountain size={32} />,
  Music: <Music size={32} />,
  music: <Music size={32} />,
  Waves: <Waves size={32} />,
  waves: <Waves size={32} />,
  Star: <Star size={32} />,
  star: <Star size={32} />,
  Globe: <Globe size={32} />,
  globe: <Globe size={32} />,
};

const CATEGORY_COLORS = [
  '#1B4332', '#E8670A', '#0077B6', '#7B2D8B', '#1B4332',
  '#B8520A', '#0F4C75', '#6B2D8B', '#2D6A4F', '#C05621',
];

export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [toursRes, reviewsRes, catsRes] = await Promise.all([
        supabase.from('tours').select('*').eq('is_active', true).eq('is_featured', true).limit(6),
        supabase.from('reviews').select('*').eq('is_approved', true).limit(6),
        supabase.from('categories').select('*').order('name_es').limit(8),
      ]);
      if (toursRes.data) setFeaturedTours(toursRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      setLoading(false);
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative min-h-screen bg-[#1A1A1A] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg?auto=compress&cs=tinysrgb&w=1920)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/80 via-transparent to-[#1A1A1A]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 flex flex-col items-center text-center">
          <img
            src="/Logo_Bandera.jpg"
            alt="Recorramos México"
            className="w-48 md:w-64 h-auto rounded-2xl mb-8 shadow-2xl"
          />
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-tight mb-6">
            {t('home.hero.title').split(' ').slice(0, 2).join(' ')}{' '}
            <span className="text-[#E8670A]">{t('home.hero.title').split(' ').slice(2).join(' ')}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/tours"
              className="px-8 py-4 bg-[#E8670A] text-white font-bold text-lg rounded-2xl hover:bg-[#B8520A] transition-all duration-200 shadow-lg shadow-[#E8670A]/30 hover:scale-105"
            >
              {t('home.hero.cta')}
            </Link>
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
            >
              {t('home.hero.ctaSecondary')}
            </a>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-6 md:gap-12 text-center">
            {[
              { value: '5,000+', label: t('home.stats.travelers') },
              { value: '500+', label: t('home.stats.destinations') },
              { value: '5+', label: t('home.stats.experience') },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-black text-[#E8670A]">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* FEATURED TOURS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-2">Tours</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">{t('home.featured.title')}</h2>
              <p className="text-gray-500 mt-2">{t('home.featured.subtitle')}</p>
            </div>
            <Link
              to="/tours"
              className="hidden md:flex items-center gap-2 text-[#E8670A] font-semibold hover:underline"
            >
              {t('home.featured.viewAll')} <ChevronRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          )}

          <div className="mt-10 text-center md:hidden">
            <Link
              to="/tours"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E8670A] text-white font-semibold rounded-xl"
            >
              {t('home.featured.viewAll')} <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-2">
              {t('home.categories.label')}
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">{t('home.categories.title')}</h2>
            <p className="text-gray-500 mt-2">{t('home.categories.subtitle')}</p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat, idx) => (
                <Link
                  key={cat.slug}
                  to={`/tours?category=${cat.slug}`}
                  className="group flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-[#E8670A]/30 hover:-translate-y-1 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  >
                    {ICON_MAP[cat.icon_name] ?? <Globe size={32} />}
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 leading-tight">
                    {lang === 'en' ? cat.name_en : cat.name_es}
                  </h3>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-36 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* OTHER SERVICES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-2">
              {t('home.services.label')}
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">{t('home.services.title')}</h2>
            <p className="text-gray-500 mt-2">{t('home.services.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Bus size={32} className="text-[#E8670A]" />,
                title: t('home.services.transport.title'),
                description: t('home.services.transport.description'),
                cta: t('home.services.transport.cta'),
                link: '/servicios#transporte',
              },
              {
                icon: <Compass size={32} className="text-[#E8670A]" />,
                title: t('home.services.custom.title'),
                description: t('home.services.custom.description'),
                cta: t('home.services.custom.cta'),
                link: '/servicios#personalizado',
              },
              {
                icon: <Ticket size={32} className="text-[#E8670A]" />,
                title: t('home.services.tickets.title'),
                description: t('home.services.tickets.description'),
                cta: t('home.services.tickets.cta'),
                link: '/servicios#boletos',
              },
            ].map((service) => (
              <div
                key={service.title}
                className="group p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#E8670A]/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-[#E8670A]/10 rounded-2xl flex items-center justify-center mb-5">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{service.description}</p>
                <Link
                  to={service.link}
                  className="inline-flex items-center gap-2 text-[#E8670A] font-semibold text-sm hover:underline"
                >
                  {service.cta} <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEGA TRAVEL PROMO BANNER */}
      <section className="py-16 bg-[#1B4332]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <img src="/Logo_Colores.jpg" alt="Recorramos México y el Mundo" className="h-20 w-auto rounded-xl" />
            <div>
              <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-1">
                {t('home.megaTravel.label')}
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-white">{t('home.megaTravel.title')}</h2>
              <p className="text-green-200 text-sm mt-1">{t('home.megaTravel.subtitle')}</p>
            </div>
          </div>
          <Link
            to="/paquetes"
            className="flex-shrink-0 px-8 py-4 bg-[#E8670A] text-white font-bold text-lg rounded-2xl hover:bg-[#B8520A] transition-colors"
          >
            {t('home.megaTravel.cta')}
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-2">
              {t('home.testimonials.label')}
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">{t('home.testimonials.title')}</h2>
            <p className="text-gray-500 mt-2">{t('home.testimonials.subtitle')}</p>
          </div>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <Quote size={24} className="text-[#E8670A]/30 mb-3" />
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    "{lang === 'en' ? (review.comment_en || review.comment_es) : review.comment_es}"
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">{review.customer_name}</p>
                    <StarRating rating={review.rating} size={14} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'María G.', comment: 'Increíble experiencia, todo perfectamente organizado.', rating: 5 },
                { name: 'Carlos M.', comment: 'El mejor viaje de mi vida, los recomiendo 100%.', rating: 5 },
                { name: 'Ana R.', comment: 'Precios accesibles y atención personalizada, ¡volvería mil veces!', rating: 5 },
              ].map((r) => (
                <div key={r.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <Quote size={24} className="text-[#E8670A]/30 mb-3" />
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">"{r.comment}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                    <StarRating rating={r.rating} size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-12 bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
            <div className="flex items-center gap-4">
              <img src="/SECTUR.png" alt="SECTUR" className="h-10 object-contain" />
              <div className="text-left">
                <p className="text-white font-bold text-sm">RNT SECTUR</p>
                <p className="text-gray-400 text-xs">No. 04151044189</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-white/20" />
            <div className="flex items-center gap-4">
              <img src="/LogoFematur.jpg" alt="FEMATUR" className="h-10 object-contain" />
              <div className="text-left">
                <p className="text-white font-bold text-sm">FEMATUR</p>
                <p className="text-gray-400 text-xs">{t('home.trust.fematurBadge')}</p>
              </div>
            </div>
            <div className="hidden md:block w-px h-10 bg-white/20" />
            <div className="flex items-center gap-4">
              <img src="/LogoAMAV.jpeg" alt="AMAVCDMX" className="h-10 object-contain" />
              <div className="text-left">
                <p className="text-white font-bold text-sm">AMAVCDMX</p>
                <p className="text-gray-400 text-xs">{t('home.trust.amavcdmxBadge')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="py-16 bg-gradient-to-r from-[#E8670A] to-[#B8520A]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            {t('home.whatsappCta.title')}
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            {t('home.whatsappCta.subtitle')}
          </p>
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050'}?text=${encodeURIComponent('¡Hola! Quiero información sobre sus tours.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#E8670A] font-black text-lg rounded-2xl hover:bg-orange-50 transition-colors shadow-xl"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t('home.whatsappCta.cta')}
          </a>
        </div>
      </section>
    </div>
  );
}
