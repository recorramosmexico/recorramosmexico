import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendEmail } from '../lib/email'
import { useSEO } from '../hooks/useSEO'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useSEO({
    title: 'Verificando sesión...',
    description: 'Verificando tu sesión.',
    path: '/auth/callback',
    noindex: true,
  });

  useEffect(() => {
    // Detect errors returned by Supabase/Google in the URL
    const urlError = searchParams.get('error')
    const urlErrorDesc = searchParams.get('error_description')
    if (urlError) {
      setErrorMsg(urlErrorDesc?.replace(/\+/g, ' ') || 'Ocurrió un error al iniciar sesión con Google.')
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();

        (async () => {
          const user = session.user
          const isGoogle = user.app_metadata?.provider === 'google'

          if (isGoogle) {
            const meta = user.user_metadata || {}
            const fullName: string = meta.full_name || meta.name || ''
            const phone: string = meta.phone || ''

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
  }, [navigate, searchParams])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Error al iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

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
