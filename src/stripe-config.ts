export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  pricePerUnit: number;
  currencySymbol: string;
  currency: string;
  mode: 'payment' | 'subscription';
}

export const STRIPE_PRODUCTS = {
  VIAJE: {
    id: 'prod_UVRdf9FkZCyt0F',
    priceId: 'price_1TWQk5RTgyGuyvXO1kHCtKX0',
    name: 'Viaje',
    description: 'Reserva tu viaje con Recorramos México',
    pricePerUnit: 1.00,
    currencySymbol: 'MX$',
    currency: 'mxn',
    mode: 'payment' as const,
  },
} satisfies Record<string, StripeProduct>;