export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price_per_unit: number;
  currency_symbol: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_UVRdf9FkZCyt0F',
    priceId: 'price_1TWQk5RTgyGuyvXO1kHCtKX0',
    name: 'Viaje',
    description: 'Reserva tu viaje con nosotros',
    price_per_unit: 1.00,
    currency_symbol: 'MX$',
    mode: 'payment'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};