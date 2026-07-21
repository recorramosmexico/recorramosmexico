export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  pricePerUnit: number;
  currency: string;
  currencySymbol: string;
  mode: 'payment' | 'subscription';
}

export const STRIPE_PRODUCTS = {
  VIAJE: {
    id: 'prod_UVRdf9FkZCyt0F',
    priceId: 'price_1Tr0bZIGNke7FFL51HgZfpxM',
    name: 'Viaje',
    nameEs: 'Viaje',
    description: 'Tour booking with Recorramos México',
    descriptionEs: 'Reserva de tour con Recorramos México',
    pricePerUnit: 1.00,
    currency: 'mxn',
    currencySymbol: 'MX$',
    mode: 'payment' as const,
  },
} satisfies Record<string, StripeProduct>;