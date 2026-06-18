import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin, Users, CreditCard, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface Reservation {
  id: string;
  created_at: string;
  departure_date: string;
  travelers: number;
  total_price_mxn: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  notes: string;
  tours: { title_es: string; title_en: string; destination: string; image_urls: string[] } | null;
}

export default function MiCuenta() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending:   { label: t('account.status.pending'),   color: 'bg-yellow-100 text-yellow-800' },
    paid:      { label: t('account.status.paid'),      color: 'bg-green-100 text-green-800' },
    refunded:  { label: t('account.status.refunded'),  color: 'bg-blue-100 text-blue-800' },
    cancelled: { label: t('account.status.cancelled'), color: 'bg-red-100 text-red-800' },
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('reservations')
      .select('*, tours(title_es, title_en, destination, image_urls)')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReservations((data as Reservation[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-[#1A1A1A] py-12 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[#E8670A] text-sm font-semibold uppercase tracking-wider mb-1">
              {t('account.title')}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t('account.signOut')}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-xl font-black text-gray-900 mb-6">{t('account.reservations')}</h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E8670A]" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('account.noReservations')}</h3>
            <p className="text-gray-500 text-sm mb-6">{t('account.noReservationsDesc')}</p>
            <button
              onClick={() => navigate('/tours')}
              className="px-6 py-3 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors text-sm"
            >
              {t('account.viewTours')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((res) => {
              const status = STATUS_CONFIG[res.payment_status] ?? STATUS_CONFIG.pending;
              const tourImg = res.tours?.image_urls?.[0];
              const tourTitle = res.tours
                ? (lang === 'en' ? res.tours.title_en : res.tours.title_es) || res.tours.title_es
                : t('common.notFound');
              return (
                <div key={res.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row">
                    {tourImg && (
                      <img
                        src={tourImg}
                        alt={tourTitle}
                        className="w-full sm:w-40 h-40 sm:h-auto object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-tight">{tourTitle}</h3>
                          {res.tours?.destination && (
                            <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                              <MapPin size={12} />
                              {res.tours.destination}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-[#E8670A]" />
                          <span>{formatDate(res.departure_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-[#E8670A]" />
                          <span>
                            {res.travelers} {res.travelers !== 1 ? t('account.travelers') : t('account.traveler')}
                          </span>
                        </div>
                        {res.total_price_mxn > 0 && (
                          <div className="flex items-center gap-1.5">
                            <CreditCard size={13} className="text-[#E8670A]" />
                            <span>${res.total_price_mxn.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} MXN</span>
                          </div>
                        )}
                      </div>

                      {res.notes && (
                        <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{res.notes}</p>
                      )}

                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-3">
                        <Clock size={11} />
                        <span>{t('account.bookedOn')} {formatDate(res.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
