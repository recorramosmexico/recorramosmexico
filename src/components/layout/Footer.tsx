import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Instagram, Facebook, MapPin, Mail, Phone, Shield, Award } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  const quickLinks = [
    { path: '/tours', label: t('nav.tours') },
    { path: '/paquetes', label: t('nav.packages') },
    { path: '/nosotros', label: t('nav.about') },
    { path: '/servicios', label: t('nav.services') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/contacto', label: t('nav.contact') },
  ];

  return (
    <footer className="bg-[#1A1A1A] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <Link to="/">
              <img
                src="/Logo_Naranja.jpeg"
                alt="Recorramos México"
                className="h-20 w-auto rounded-xl mb-4"
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              {t('footer.description')}
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.instagram.com/recorramosmexico_oficial/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#E8670A] transition-colors duration-200"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/recorramosmx"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#E8670A] transition-colors duration-200"
              >
                <Facebook size={18} />
              </a>
              <a
                href="https://www.tiktok.com/@recorramosmexico_oficial"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#E8670A] transition-colors duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-400 hover:text-[#E8670A] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
              {t('footer.contact')}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-gray-400">
                <MapPin size={16} className="text-[#E8670A] mt-0.5 flex-shrink-0" />
                <span>{t('contact.info.address')}</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-400">
                <Mail size={16} className="text-[#E8670A] flex-shrink-0" />
                <a href="mailto:recorramosmexico.oficial@gmail.com" className="hover:text-[#E8670A] transition-colors">
                  recorramosmexico.oficial@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-400">
                <Phone size={16} className="text-[#E8670A] flex-shrink-0" />
                <a href="tel:+525623872050" className="hover:text-[#E8670A] transition-colors">
                  +52 56 2387 2050
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
              {t('footer.certifications')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Shield size={16} className="text-[#E8670A] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">RNT SECTUR</p>
                  <p className="text-gray-500 text-xs">No. 04151044189</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Award size={16} className="text-[#E8670A] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">FEMATUR</p>
              <p className="text-gray-500 text-xs">{t('home.trust.fematurBadge')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Award size={16} className="text-[#E8670A] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">AMAVCDMX</p>
                  <p className="text-gray-500 text-xs">{t('home.trust.amavcdmxBadge')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Recorramos México. {t('footer.rights')}
          </p>
          <p className="text-xs text-gray-600">{t('footer.legalNote')}</p>
        </div>
      </div>
    </footer>
  );
}
