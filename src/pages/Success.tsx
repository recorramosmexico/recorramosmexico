import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, MapPin, Users, Calendar, ArrowRight, Clock, Banknote, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';

type PaymentMethod = 'card' | 'oxxo' | 'bank_transfer';

interface ReservationDetails {
  id: string;
  tour_id: string;
  customer_name: string;
  travelers: number;
  departure_date: string;
  total_price_mxn: number;
  tours: { title_es: string; title_en: string; destination: string } | null;
}

const methodConfig: Record<
  PaymentMethod,
  { icon: React.ElementType; headerBg: string; iconBg: string; iconColor: string; title: string; subtitle: string; info: string | null }
> = {
  card: {
    icon: Check,
    headerBg: 'bg-gradient-to-br from-green-500 to-green-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    title: '¡Pago Exitoso!',
    subtitle: 'Tu reserva ha sido confirmada',
    info: null,
  },
  oxxo: {
    icon: Banknote,
    headerBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    title: 'Voucher OXXO Generado',
    subtitle: 'Completa tu pago en cualquier tienda OXXO',
    info: 'Revisa tu correo electrónico para encontrar el voucher con el código de barras. Tienes 3 días para realizar el pago en OXXO. Tu reserva quedará confirmada al recibir el pago.',
  },
  bank_transfer: {
    icon: Building2,
    headerBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    title: 'Transferencia SPEI Pendiente',
    subtitle: 'Instrucciones enviadas a tu correo',
    info: 'Revisa tu correo electrónico con las instrucciones para realizar la transferencia SPEI. Tienes 3 días para completar el pago. Tu reserva quedará confirmada al recibir la transferencia.',
  },
};

export default function Success() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');
  const method = (searchParams.get('method') ?? 'card') as PaymentMethod;
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const config = methodConfig[method] ?? methodConfig.card;
  const IconComponent = config.icon;

  useSEO({
    title: 'Pago Exitoso',
    description: 'Tu reserva ha sido confirmada.',
    path: '/success',
    noindex: true,
  });

  useEffect(() => {
    const load = async () => {
      if (!reservationId) { setLoading(false); return; }

      const { data } = await supabase
        .from('reservations')
        .select('id, tour_id, customer_name, travelers, departure_date, total_price_mxn, tours(title_es, title_en, destination)')
        .eq('id', reservationId)
        .maybeSingle();

      if (data) setReservation(data as ReservationDetails);
      setLoading(false);
    };
    load();
  }, [reservationId]);

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className={`${config.headerBg} p-10 text-center`}>
            <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <IconComponent size={40} className={config.iconColor} strokeWidth={method === 'card' ? 3 : 2} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">{config.title}</h1>
            <p className="text-white/80 text-sm">{config.subtitle}</p>
          </div>

          <div className="p-8">
            {/* Pending notice */}
            {config.info && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
                <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 leading-relaxed">{config.info}</p>
              </div>
            )}

            {/* Reservation details */}
            {reservation ? (
              <div className="space-y-4 mb-8">
                <h2 className="font-black text-gray-900 text-lg">
                  {reservation.tours?.title_es || 'Tour reservado'}
                </h2>

                <div className="space-y-3">
                  {reservation.tours?.destination && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-8 h-8 bg-[#E8670A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-[#E8670A]" />
                      </div>
                      <span>{reservation.tours.destination}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 bg-[#E8670A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-[#E8670A]" />
                    </div>
                    <span>{reservation.travelers} {reservation.travelers === 1 ? 'viajero' : 'viajeros'}</span>
                  </div>
                  {reservation.departure_date && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-8 h-8 bg-[#E8670A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar size={16} className="text-[#E8670A]" />
                      </div>
                      <span>{formatDate(reservation.departure_date)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center mt-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {method === 'card' ? 'Total pagado' : 'Total a pagar'}
                  </span>
                  <span className="text-xl font-black text-[#E8670A]">
                    ${reservation.total_price_mxn.toLocaleString('es-MX')} MXN
                  </span>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  {method === 'card'
                    ? 'Recibirás un correo de confirmación con todos los detalles.'
                    : 'Recibirás un correo con las instrucciones de pago y la confirmación final.'}
                </p>
              </div>
            ) : (
              <div className="text-center mb-8">
                <p className="text-gray-600 text-sm">
                  {method === 'card'
                    ? 'Tu pago fue procesado correctamente. En breve recibirás un correo de confirmación.'
                    : 'Tu reserva está registrada. Revisa tu correo para las instrucciones de pago.'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link
                to="/tours"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors"
              >
                Explorar más tours
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/"
                className="flex items-center justify-center w-full py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
