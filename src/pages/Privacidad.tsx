import { useSEO } from '../hooks/useSEO';

export default function Privacidad() {
  useSEO({
    title: 'Política de Privacidad | Recorramos México',
    description:
      'Política de Privacidad de Recorramos México. Conoce cómo recopilamos, usamos y protegemos tu información personal.',
    path: '/privacidad',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 29 de julio de 2026</p>

        <div className="prose prose-orange max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            En Recorramos México valoramos tu privacidad. Esta Política de Privacidad explica cómo
            recopilamos, usamos y protegemos tu información personal cuando usas nuestro sitio web
            y servicios de tours.
          </p>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Información que recopilamos</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong>Datos de registro:</strong> nombre, correo electrónico y foto de perfil
                cuando te registras mediante Google Sign-In u otros métodos.
              </li>
              <li>
                <strong>Datos de reservación:</strong> información necesaria para procesar tu
                reservación de tour (datos de contacto, número de participantes, preferencias del
                viaje).
              </li>
              <li>
                <strong>Datos de uso:</strong> información técnica como dirección IP, tipo de
                navegador y páginas visitadas, con fines de mejora del servicio.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Uso de la información</h2>
            <p>Utilizamos tu información para:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Crear y administrar tu cuenta.</li>
              <li>Procesar tu reservación y pago del tour.</li>
              <li>Comunicarnos contigo sobre tu reservación o darte soporte.</li>
              <li>Mejorar la experiencia de la plataforma.</li>
            </ul>
            <p className="mt-3">No vendemos tu información personal a terceros.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              3. Autenticación con Google
            </h2>
            <p>
              Al iniciar sesión con Google, solo solicitamos acceso a tu nombre, correo electrónico
              y foto de perfil públicos, con el único fin de crear y autenticar tu cuenta. No
              accedemos a otros datos de tu cuenta de Google (Drive, Contactos, Calendario, etc.).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              4. Compartir información con terceros
            </h2>
            <p>
              Compartimos tu información únicamente con proveedores necesarios para operar el
              servicio, como procesadores de pago, y solo la información indispensable para completar
              tu reservación. No compartimos tus datos con terceros para fines de marketing sin tu
              consentimiento.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y administrativas razonables para proteger tu
              información contra acceso no autorizado, pérdida o alteración.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Tus derechos</h2>
            <p>
              Puedes solicitar acceso, corrección o eliminación de tu información personal
              escribiendo a contacto@recorramosmexico.com.mx.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              7. Cambios a esta política
            </h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Notificaremos cambios significativos
              publicando la nueva versión en esta página.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contacto</h2>
            <p>
              Para dudas sobre esta Política de Privacidad, contáctanos en:{' '}
              <a
                href="mailto:contacto@recorramosmexico.com.mx"
                className="text-[#E8670A] hover:underline"
              >
                contacto@recorramosmexico.com.mx
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
