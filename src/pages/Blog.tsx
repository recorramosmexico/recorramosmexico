import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Tag, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BlogPost } from '../types';

type BlogCategory = 'all' | 'destinos' | 'festivales' | 'tips' | 'cultura';

export default function Blog() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BlogCategory>('all');

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data);
        setLoading(false);
      });
  }, []);

  const filtered = activeCategory === 'all' ? posts : posts.filter((p) => p.category === activeCategory);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const categories: { value: BlogCategory; label: string }[] = [
    { value: 'all', label: t('blog.categories.all') },
    { value: 'destinos', label: t('blog.categories.destinos') },
    { value: 'festivales', label: t('blog.categories.festivales') },
    { value: 'tips', label: t('blog.categories.tips') },
    { value: 'cultura', label: t('blog.categories.cultura') },
  ];

  const featuredPost = filtered[0];
  const restPosts = filtered.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="bg-[#1A1A1A] py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{t('blog.title')}</h1>
          <p className="text-gray-400 text-lg">{t('blog.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat.value
                  ? 'bg-[#E8670A] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#E8670A] hover:text-[#E8670A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-20">{t('blog.noCategoryPosts')}</p>
        ) : (
          <>
            {/* Featured post */}
            {featuredPost && (
              <Link
                to={`/blog/${featuredPost.slug}`}
                className="group block mb-10 bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:border-[#E8670A]/30"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative overflow-hidden aspect-video lg:aspect-auto">
                    <img
                      src={featuredPost.cover_image || `https://picsum.photos/seed/${featuredPost.slug}/800/500`}
                      alt={lang === 'en' ? featuredPost.title_en : featuredPost.title_es}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-8 lg:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E8670A] bg-[#E8670A]/10 px-3 py-1 rounded-full">
                        <Tag size={12} />
                        {t(`blog.categories.${featuredPost.category}`)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar size={12} />
                        {formatDate(featuredPost.created_at)}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 group-hover:text-[#E8670A] transition-colors">
                      {lang === 'en' ? featuredPost.title_en : featuredPost.title_es}
                    </h2>
                    <p className="text-gray-500 leading-relaxed mb-6">
                      {lang === 'en' ? featuredPost.summary_en : featuredPost.summary_es}
                    </p>
                    <span className="flex items-center gap-2 text-[#E8670A] font-semibold text-sm">
                      {t('blog.readMore')} <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid of posts */}
            {restPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#E8670A]/30 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden aspect-video">
                      <img
                        src={post.cover_image || `https://picsum.photos/seed/${post.slug}/600/400`}
                        alt={lang === 'en' ? post.title_en : post.title_es}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-[#E8670A] bg-[#E8670A]/10 px-2.5 py-1 rounded-full">
                          {t(`blog.categories.${post.category}`)}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base mb-2 leading-snug group-hover:text-[#E8670A] transition-colors line-clamp-2">
                        {lang === 'en' ? post.title_en : post.title_es}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                        {lang === 'en' ? post.summary_en : post.summary_es}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
