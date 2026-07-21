import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Tag, ArrowLeft, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { BlogPost as BlogPostType } from '../types';
import { useSEO } from '../hooks/useSEO';
import { blogPostSchema, breadcrumbSchema } from '../lib/structuredData';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [related, setRelated] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle();
      if (data) {
        setPost(data);
        const { data: rel } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .eq('category', data.category)
          .neq('slug', slug)
          .limit(3);
        if (rel) setRelated(rel);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-3 h-3 bg-[#E8670A] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('common.notFound')}</h1>
        <Link to="/blog" className="text-[#E8670A] font-semibold hover:underline">
          {t('blog.backToBlog')}
        </Link>
      </div>
    );
  }

  const title = lang === 'en' ? post.title_en : post.title_es;
  const summary = lang === 'en' ? post.summary_en : post.summary_es;
  const content = lang === 'en' ? post.content_en : post.content_es;

  useSEO({
    title,
    description: summary.slice(0, 155),
    path: `/blog/${post.slug}`,
    image: post.cover_image || '/Logo_Bandera.jpg',
    type: 'article',
    publishedTime: post.created_at,
    jsonLd: [
      blogPostSchema(post, lang),
      breadcrumbSchema([
        { name: 'Inicio', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: title, path: `/blog/${post.slug}` },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-white pt-20">

      {/* Hero */}
      <div className="relative h-72 md:h-[450px] overflow-hidden">
        <img
          src={post.cover_image || `https://picsum.photos/seed/${post.slug}/1200/450`}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#E8670A] bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                <Tag size={12} /> {t(`blog.categories.${post.category}`)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white/80">
                <Calendar size={12} /> {formatDate(post.created_at)}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/blog" className="flex items-center gap-2 text-gray-500 hover:text-[#E8670A] transition-colors text-sm">
            <ArrowLeft size={16} /> Blog
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm truncate">{title}</span>
        </div>

        {/* Summary */}
        <p className="text-xl text-gray-600 font-medium leading-relaxed border-l-4 border-[#E8670A] pl-5 mb-8">
          {summary}
        </p>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:font-black prose-headings:text-gray-900 prose-a:text-[#E8670A] prose-strong:text-gray-800"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Share */}
        <div className="mt-10 pt-8 border-t border-gray-200 flex items-center gap-3">
          <span className="text-gray-500 text-sm font-medium">{t('blog.share')}:</span>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-[#E8670A] hover:text-white transition-colors"
          >
            <Share2 size={16} /> {t('blog.copyLink')}
          </button>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-black text-gray-900 mb-6">{t('blog.relatedPosts')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="group block bg-gray-50 rounded-2xl overflow-hidden hover:shadow-md transition-shadow border border-gray-100 hover:border-[#E8670A]/30"
                >
                  <img
                    src={rel.cover_image || `https://picsum.photos/seed/${rel.slug}/400/250`}
                    alt={lang === 'en' ? rel.title_en : rel.title_es}
                    className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">{formatDate(rel.created_at)}</p>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-[#E8670A] transition-colors">
                      {lang === 'en' ? rel.title_en : rel.title_es}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
