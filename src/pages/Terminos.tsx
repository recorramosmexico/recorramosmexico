import { useSEO } from '../hooks/useSEO';

export default function Terminos() {
  useSEO({
    title: 'Términos y Condiciones de Servicio | Recorramos México',
    description:
      'Términos y Condiciones de Servicio de Recorramos México. Reglas de uso de la plataforma, reservaciones, pagos y más.',
    path: '/terminos',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          Términos y Condiciones de Servicio
        </h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 29 de julio de 2026</p>

        <div className="prose prose-orange max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            Bienvenido a Recorramos México. Al acceder o usar esta plataforma, aceptas los
            siguientes Términos y Condiciones.
          </p>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Descripción del servicio</h2>
            <p>
              Recorramos México ofrece tours y experiencias turísticas propias, operadas
              directamente por nosotros. A través de esta plataforma puedes conocer, reservar y
              pagar dichos tours.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Registro de cuenta</h2>
            <p>
              Para realizar una reservación puede ser necesario crear una cuenta, incluyendo mediante
              inicio de sesión con Google. Eres responsable de mantener la confidencialidad de tus
              credenciales de acceso y de toda actividad realizada en tu cuenta.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              3. Reservaciones y pagos
            </h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Las reservaciones están sujetas a disponibilidad.</li>
              <li>
                Los precios mostrados incluyen los cargos aplicables al momento de la reserva.
              </li>
              <li>
                Las políticas de cancelación y reembolso se especifican al momento de confirmar tu
                reservación.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Obligaciones del usuario</h2>
            <p>
              Te comprometes a usar la plataforma de forma lícita, proporcionar información veraz, y
              respetar las indicaciones de seguridad y conducta durante la realización del tour.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Responsabilidad</h2>
            <p>
              Recorramos México es responsable directo de la operación de los tours ofrecidos en
              esta plataforma. Nos comprometemos a brindar el servicio conforme a lo descrito en cada
              reservación, sujeto a condiciones razonables fuera de nuestro control (clima, causas
              de fuerza mayor, disposiciones de autoridades).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Propiedad intelectual</h2>
            <p>
              Todo el contenido de la plataforma (textos, imágenes, logotipo, diseño) es propiedad de
              Recorramos México y no puede reproducirse sin autorización.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Modificaciones</h2>
            <p>
              Podemos actualizar estos Términos en cualquier momento. El uso continuado de la
              plataforma después de dichos cambios constituye tu aceptación de los nuevos términos.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Ley aplicable</h2>
            <p>Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contacto</h2>
            <p>
              Para dudas sobre estos Términos, contáctanos en:{' '}
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
