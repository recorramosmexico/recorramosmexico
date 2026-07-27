import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category, Tour } from '../types';
import TourCard from '../components/ui/TourCard';
import { useSEO } from '../hooks/useSEO';
import { websiteSchema } from '../lib/structuredData';

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Tours() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtered, setFiltered] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: '',
    maxPrice: '',
    month: '',
    duration: '',
    sortBy: 'popularity',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('tours').select('*, categories(*)').eq('is_active', true),
      supabase.from('categories').select('*').order('name_es'),
    ]).then(([toursRes, catsRes]) => {
      if (toursRes.data) { setTours(toursRes.data as Tour[]); setFiltered(toursRes.data as Tour[]); }
      if (catsRes.data) setCategories(catsRes.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = [...tours];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((t) =>
        t.title_es.toLowerCase().includes(q) ||
        t.title_en.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q)
      );
    }

    if (filters.category) {
      result = result.filter((t) => t.categories?.slug === filters.category);
    }

    if (filters.maxPrice) {
      result = result.filter((t) => t.price_mxn <= Number(filters.maxPrice));
    }

    if (filters.month) {
      const m = Number(filters.month);
      result = result.filter((t) =>
        t.departure_dates?.some((d) => new Date(d + 'T12:00:00').getMonth() + 1 === m)
      );
    }

    if (filters.duration) {
      const [min, max] = filters.duration.split('-').map(Number);
      result = result.filter((t) => t.duration_days >= min && (!max || t.duration_days <= max));
    }

    if (filters.sortBy === 'price_asc') result.sort((a, b) => a.price_mxn - b.price_mxn);
    else if (filters.sortBy === 'price_desc') result.sort((a, b) => b.price_mxn - a.price_mxn);
    else if (filters.sortBy === 'date_asc') {
      result.sort((a, b) => {
        const da = a.departure_dates?.[0] || '9999';
        const db = b.departure_dates?.[0] || '9999';
        return da.localeCompare(db);
      });
    }

    setFiltered(result);
  }, [filters, tours]);

  const today = new Date().toISOString().slice(0, 10);
  const hasUpcomingDate = (t: Tour) => (t.departure_dates ?? []).some((d) => d >= today);
  const upcomingTours = filtered.filter(hasUpcomingDate);
  const pastTours = filtered.filter((t) => !hasUpcomingDate(t));

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key === 'category') {
      setSearchParams(value ? { category: value } : {});
    }
  };

  const clearFilters = () => {
    setFilters({ category: '', search: '', maxPrice: '', month: '', duration: '', sortBy: 'popularity' });
    setSearchParams({});
  };

  const hasActiveFilters = filters.category || filters.search || filters.maxPrice || filters.month || filters.duration;
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ES;

  useSEO({
    title: 'Tours y Excursiones 2026 | Recorramos México',
    description:
      'Descubre los mejores tours y excursiones en grupo desde México. Playas, pirámides, festivales, aventura y más. Filtra por fecha, precio y duración. ¡Reserva online!',
    path: '/tours',
    image: '/Logo_Bandera.jpg',
    jsonLd: websiteSchema(),
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{t('tours.title')}</h1>
          <p className="text-gray-400 text-lg">{t('tours.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category chip filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => updateFilter('category', '')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                !filters.category
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t('tours.filters.all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => updateFilter('category', filters.category === cat.slug ? '' : cat.slug)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  filters.category === cat.slug
                    ? 'bg-[#E8670A] text-white border-[#E8670A]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#E8670A]/50 hover:text-[#E8670A]'
                }`}
              >
                <Tag size={12} />
                {lang === 'en' ? cat.name_en : cat.name_es}
              </button>
            ))}
          </div>
        )}

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-colors ${
              showFilters ? 'bg-[#E8670A] text-white border-[#E8670A]' : 'bg-white border-gray-200 text-gray-700 hover:border-[#E8670A]'
            }`}
          >
            <SlidersHorizontal size={18} />
            {t('tours.filters.sortBy')}
          </button>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 text-sm text-gray-700"
          >
            <option value="popularity">{t('tours.filters.popularity')}</option>
            <option value="price_asc">{t('tours.filters.price_asc')}</option>
            <option value="price_desc">{t('tours.filters.price_desc')}</option>
            <option value="date_asc">{t('tours.filters.date_asc')}</option>
          </select>
        </div>

        {/* Expandable advanced filters */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('tours.filters.month')}
              </label>
              <select
                value={filters.month}
                onChange={(e) => updateFilter('month', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
              >
                <option value="">{t('tours.filters.all')}</option>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('tours.filters.duration')}
              </label>
              <select
                value={filters.duration}
                onChange={(e) => updateFilter('duration', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
              >
                <option value="">{t('tours.filters.all')}</option>
                <option value="1-3">1-3 {t('tours.card.days')}</option>
                <option value="4-7">4-7 {t('tours.card.days')}</option>
                <option value="8-14">8-14 {t('tours.card.days')}</option>
                <option value="15-99">15+ {t('tours.card.days')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {t('tours.filters.maxPrice')}
              </label>
              <input
                type="number"
                placeholder={t('tours.filters.maxPricePlaceholder')}
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
              />
            </div>
          </div>
        )}

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-gray-500">
              {filtered.length} {t('tours.found')}
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 ml-2 font-medium"
            >
              <X size={14} />
              {t('tours.clearFilters')}
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-72 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">{t('tours.noResults')}</p>
            <button onClick={clearFilters} className="mt-4 text-[#E8670A] font-semibold hover:underline">
              {t('tours.clearAllFilters')}
            </button>
          </div>
        ) : (
          <>
            {upcomingTours.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
              </div>
            )}

            {pastTours.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-gray-200" />
                  <h2 className="text-lg font-bold text-gray-400 uppercase tracking-wider">
                    {lang === 'en' ? 'Past Tours' : 'Tours Pasados'}
                  </h2>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                  {pastTours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
