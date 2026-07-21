import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { STRIPE_PRODUCTS } from '../stripe-config';

interface CheckoutOptions {
  amountMxn: number;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

interface CheckoutResult {
  url: string | null;
  error: string | null;
}

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function initiateCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const quantity = Math.round(options.amountMxn);
      if (quantity < 1) throw new Error('El monto debe ser mayor a $1 MXN');

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: STRIPE_PRODUCTS.VIAJE.priceId,
          quantity,
          success_url: options.successUrl ?? `${window.location.origin}/success`,
          cancel_url: options.cancelUrl ?? `${window.location.origin}/cancel`,
          metadata: options.metadata ?? {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? `Error al iniciar el pago (${response.status})`);
      }

      const data = await response.json();
      const url: string = data.url ?? data.sessionUrl ?? data.checkout_url ?? null;
      if (!url) throw new Error('No se recibió la URL de pago de Stripe');

      return { url, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al procesar el pago';
      setError(msg);
      return { url: null, error: msg };
    } finally {
      setLoading(false);
    }
  }

  return { initiateCheckout, loading, error, clearError: () => setError(null) };
}