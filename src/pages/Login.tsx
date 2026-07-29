import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, MapPin, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OAuthSection } from '../components/auth/OAuthSection';
import { useSEO } from '../hooks/useSEO';

type Mode = 'login' | 'forgot';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/mi-cuenta';
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useSEO({
    title: 'Iniciar Sesión',
    description: 'Inicia sesión en Recorramos México para ver tus reservaciones.',
    path: '/login',
    noindex: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Correo o contraseña incorrectos. Intenta de nuevo.');
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user!.id)
        .maybeSingle();

      if (profile?.is_admin) {
        navigate('/admin/dashboard');
      } else {
        navigate(redirectTo);
      }
    }
    setLoading(false);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recuperar-contrasena`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Forgot-password mode ---------- */
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#E8670A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-[#E8670A]" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">Recuperar contraseña</h1>
            <p className="text-gray-500 mt-2 text-sm">Te enviaremos un enlace para restablecerla</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 mb-5">
                {error}
              </div>
            )}

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-700 mb-1 font-semibold">Correo enviado</p>
                <p className="text-sm text-gray-500 mb-6">
                  Revisa tu bandeja de entrada (y spam) y sigue el enlace para crear una nueva contraseña.
                </p>
                <button
                  onClick={() => { setMode('login'); setResetSent(false); setError(''); }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#E8670A] hover:text-[#B8520A] transition-colors"
                >
                  <ArrowLeft size={16} /> Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleResetRequest} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A]"
                        placeholder="tu@correo.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                  </button>
                </form>

                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={16} /> Volver al inicio de sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Normal login mode ---------- */
  return (
    <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E8670A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} className="text-[#E8670A]" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Bienvenido de vuelta</h1>
          <p className="text-gray-500 mt-2 text-sm">Inicia sesión para ver tus reservaciones</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <OAuthSection label="o continúa con email" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A]"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  className="text-xs font-semibold text-[#E8670A] hover:text-[#B8520A] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/signup" className="text-[#E8670A] font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
