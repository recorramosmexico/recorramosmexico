import React from 'react';
import { CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';
import { useStripeOrders } from '../../hooks/useStripeOrders';

function formatAmount(centavos: number | null, currency: string | null): string {
  if (centavos === null) return '—';
  const amount = centavos / 100;
  const symbol = (currency ?? 'mxn').toLowerCase() === 'mxn' ? 'MX$' : '$';
  return `${symbol} ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status, paymentStatus }: { status: string | null; paymentStatus: string | null }) {
  const isCompleted = status === 'completed' || paymentStatus === 'paid';
  const isCanceled = status === 'canceled';

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" /> Completado
      </span>
    );
  }
  if (isCanceled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Cancelado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" /> Pendiente
    </span>
  );
}

export default function OrderHistory() {
  const { orders, loading, error } = useStripeOrders();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 py-4">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Sin pagos registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.checkout_session_id}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              Pago de Viaje
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {order.order_date
                ? new Date(order.order_date).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
            <span className="text-sm font-bold text-gray-900">
              {formatAmount(order.amount_total, order.currency)}
            </span>
            <StatusBadge status={order.order_status} paymentStatus={order.payment_status} />
          </div>
        </div>
      ))}
    </div>
  );
}