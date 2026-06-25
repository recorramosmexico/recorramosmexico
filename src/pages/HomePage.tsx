import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { SubscriptionStatus } from '../components/stripe/SubscriptionStatus'
import { ProductCard } from '../components/stripe/ProductCard'
import { stripeProducts } from '../stripe-config'
import { LogOut } from 'lucide-react'

export function HomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recorramos México</h1>
              <p className="text-gray-600">Bienvenido, {user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <SubscriptionStatus />
              <button
                onClick={signOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuestros Servicios</h2>
            <p className="text-gray-600">
              Descubre México con nuestros tours únicos y experiencias inolvidables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stripeProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}