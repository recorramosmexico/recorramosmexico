import React from 'react';
import { Shield, CreditCard } from 'lucide-react';
import { STRIPE_PRODUCTS } from '../../stripe-config';

interface OrderSummaryProps {
  totalMxn: number;
  depositMxn?: number;
  depositPercentage?: number;
  isDeposit?: boolean;
  travelers?: number;
  tourName?: string;
}

export default function OrderSummary({
  totalMxn,
  depositMxn,
  depositPercentage,
  isDeposit = false,
  travelers,
  tourName,
}: OrderSummaryProps) {
  const product = STRIPE_PRODUCTS.VIAJE;

  const fmt = (amount: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: product.currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount);

  const chargeAmount = isDeposit && depositMxn ? depositMxn : totalMxn;
  const remaining = totalMxn - (depositMxn ?? 0);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-semibold text-gray-700">Resumen de pago</span>
      </div>

      {tourName && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tour</span>
          <span className="font-medium text-gray-800 text-right max-w-[180px]">{tourName}</span>
        </div>
      )}

      {travelers && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Viajeros</span>
          <span className="font-medium text-gray-800">{travelers}</span>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Total del viaje</span>
        <span className="font-medium text-gray-800">{fmt(totalMxn)}</span>
      </div>

      {isDeposit && depositMxn && depositPercentage && (
        <>
          <div className="flex justify-between text-sm text-orange-600">
            <span>Anticipo ({depositPercentage}%)</span>
            <span className="font-semibold">{fmt(depositMxn)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Saldo restante (al abordar)</span>
            <span>{fmt(remaining)}</span>
          </div>
        </>
      )}

      <div className="border-t border-gray-200 pt-3 flex justify-between">
        <span className="font-semibold text-gray-800">
          {isDeposit ? 'Anticipo a pagar ahora' : 'Total a pagar'}
        </span>
        <span className="font-bold text-orange-600 text-lg">{fmt(chargeAmount)}</span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Shield className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <span className="text-xs text-gray-400">Pago seguro procesado por Stripe</span>
      </div>
    </div>
  );
}