import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendEmail } from '../lib/email'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        // Send welcome email only for newly created Google OAuth users
        if (session.user.app_metadata?.provider === 'google' && !session.user.last_sign_in_at) {
          const name = session.user.user_metadata?.full_name || session.user.email || ''
          sendEmail('welcome', session.user.email!, { name, email: session.user.email! })
        }
        navigate('/mi-cuenta', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        navigate('/login', { replace: true })
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        navigate('/mi-cuenta', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <svg className="w-10 h-10 animate-spin text-orange-500 mb-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-gray-600 text-sm">Iniciando sesión...</p>
    </div>
  )
}
