import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, ClipboardList, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderInfo {
  checkout_session_id: string;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_date: string;
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const reservationId = searchParams.get('reservation_id');

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [syncedReservation, setSyncedReservation] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      // Poll up to ~10 s for the webhook to write the order
      let found = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

        const { data, error } = await supabase
          .from('stripe_user_orders')
          .select('checkout_session_id, amount_total, currency, payment_status, order_date')
          .eq('checkout_session_id', sessionId)
          .maybeSingle();

        if (!error && data) {
          setOrder(data as OrderInfo);
          found = true;
          break;
        }
      }

      // Fallback: if the webhook didn't fire, call sync-payment to update the reservation
      if (reservationId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ reservation_id: reservationId }),
              },
            );
            if (res.ok) {
              const result = await res.json();
              if (result.changed) {
                setSyncedReservation(true);
              }
            }
          }
        } catch {
          // silent — not critical if sync fails here
        }
      }

      if (!found) setNotFound(true);
      setLoading(false);
    };

    fetchOrder();
  }, [sessionId, reservationId]);

  const formatCurrency = (cents: number, currency: string) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency?.toUpperCase() ?? 'MXN',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Confirmando tu pago…</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">¡Pago exitoso!</h1>
              <p className="text-green-100 text-sm">Tu reserva está confirmada</p>
            </div>

            {/* Body */}
            <div className="px-8 py-7 space-y-5">
              {syncedReservation && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Hemos confirmado tu pago y actualizado el estado de tu reservación.
                  </p>
                </div>
              )}

              {order ? (
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total pagado</span>
                    <span className="font-bold text-gray-900 text-base">
                      {formatCurrency(order.amount_total, order.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Estado</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold capitalize">
                      <CheckCircle className="w-3 h-3" />
                      {order.payment_status === 'paid' ? 'Pagado' : order.payment_status}
                    </span>
                  </div>
                  {order.order_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fecha</span>
                      <span className="text-gray-700">
                        {new Date(order.order_date).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {order.checkout_session_id && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-400 break-all">
                        Ref: {order.checkout_session_id.slice(0, 24)}…
                      </p>
                    </div>
                  )}
                </div>
              ) : notFound ? (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Tu pago fue procesado. El comprobante estará disponible en unos minutos en tu cuenta.
                  </p>
                </div>
              ) : null}

              <p className="text-sm text-gray-500 text-center leading-relaxed">
                Recibirás un correo de confirmación con los detalles de tu viaje.
                Nuestro equipo se pondrá en contacto contigo a la brevedad.
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <Link
                  to="/mi-cuenta"
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-3 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Ver mis reservaciones
                </Link>
                <Link
                  to="/"
                  className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl px-5 py-3 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Ir al inicio
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
