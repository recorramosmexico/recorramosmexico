import React from 'react'
import { StripeProduct } from '../../stripe-config'
import { CheckoutButton } from './CheckoutButton'

interface ProductCardProps {
  product: StripeProduct
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
      <p className="text-gray-600 mb-4">{product.description}</p>
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl font-bold text-gray-900">
          {product.currency_symbol}{product.price_per_unit.toFixed(2)}
        </span>
        <span className="text-sm text-gray-500 capitalize">
          {product.mode === 'payment' ? 'Pago único' : 'Suscripción'}
        </span>
      </div>
      <CheckoutButton
        product={product}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        {product.mode === 'payment' ? 'Comprar ahora' : 'Suscribirse'}
      </CheckoutButton>
    </div>
  )
}