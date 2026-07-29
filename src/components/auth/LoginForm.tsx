import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Alert } from '../ui/Alert'
import { OAuthSection } from './OAuthSection'

type Mode = 'login' | 'forgot'

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recuperar-contrasena`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- Forgot-password mode ---------- */
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
            <div className="text-center mb-8">
              <img src="/Logo_Naranja.jpeg" alt="Recorramos México" className="h-12 mx-auto mb-4 object-contain" />
              <h2 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-gray-500">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            {error && <Alert type="error" className="mb-5">{error}</Alert>}

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-700 mb-1 font-medium">Correo enviado</p>
                <p className="text-sm text-gray-500 mb-6">
                  Revisa tu bandeja de entrada (y spam) y sigue el enlace para crear una nueva contraseña.
                </p>
                <button
                  onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft size={16} /> Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                  </button>
                </form>

                <button
                  onClick={() => { setMode('login'); setError(null) }}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={16} /> Volver al inicio de sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Normal login mode ---------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
          {/* Logo / heading */}
          <div className="text-center mb-8">
            <img src="/Logo_Naranja.jpeg" alt="Recorramos México" className="h-12 mx-auto mb-4 object-contain" />
            <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
            <p className="mt-1 text-sm text-gray-500">Bienvenido de nuevo</p>
          </div>

          {error && <Alert type="error" className="mb-5">{error}</Alert>}

          <OAuthSection label="o continúa con email" />

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null) }}
                  className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link to="/signup" className="font-medium text-orange-500 hover:text-orange-600 transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
