import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { STRIPE_PRODUCTS } from '../stripe-config';

export interface CheckoutOptions {
  /** Total amount to charge in MXN pesos (quantity × 1 MXN/unit = total) */
  amountMxn: number;
  successUrl?: string;
  cancelUrl?: string;
}

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async ({ amountMxn, successUrl, cancelUrl }: CheckoutOptions) => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceId: STRIPE_PRODUCTS.VIAJE.priceId,
            mode: STRIPE_PRODUCTS.VIAJE.mode,
            quantity: Math.max(1, Math.round(amountMxn)),
            successUrl:
              successUrl ??
              `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl:
              cancelUrl ?? `${window.location.origin}/cancelar`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Error al iniciar el proceso de pago');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setError(message);
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { checkout, loading, error, clearError };
}