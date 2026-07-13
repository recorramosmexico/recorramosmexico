import { useTranslation } from 'react-i18next';
import { Shield, Users, Heart, Globe } from 'lucide-react';

const TEAM = [
  { name: 'Trinidad Gil Martinez', role: 'Coordinador', img: '/images/team/TrinidadGilMartinez.jpeg' },
  { name: 'Erasmo Gil Martinez', role: 'Coordinador', img: '/images/team/ErasmoGilMartinez.jpeg' },
  { name: 'Nancy Martínez Carrillo', role: 'Coordinadora', img: '/images/team/NancyMartinez.jpeg' },
  { name: 'Alan Axel Alvarez Hernandez', role: 'Página Web', img: '/images/team/AlanAxelAlvarez.jpg' },
  { name: 'Jhosua Gallardo Morales', role: 'Marketing Digital', img: '/images/team/JoshuaGallardo.jpeg' },
];

export default function Nosotros() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="bg-[#1A1A1A] py-20 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=1920)' }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-4">
            {t('about.whoWeAreLabel')}
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">{t('about.title')}</h1>
          <p className="text-xl text-gray-300 font-light">{t('about.subtitle')}</p>
        </div>
      </div>

      {/* Story Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-3">
                {t('about.storyLabel')}
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">{t('about.story.title')}</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>{t('about.story.p1')}</p>
                <p>{t('about.story.p2')}</p>
                <p>{t('about.story.p3')}</p>
              </div>
            </div>
            <div className="relative">
              <img
                src="/Logo_Bandera.jpg"
                alt="Recorramos México"
                className="w-full rounded-3xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-[#E8670A] text-white rounded-2xl p-5 shadow-lg">
                <p className="text-3xl font-black">5,000+</p>
                <p className="text-sm font-medium mt-1">{t('about.happyTravelers')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who we are / Vision / Mission */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users size={22} className="text-[#E8670A]" />,
                title: t('about.whoWeAre.title'),
                text: t('about.whoWeAre.text'),
              },
              {
                icon: <Globe size={22} className="text-[#E8670A]" />,
                title: t('about.vision.title'),
                text: t('about.vision.text'),
              },
              {
                icon: <Heart size={22} className="text-[#E8670A]" />,
                title: t('about.mission.title'),
                text: t('about.mission.text'),
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-[#E8670A]/10 rounded-xl flex items-center justify-center mb-4">
                  {card.icon}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-4">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900">{t('about.values.title')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Heart size={28} />, key: 'passion' },
              { icon: <Shield size={28} />, key: 'trust' },
              { icon: <Users size={28} />, key: 'community' },
              { icon: <Globe size={28} />, key: 'adventure' },
            ].map((v) => (
              <div key={v.key} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:border-[#E8670A]/30 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-[#E8670A]/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-[#E8670A]">
                  {v.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t(`about.values.${v.key}.title`)}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{t(`about.values.${v.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-2">
              {t('about.certificationsLabel')}
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">{t('about.certifications.title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                logo: '/SECTUR.png',
                title: t('about.certifications.rnt.title'),
                desc: t('about.certifications.rnt.description'),
                badge: 'No. 04151044189',
              },
              {
                logo: '/LogoFematur.jpg',
                title: t('about.certifications.fematur.title'),
                desc: t('about.certifications.fematur.description'),
                badge: t('about.certifications.memberBadge'),
              },
              {
                logo: '/LogoAMAV.jpeg',
                title: t('about.certifications.amavcdmx.title'),
                desc: t('about.certifications.amavcdmx.description'),
                badge: t('about.certifications.associateBadge'),
              },
            ].map((cert) => (
              <div key={cert.title} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
                <div className="mb-5 flex justify-center items-center h-20">
                  <img src={cert.logo} alt={cert.title} className="max-h-16 max-w-[160px] object-contain" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">{cert.title}</h3>
                <span className="inline-block text-xs font-bold text-[#E8670A] bg-[#E8670A]/10 px-3 py-1 rounded-full mb-4">
                  {cert.badge}
                </span>
                <p className="text-gray-500 text-sm leading-relaxed">{cert.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#E8670A] font-semibold text-sm uppercase tracking-wider mb-2">
              {t('about.teamLabel')}
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">{t('about.team.title')}</h2>
            <p className="text-gray-500 mt-2">{t('about.team.subtitle')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {TEAM.map((member) => (
              <div key={member.name} className="text-center group w-40 md:w-44">
                <div className="relative mb-4 inline-block">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full mx-auto object-cover border-4 border-white shadow-md group-hover:border-[#E8670A] transition-colors duration-300"
                  />
                </div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base">{member.name}</h3>
                <p className="text-[#E8670A] text-xs font-medium mt-0.5">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
