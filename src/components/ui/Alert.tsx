import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  className?: string
}

export function Alert({ type = 'info', title, children, className = '' }: AlertProps) {
  const baseClasses = 'rounded-lg border p-4 flex items-start space-x-3'
  
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  }

  const Icon = icons[type]

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && (
          <h3 className="font-medium mb-1">{title}</h3>
        )}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}