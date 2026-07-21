import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface StripeOrder {
  customer_id: string | null;
  order_id: number | null;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount_subtotal: number | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  order_status: string | null;
  order_date: string | null;
}

export function useStripeOrders() {
  const [orders, setOrders] = useState<StripeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('stripe_user_orders')
          .select('*')
          .order('order_date', { ascending: false });

        if (err) throw err;
        setOrders(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar pagos');
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const completedOrders = orders.filter(o => o.order_status === 'completed' || o.payment_status === 'paid');
  const hasCompletedPayment = completedOrders.length > 0;

  return { orders, completedOrders, hasCompletedPayment, loading, error };
}