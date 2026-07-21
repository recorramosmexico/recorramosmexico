import React from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useStripeCheckout } from '../../hooks/useStripeCheckout';
import { STRIPE_PRODUCTS } from '../../stripe-config';

interface CheckoutButtonProps {
  amountMxn: number;
  label?: string;
  successUrl?: string;
  cancelUrl?: string;
  disabled?: boolean;
  className?: string;
  onError?: (msg: string) => void;
}

export default function CheckoutButton({
  amountMxn,
  label,
  successUrl,
  cancelUrl,
  disabled = false,
  className = '',
  onError,
}: CheckoutButtonProps) {
  const { checkout, loading, error } = useStripeCheckout();
  const product = STRIPE_PRODUCTS.VIAJE;

  React.useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);

  const handleClick = () => {
    checkout({ amountMxn, successUrl, cancelUrl });
  };

  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: product.currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMxn);

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          flex items-center justify-center gap-2 w-full
          bg-gradient-to-r from-orange-500 to-orange-600
          hover:from-orange-600 hover:to-orange-700
          disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
          text-white font-semibold rounded-xl px-6 py-3.5
          shadow-lg hover:shadow-orange-200 disabled:shadow-none
          transition-all duration-200 active:scale-[0.98]
          ${className}
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Procesando…</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>{label ?? `Pagar ${formatted}`}</span>
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}