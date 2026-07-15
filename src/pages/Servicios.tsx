import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { Bus, Compass, Ticket, Check, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050';
const ADMIN_EMAIL = 'contacto@recorramosmexico.com.mx';

export default function Servicios() {
  const { t } = useTranslation();
  const [transportSent, setTransportSent] = useState(false);
  const [customSent, setCustomSent] = useState(false);

  const transportForm = useForm();
  const customForm = useForm();

  const handleTransport = async (data: Record<string, string>) => {
    const mensaje = `Origen: ${data.origin}\nDestino: ${data.destination}\nFecha: ${data.date}\nPasajeros: ${data.passengers}\nDetalles: ${data.details || 'N/A'}`;
    await supabase.from('inquiries').insert({
      tipo: 'transporte',
      nombre: data.name || 'N/A',
      email: data.email || 'N/A',
      telefono: data.phone || '',
      asunto: `Transporte: ${data.origin} → ${data.destination}`,
      mensaje,
    });
    sendEmail('inquiry', ADMIN_EMAIL, {
      tipo: 'transporte',
      nombre: data.name || 'N/A',
      email: data.email || 'N/A',
      telefono: data.phone || '',
      asunto: `Transporte: ${data.origin} → ${data.destination}`,
      mensaje,
    });
    setTransportSent(true);
  };

  const handleCustom = async (data: Record<string, string>) => {
    const mensaje = `Destino: ${data.destination}\nFechas: ${data.date || 'N/A'}\nPersonas: ${data.groupSize}\nPresupuesto: ${data.budget || 'N/A'}\nDetalles: ${data.details || 'N/A'}`;
    await supabase.from('inquiries').insert({
      tipo: 'tour_personalizado',
      nombre: data.name || 'N/A',
      email: data.email || 'N/A',
      telefono: data.phone || '',
      asunto: `Tour personalizado: ${data.destination}`,
      mensaje,
    });
    sendEmail('inquiry', ADMIN_EMAIL, {
      tipo: 'tour_personalizado',
      nombre: data.name || 'N/A',
      email: data.email || 'N/A',
      telefono: data.phone || '',
      asunto: `Tour personalizado: ${data.destination}`,
      mensaje,
    });
    setCustomSent(true);
  };

  const handleTicketsWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Necesito boletos para un evento. ¿Me pueden ayudar?')}`,
      '_blank'
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="bg-[#1A1A1A] py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{t('services.title')}</h1>
          <p className="text-gray-400 text-lg">{t('services.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* TRANSPORT */}
        <section id="transporte" className="scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-16 h-16 bg-[#E8670A]/10 rounded-2xl flex items-center justify-center mb-6">
                <Bus size={32} className="text-[#E8670A]" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">{t('services.transport.title')}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{t('services.transport.description')}</p>
              <ul className="space-y-3">
                {(t('services.transport.features', { returnObjects: true }) as string[]).map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-gray-700 text-sm">
                    <Check size={18} className="text-[#1B4332] flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              {transportSent ? (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="text-[#1B4332] mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h3>
                  <p className="text-gray-500 text-sm">Te contactaremos pronto con la cotización.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">{t('services.transport.form.title')}</h3>
                  <form onSubmit={transportForm.handleSubmit(handleTransport)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input {...transportForm.register('name', { required: true })} placeholder="Tu nombre *" className="col-span-2 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...transportForm.register('email', { required: true })} type="email" placeholder="Correo *" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...transportForm.register('phone')} type="tel" placeholder="Teléfono" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...transportForm.register('date', { required: true })} type="date" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...transportForm.register('passengers', { required: true })} type="number" min="1" placeholder="# Pasajeros *" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...transportForm.register('origin', { required: true })} placeholder="Origen *" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...transportForm.register('destination', { required: true })} placeholder="Destino *" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <textarea {...transportForm.register('details')} rows={3} placeholder="Detalles adicionales" className="col-span-2 px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors">
                      <Send size={18} /> {t('services.transport.form.submit')}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-gray-200" />

        {/* CUSTOM TOURS */}
        <section id="personalizado" className="scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="order-2 lg:order-1 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              {customSent ? (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="text-[#1B4332] mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h3>
                  <p className="text-gray-500 text-sm">Diseñaremos el itinerario perfecto para ti.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">{t('services.custom.form.title')}</h3>
                  <form onSubmit={customForm.handleSubmit(handleCustom)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input {...customForm.register('name', { required: true })} placeholder="Tu nombre *" className="col-span-2 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...customForm.register('email', { required: true })} type="email" placeholder="Correo *" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...customForm.register('phone')} type="tel" placeholder="Teléfono" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...customForm.register('destination', { required: true })} placeholder="Destino deseado *" className="col-span-2 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...customForm.register('date')} placeholder="Fechas aproximadas" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...customForm.register('groupSize', { required: true })} type="number" min="1" placeholder="# Personas *" className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <input {...customForm.register('budget')} placeholder="Presupuesto por persona" className="col-span-2 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                      <textarea {...customForm.register('details')} rows={3} placeholder="Cuéntanos más sobre tu viaje ideal" className="col-span-2 px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors">
                      <Send size={18} /> {t('services.custom.form.submit')}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <div className="w-16 h-16 bg-[#E8670A]/10 rounded-2xl flex items-center justify-center mb-6">
                <Compass size={32} className="text-[#E8670A]" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">{t('services.custom.title')}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{t('services.custom.description')}</p>
              <ul className="space-y-3">
                {(t('services.custom.features', { returnObjects: true }) as string[]).map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-gray-700 text-sm">
                    <Check size={18} className="text-[#1B4332] flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="border-t border-gray-200" />

        {/* EVENT TICKETS */}
        <section id="boletos" className="scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 bg-[#E8670A]/10 rounded-2xl flex items-center justify-center mb-6">
                <Ticket size={32} className="text-[#E8670A]" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">{t('services.tickets.title')}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{t('services.tickets.description')}</p>
              <ul className="space-y-3 mb-8">
                {(t('services.tickets.features', { returnObjects: true }) as string[]).map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-gray-700 text-sm">
                    <Check size={18} className="text-[#1B4332] flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleTicketsWhatsApp}
                className="flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white font-bold text-lg rounded-2xl hover:bg-[#1EBE57] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('services.tickets.cta')}
              </button>
            </div>
            <div className="relative">
              <img
                src="https://picsum.photos/seed/tickets/600/400"
                alt="Boletos para eventos"
                className="rounded-3xl shadow-xl w-full"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
