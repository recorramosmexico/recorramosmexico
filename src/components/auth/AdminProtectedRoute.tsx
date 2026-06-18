import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  children: React.ReactNode
}

export function AdminProtectedRoute({ children }: Props) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8670A]" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
