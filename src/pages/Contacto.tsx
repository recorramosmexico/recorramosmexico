import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { MapPin, Mail, Phone, Clock, Send, CheckCircle, Instagram, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';
import { useSEO } from '../hooks/useSEO';
import { organizationSchema } from '../lib/structuredData';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050';

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function Contacto() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactForm>();

  useSEO({
    title: 'Contacto | Recorramos México',
    description:
      'Contáctanos para reservar tu próximo viaje en grupo. Estamos en Tlalnepantla, Estado de México. WhatsApp, teléfono y correo disponibles.',
    path: '/contacto',
    image: '/Logo_Naranja.jpeg',
    jsonLd: organizationSchema(),
  });

  const onSubmit = async (data: ContactForm) => {
    setSubmitting(true);
    await supabase.from('inquiries').insert({
      tipo: 'contacto',
      nombre: data.name,
      email: data.email,
      telefono: data.phone || '',
      asunto: data.subject,
      mensaje: data.message,
    });
    sendEmail('inquiry', 'contacto@recorramosmexico.com.mx', {
      tipo: 'contacto',
      nombre: data.name,
      email: data.email,
      telefono: data.phone || '',
      asunto: data.subject,
      mensaje: data.message,
    });
    setSubmitting(false);
    setSubmitted(true);
    reset();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="bg-[#1A1A1A] py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{t('contact.title')}</h1>
          <p className="text-gray-400 text-lg">{t('contact.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-6">{t('contact.info.title')}</h2>
              <div className="space-y-5">
                {[
                  { icon: <MapPin size={18} />, label: t('contact.info.addressLabel'), value: t('contact.info.address') },
                  { icon: <Mail size={18} />, label: t('contact.info.emailLabel'), value: t('contact.info.email'), href: `mailto:${t('contact.info.email')}` },
                  { icon: <Phone size={18} />, label: t('contact.info.phoneLabel'), value: t('contact.info.phone'), href: `tel:+525623872050` },
                  { icon: <Clock size={18} />, label: t('contact.info.hoursLabel'), value: t('contact.info.hours') },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#E8670A]/10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#E8670A]">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm mb-0.5">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-[#E8670A] text-sm hover:underline">{item.value}</a>
                      ) : (
                        <p className="text-gray-500 text-sm leading-relaxed">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Quisiera más información sobre sus servicios.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-[#25D366] text-white p-6 rounded-2xl hover:bg-[#1EBE57] transition-colors group"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg">{t('contact.whatsapp')}</p>
                <p className="text-green-100 text-sm">{t('contact.info.phone')}</p>
              </div>
            </a>

            {/* Redes sociales */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Síguenos</h3>
              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/recorramosmexico_oficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-xl bg-gray-50 hover:bg-[#E8670A] hover:text-white transition-colors group"
                >
                  <Instagram size={18} className="text-[#E8670A] group-hover:text-white transition-colors" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-white transition-colors">Instagram</span>
                </a>
                <a
                  href="https://www.facebook.com/recorramosmx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-xl bg-gray-50 hover:bg-[#E8670A] hover:text-white transition-colors group"
                >
                  <Facebook size={18} className="text-[#E8670A] group-hover:text-white transition-colors" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-white transition-colors">Facebook</span>
                </a>
                <a
                  href="https://www.tiktok.com/@recorramosmexico_oficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-xl bg-gray-50 hover:bg-[#E8670A] hover:text-white transition-colors group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="text-[#E8670A] group-hover:text-white transition-colors flex-shrink-0">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-white transition-colors">TikTok</span>
                </a>
              </div>
            </div>

            {/* Map */}
            <div className="bg-gray-200 rounded-2xl overflow-hidden h-48">
              <iframe
                src="https://maps.google.com/maps?q=Tlalnepantla+Estado+de+Mexico&t=&z=13&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                frameBorder="0"
                title="Ubicación Recorramos México"
                loading="lazy"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle size={56} className="text-[#1B4332] mb-4" />
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{t('contact.messageSent')}</h3>
                  <p className="text-gray-500">{t('contact.form.success')}</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-[#E8670A] font-semibold hover:underline">
                    {t('contact.sendAnother')}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-gray-900 mb-6">{t('contact.sendMessage')}</h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {t('contact.form.name')} *
                        </label>
                        <input
                          {...register('name', { required: true })}
                          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {t('contact.form.email')} *
                        </label>
                        <input
                          type="email"
                          {...register('email', { required: true })}
                          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {t('contact.form.phone')}
                        </label>
                        <input
                          type="tel"
                          {...register('phone')}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {t('contact.form.subject')} *
                        </label>
                        <input
                          {...register('subject', { required: true })}
                          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.subject ? 'border-red-400' : 'border-gray-200'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {t('contact.form.message')} *
                      </label>
                      <textarea
                        {...register('message', { required: true })}
                        rows={5}
                        className={`w-full px-4 py-3 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] ${errors.message ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-[#E8670A] text-white font-bold text-lg rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
                    >
                      <Send size={20} />
                      {submitting ? t('common.loading') : t('contact.form.submit')}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
