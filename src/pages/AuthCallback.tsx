import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendEmail } from '../lib/email'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();

        (async () => {
          const user = session.user
          const isGoogle = user.app_metadata?.provider === 'google'

          // Pre-fill profile with whatever Google provides
          if (isGoogle) {
            const meta = user.user_metadata || {}
            const fullName: string = meta.full_name || meta.name || ''
            const phone: string = meta.phone || ''

            // Upsert: if profile row already exists (returning user), only fill
            // blank fields so manual edits are never overwritten.
            const { data: existing } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', user.id)
              .maybeSingle()

            await supabase.from('profiles').upsert({
              id: user.id,
              full_name: existing?.full_name || fullName || null,
              phone: existing?.phone || phone || null,
            })

            // Welcome email only on first sign-in (no last_sign_in_at means brand new)
            if (!user.last_sign_in_at && user.email) {
              sendEmail('welcome', user.email, {
                name: fullName || user.email,
                email: user.email,
              })
            }
          }

          navigate('/mi-cuenta', { replace: true })
        })()
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
