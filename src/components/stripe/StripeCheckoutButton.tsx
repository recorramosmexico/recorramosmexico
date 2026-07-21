import React from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';

interface StripeCheckoutButtonProps {
  amountMxn: number;
  label?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
  className?: string;
  disabled?: boolean;
  onError?: (msg: string) => void;
}

export default function StripeCheckoutButton({
  amountMxn,
  label = 'Pagar con tarjeta',
  metadata,
  successUrl,
  cancelUrl,
  className = '',
  disabled = false,
  onError,
}: StripeCheckoutButtonProps) {
  const { initiateCheckout, loading } = useStripeCheckout();

  async function handleClick() {
    const { url, error } = await initiateCheckout({ amountMxn, metadata, successUrl, cancelUrl });
    if (error) {
      onError?.(error);
      return;
    }
    if (url) window.location.href = url;
  }

  const isDisabled = disabled || loading || amountMxn < 1;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold
        transition-all duration-200 select-none
        ${isDisabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-md hover:shadow-lg'
        }
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Procesando…</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}