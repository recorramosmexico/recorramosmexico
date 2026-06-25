import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, MapPin, Users, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReservationDetails {
  id: string;
  tour_id: string;
  customer_name: string;
  travelers: number;
  departure_date: string;
  total_price_mxn: number;
  tours: { title_es: string; title_en: string; destination: string } | null;
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!reservationId) { setLoading(false); return; }

      await supabase
        .from('reservations')
        .update({ payment_status: 'paid' })
        .eq('id', reservationId);

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
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={40} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">¡Pago Exitoso!</h1>
            <p className="text-green-100 text-sm">Tu reserva ha sido confirmada</p>
          </div>

          <div className="p-8">
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
                  <span className="text-sm font-semibold text-gray-700">Total pagado</span>
                  <span className="text-xl font-black text-[#E8670A]">
                    ${reservation.total_price_mxn.toLocaleString('es-MX')} MXN
                  </span>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Recibirás un correo de confirmación con todos los detalles.
                </p>
              </div>
            ) : (
              <div className="text-center mb-8">
                <p className="text-gray-600 text-sm">
                  Tu pago fue procesado correctamente. En breve recibirás un correo de confirmación.
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
