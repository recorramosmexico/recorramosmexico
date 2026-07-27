import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Users, Calendar } from 'lucide-react';
import type { Tour } from '../../types';
import { getEffectivePrice, isPresaleActive } from '../../types';

interface TourCardProps {
  tour: Tour;
}

export default function TourCard({ tour }: TourCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const title = lang === 'en' ? tour.title_en : tour.title_es;
  const firstImage = tour.image_urls?.[0] || `https://picsum.photos/seed/${tour.slug}/800/600`;
  const nextDate = tour.departure_dates?.[0];
  const today = new Date().toISOString().slice(0, 10);
  const isPast = (tour.departure_dates ?? []).every((d) => d < today);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link
      to={`/tours/${tour.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#E8670A]/30 hover:-translate-y-1"
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={firstImage}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={{
            backgroundImage: `url(https://picsum.photos/seed/${tour.slug}-blur/20/15)`,
            backgroundSize: 'cover',
          }}
        />
        {tour.is_featured && !isPast && (
          <span className="absolute top-3 left-3 bg-[#E8670A] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            Destacado
          </span>
        )}
        {isPast && (
          <span className="absolute top-3 left-3 bg-gray-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {t('tours.card.past')}
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-sm">
          <MapPin size={14} className="flex-shrink-0" />
          <span className="font-medium truncate">{tour.destination}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-2 group-hover:text-[#E8670A] transition-colors line-clamp-2">
          {title}
        </h3>

        <div className="flex items-center gap-4 text-gray-500 text-xs mb-3">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {tour.duration_days} {t('tours.card.days')}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            {tour.max_capacity} {t('tours.card.spots')}
          </span>
          {nextDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(nextDate)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">{t('tours.card.from')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black text-[#E8670A]">
                ${getEffectivePrice(tour).toLocaleString('es-MX')}
                <span className="text-xs font-normal text-gray-400 ml-1">{t('tours.card.perPerson')}</span>
              </p>
              {isPresaleActive(tour) && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  Preventa
                </span>
              )}
            </div>
            {isPresaleActive(tour) && tour.price_mxn !== getEffectivePrice(tour) && (
              <p className="text-xs text-gray-400 line-through">
                ${tour.price_mxn.toLocaleString('es-MX')}
              </p>
            )}
          </div>
          <span className="px-4 py-2 bg-[#E8670A] text-white text-sm font-semibold rounded-xl group-hover:bg-[#B8520A] transition-colors">
            {t('tours.card.viewDetail')}
          </span>
        </div>
      </div>
    </Link>
  );
}
