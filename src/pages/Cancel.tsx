import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050';

export default function Cancel() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservation_id');

  useSEO({
    title: 'Pago Cancelado',
    description: 'El proceso de pago fue cancelado.',
    path: '/cancel',
    noindex: true,
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-10 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={40} className="text-white/80" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Pago Cancelado</h1>
            <p className="text-gray-400 text-sm">No se realizó ningún cargo</p>
          </div>

          <div className="p-8 text-center">
            <p className="text-gray-600 text-sm mb-2">
              Cancelaste el proceso de pago. Tu reserva quedó guardada pero pendiente de pago.
            </p>
            <p className="text-gray-500 text-xs mb-8">
              Puedes volver a intentarlo o contactarnos por WhatsApp si tienes alguna duda.
            </p>

            <div className="flex flex-col gap-3">
              {reservationId ? (
                <Link
                  to="/tours"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors"
                >
                  <ArrowLeft size={18} />
                  Volver a los tours
                </Link>
              ) : (
                <Link
                  to="/tours"
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors"
                >
                  <ArrowLeft size={18} />
                  Ver todos los tours
                </Link>
              )}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Tuve un problema al intentar pagar mi reserva. ¿Me pueden ayudar?')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#1EBE57] transition-colors"
              >
                <MessageCircle size={18} />
                Contactar por WhatsApp
              </a>
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
