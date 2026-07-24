import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'success' | 'already' | 'error';

export default function ConfirmarPago() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Falta el token de confirmacion.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-reservation?token=${encodeURIComponent(token)}`,
          { headers: { 'Content-Type': 'application/json' } },
        );
        const html = await res.text();
        if (res.ok) {
          if (html.includes('ya fue confirmada')) {
            setStatus('already');
            setMessage('Esta reserva ya fue confirmada anteriormente.');
          } else {
            setStatus('success');
            setMessage('La reserva ha sido confirmada exitosamente. Se envio un correo de confirmacion al viajero.');
          }
        } else {
          setStatus('error');
          setMessage('No se pudo confirmar la reserva. El token puede ser invalido o haber expirado.');
        }
      } catch {
        setStatus('error');
        setMessage('Error de conexion. Intenta de nuevo mas tarde.');
      }
    })();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#E8670A] mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Confirmando reserva...</p>
        </div>
      </div>
    );
  }

  const isSuccess = status === 'success' || status === 'already';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden text-center">
        <div className={`p-10 ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
          {isSuccess ? (
            <CheckCircle size={56} className="text-green-600 mx-auto mb-4" />
          ) : (
            <XCircle size={56} className="text-red-600 mx-auto mb-4" />
          )}
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">
            {isSuccess ? 'Reserva Confirmada' : 'Error'}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>
        <div className="p-6 bg-gray-50">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors text-sm"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
