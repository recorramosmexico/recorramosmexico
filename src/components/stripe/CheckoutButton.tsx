import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { StripeProduct } from '../../stripe-config'
import { useAuth } from '../../hooks/useAuth'
import { Alert } from '../ui/Alert'

interface CheckoutButtonProps {
  product: StripeProduct
  className?: string
  children?: React.ReactNode
}

export function CheckoutButton({ product, className = '', children }: CheckoutButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    if (!user) {
      setError('Debes iniciar sesión para realizar una compra')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No hay sesión activa')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: product.priceId,
          mode: product.mode,
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/cancel`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear la sesión de pago')
      }

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No se recibió URL de checkout')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading || !user}
        className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Procesando...' : children || `Comprar ${product.name}`}
      </button>
    </div>
  )
}