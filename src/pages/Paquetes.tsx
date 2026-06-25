import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '525623872050';
const BASE_URL = 'https://www.megatravel.com.mx/tools';
const COLORS = 'txtColor=333333&aColor=E8670A&ahColor=B8520A&thBG=1A1A1A&thTxColor=FFFFFF&ff=2';

const TABS = [
  { key: 'ofertas', url: `${BASE_URL}/ofertas-viaje.php?txtColor=333333&lblTPaq=E8670A&lblTRange=1A1A1A&lblNumRange=666666&itemBack=F9F9F9&ItemHov=FFF3E8&txtColorHov=E8670A&ff=2`, label_es: 'Mejores Ofertas', label_en: 'Best Deals' },
  { key: 'europa', url: `${BASE_URL}/vi.php?Dest=1&${COLORS}`, label_es: 'Europa', label_en: 'Europe' },
  { key: 'medioOriente', url: `${BASE_URL}/vi.php?Dest=2&${COLORS}`, label_es: 'Medio Oriente', label_en: 'Middle East' },
  { key: 'canada', url: `${BASE_URL}/vi.php?Dest=3&${COLORS}`, label_es: 'Canadá', label_en: 'Canada' },
  { key: 'asia', url: `${BASE_URL}/vi.php?Dest=4&${COLORS}`, label_es: 'Asia', label_en: 'Asia' },
  { key: 'africa', url: `${BASE_URL}/vi.php?Dest=5&${COLORS}`, label_es: 'África', label_en: 'Africa' },
  { key: 'pacifico', url: `${BASE_URL}/vi.php?Dest=6&${COLORS}`, label_es: 'Pacífico', label_en: 'Pacific' },
  { key: 'sudamerica', url: `${BASE_URL}/vi.php?Dest=7&${COLORS}`, label_es: 'Sudamérica', label_en: 'South America' },
  { key: 'estadosUnidos', url: `${BASE_URL}/vi.php?Dest=8&${COLORS}`, label_es: 'Estados Unidos', label_en: 'United States' },
  { key: 'centroamerica', url: `${BASE_URL}/vi.php?Dest=9&${COLORS}`, label_es: 'Centroamérica', label_en: 'Central America' },
  { key: 'caribe', url: `${BASE_URL}/vi.php?Dest=10&${COLORS}`, label_es: 'Cuba y el Caribe', label_en: 'Cuba & Caribbean' },
  { key: 'nacionales', url: `${BASE_URL}/vi.php?Dest=11&${COLORS}`, label_es: 'Nacionales', label_en: 'National' },
  { key: 'eventosEspeciales', url: `${BASE_URL}/vi.php?Dest=12&${COLORS}`, label_es: 'Eventos Especiales', label_en: 'Special Events' },
  { key: 'cruceros', url: `${BASE_URL}/vi.php?Dest=13&${COLORS}`, label_es: 'Cruceros', label_en: 'Cruises' },
];

export default function Paquetes() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const [activeTab, setActiveTab] = useState('ofertas');

  const activeTabData = TABS.find((tab) => tab.key === activeTab)!;
  const whatsappMsg = lang === 'en'
    ? 'Hello! I\'m interested in a Mega Travel package I saw on your website.'
    : '¡Hola! Me interesa un paquete de Mega Travel que vi en su sitio web.';

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="bg-[#1A1A1A] py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img src="/Logo_Colores.jpg" alt="y el mundo" className="h-20 rounded-xl" />
            <div>
              <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-1">{t('packages.megaConnection')}</p>
              <h1 className="text-4xl md:text-5xl font-black text-white">{t('packages.title')}</h1>
              <p className="text-gray-400 mt-2">{t('packages.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs - scrollable on mobile */}
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-[#E8670A] text-white shadow-md shadow-[#E8670A]/30'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {lang === 'en' ? tab.label_en : tab.label_es}
              </button>
            ))}
          </div>
        </div>

        {/* iFrame */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <iframe
            key={activeTab}
            src={activeTabData.url}
            width="100%"
            height="800"
            frameBorder="0"
            title={lang === 'en' ? activeTabData.label_en : activeTabData.label_es}
            className="w-full"
            loading="lazy"
          />
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-700 font-medium text-center sm:text-left">{t('packages.whatsapp')}</p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE57] transition-colors whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
