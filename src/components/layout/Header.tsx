import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProductsSectionEnabled } from '../../hooks/useProductsSectionEnabled';

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { enabled: productsEnabled } = useProductsSectionEnabled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const isHome = location.pathname === '/';
  const navBg = isScrolled || !isHome
    ? 'bg-[#1A1A1A] shadow-lg'
    : 'bg-transparent';

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/tours', label: t('nav.tours') },
    { path: '/paquetes', label: t('nav.packages') },
    { path: '/nosotros', label: t('nav.about') },
    { path: '/servicios', label: t('nav.services') },
    ...(productsEnabled ? [{ path: '/productos', label: t('nav.products') }] : []),
    { path: '/blog', label: t('nav.blog') },
    { path: '/resenas', label: t('nav.reviews') },
    { path: '/contacto', label: t('nav.contact') },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex-shrink-0">
            <img
              src="/Logo_Naranja.jpeg"
              alt="Recorramos México"
              className="h-10 md:h-14 w-auto rounded-lg"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  location.pathname === link.path
                    ? 'text-[#E8670A] bg-[#E8670A]/10'
                    : 'text-gray-200 hover:text-[#E8670A] hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-gray-300 hover:text-[#E8670A] transition-colors text-sm font-medium"
            >
              <Globe size={16} />
              <span>{i18n.language === 'es' ? 'EN' : 'ES'}</span>
            </button>

            {user ? (
              <Link
                to="/mi-cuenta"
                className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-200 hover:text-[#E8670A] border border-white/20 hover:border-[#E8670A]/50 rounded-lg transition-colors duration-200"
              >
                <User size={15} />
                Mi cuenta
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-200 hover:text-[#E8670A] border border-white/20 hover:border-[#E8670A]/50 rounded-lg transition-colors duration-200"
              >
                <User size={15} />
                Iniciar sesión
              </Link>
            )}

            <Link
              to="/tours"
              className="hidden lg:inline-flex items-center px-4 py-2 bg-[#E8670A] text-white text-sm font-semibold rounded-lg hover:bg-[#B8520A] transition-colors duration-200"
            >
              {t('home.hero.cta')}
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden bg-[#1A1A1A] border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#E8670A] bg-[#E8670A]/10'
                    : 'text-gray-200 hover:text-[#E8670A] hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 space-y-2 pb-1">
              {user ? (
                <Link
                  to="/mi-cuenta"
                  className="flex items-center gap-2 w-full px-4 py-3 text-gray-200 hover:text-[#E8670A] text-sm font-medium rounded-lg border border-white/10"
                >
                  <User size={15} />
                  Mi cuenta
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 w-full px-4 py-3 text-gray-200 hover:text-[#E8670A] text-sm font-medium rounded-lg border border-white/10"
                >
                  <User size={15} />
                  Iniciar sesión
                </Link>
              )}
              <Link
                to="/tours"
                className="block w-full text-center px-4 py-3 bg-[#E8670A] text-white font-semibold rounded-lg"
              >
                {t('home.hero.cta')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
