import React from 'react'
import { useSubscription } from '../../hooks/useSubscription'
import { Alert } from '../ui/Alert'

export function SubscriptionStatus() {
  const { subscription, loading, error, getActivePlan } = useSubscription()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert type="error">
        Error al cargar el estado de la suscripción: {error}
      </Alert>
    )
  }

  const activePlan = getActivePlan()

  if (!activePlan) {
    return (
      <div className="text-sm text-gray-600">
        Sin plan activo
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-600">
      Plan activo: <span className="font-medium text-gray-900">{activePlan}</span>
    </div>
  )
}