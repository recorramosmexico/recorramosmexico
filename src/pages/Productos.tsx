import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Search, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { useProductsSectionEnabled } from '../hooks/useProductsSectionEnabled';
import type { Product } from '../types';

const CATEGORIES = ['gorras', 'camisetas', 'toallas', 'accesorios', 'otros'];

export default function Productos() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const { enabled } = useProductsSectionEnabled();

  useSEO({
    title: lang === 'en' ? 'Official Products' : 'Productos Oficiales',
    description: lang === 'en'
      ? 'Buy official Recorramos México merchandise: caps, t-shirts, towels and more.'
      : 'Compra productos oficiales de Recorramos México: gorras, camisetas, toallas y más.',
    path: '/productos',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const title = lang === 'en' ? p.title_en : p.title_es;
      const matchesSearch = !search || title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category, lang]);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#E8670A]/20 text-[#E8670A] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <ShoppingBag size={14} />
            {lang === 'en' ? 'Official Store' : 'Tienda Oficial'}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
            {lang === 'en' ? 'Official Products' : 'Productos Oficiales'}
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
            {lang === 'en'
              ? 'Take a piece of Recorramos México with you: caps, t-shirts, towels and more with our official brand.'
              : 'Lleva un pedazo de Recorramos México contigo: gorras, camisetas, toallas y más con nuestra marca oficial.'}
          </p>
        </div>
      </div>

      {/* Filters + Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Search + Category filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'en' ? 'Search products...' : 'Buscar productos...'}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory('')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                !category ? 'bg-[#E8670A] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {lang === 'en' ? 'All' : 'Todos'}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition ${
                  category === cat ? 'bg-[#E8670A] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E8670A]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {lang === 'en' ? 'No products found' : 'No se encontraron productos'}
            </h3>
            <p className="text-gray-500 text-sm">
              {lang === 'en' ? 'Try a different search or category.' : 'Intenta con otra búsqueda o categoría.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => {
              const title = lang === 'en' ? product.title_en : product.title_es;
              const totalStock = (product.sizes || []).reduce((sum, s) => sum + (s.stock || 0), 0);
              const img = product.image_urls?.[0];
              return (
                <Link
                  key={product.id}
                  to={`/productos/${product.slug}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-square overflow-hidden bg-gray-50 relative">
                    {img ? (
                      <img
                        src={img}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={40} className="text-gray-300" />
                      </div>
                    )}
                    {totalStock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-lg">
                          {lang === 'en' ? 'Out of stock' : 'Agotado'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-[#E8670A] font-semibold uppercase tracking-wider mb-1">{product.category}</p>
                    <h3 className="font-bold text-gray-900 text-base leading-tight mb-3 group-hover:text-[#E8670A] transition-colors">
                      {title}
                    </h3>

                    {/* Stock por talla o total */}
                    {product.sizes && product.sizes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {product.sizes.map((s) => (
                          <span
                            key={s.size}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                              s.stock > 0
                                ? 'bg-gray-50 border-gray-200 text-gray-700'
                                : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                            }`}
                          >
                            {s.size}
                            {s.stock > 0 && (
                              <span className={`font-bold ${s.stock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>
                                {s.stock}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : totalStock > 0 ? (
                      <p className="text-xs text-gray-500 mb-3">
                        {lang === 'en' ? `${totalStock} available` : `${totalStock} disponibles`}
                      </p>
                    ) : null}

                    <p className="text-xl font-black text-gray-900">
                      ${product.price_mxn.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} <span className="text-sm font-normal text-gray-500">MXN</span>
                    </p>
                    {product.shipping_cost_mxn > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {lang === 'en' ? `Shipping from ${product.shipping_cost_mxn.toLocaleString('es-MX')} MXN` : `Envío desde ${product.shipping_cost_mxn.toLocaleString('es-MX')} MXN`}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
