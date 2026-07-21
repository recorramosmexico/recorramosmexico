import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, Home } from 'lucide-react';

export default function Cancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-8 py-10 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Pago cancelado</h1>
          <p className="text-red-100 text-sm">No se realizó ningún cargo</p>
        </div>

        {/* Body */}
        <div className="px-8 py-7 space-y-5">
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Cancelaste el proceso de pago. Tu reserva no ha sido confirmada.
            Puedes intentarlo de nuevo cuando lo desees.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver e intentar de nuevo
            </button>
            <Link
              to="/"
              className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl px-5 py-3 transition-colors"
            >
              <Home className="w-4 h-4" />
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}