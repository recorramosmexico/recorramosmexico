import { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { BlogPost } from '../../types';

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({
    title_es: '', title_en: '', slug: '', summary_es: '', summary_en: '',
    content_es: '', content_en: '', cover_image: '', category: 'destinos', is_published: false,
  });

  const load = async () => {
    const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title_es: '', title_en: '', slug: '', summary_es: '', summary_en: '', content_es: '', content_en: '', cover_image: '', category: 'destinos', is_published: false });
    setShowForm(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({ title_es: post.title_es, title_en: post.title_en, slug: post.slug, summary_es: post.summary_es, summary_en: post.summary_en, content_es: post.content_es, content_en: post.content_en, cover_image: post.cover_image, category: post.category, is_published: post.is_published });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = { ...form, slug: form.slug || form.title_es.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') };
    if (editing) {
      await supabase.from('blog_posts').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('blog_posts').insert(payload);
    }
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este artículo?')) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePublished = async (post: BlogPost) => {
    await supabase.from('blog_posts').update({ is_published: !post.is_published }).eq('id', post.id);
    load();
  };

  const CATS = [
    { value: 'destinos', label: 'Destinos' },
    { value: 'festivales', label: 'Festivales' },
    { value: 'tips', label: 'Tips de Viaje' },
    { value: 'cultura', label: 'Cultura' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestión del Blog</h1>
          <p className="text-gray-500 text-sm mt-1">{posts.length} artículos</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors">
          <Plus size={18} /> Nuevo artículo
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900 mb-6">{editing ? 'Editar artículo' : 'Nuevo artículo'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Título en español</label>
                <input value={form.title_es} onChange={(e) => setForm((p) => ({ ...p, title_es: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Título en inglés</label>
                <input value={form.title_en} onChange={(e) => setForm((p) => ({ ...p, title_en: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Slug</label>
                <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Categoría</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30">
                  {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">URL imagen de portada</label>
                <input value={form.cover_image} onChange={(e) => setForm((p) => ({ ...p, cover_image: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Resumen en español</label>
                <textarea rows={3} value={form.summary_es} onChange={(e) => setForm((p) => ({ ...p, summary_es: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Resumen en inglés</label>
                <textarea rows={3} value={form.summary_en} onChange={(e) => setForm((p) => ({ ...p, summary_en: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contenido en español (HTML)</label>
                <textarea rows={6} value={form.content_es} onChange={(e) => setForm((p) => ({ ...p, content_es: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contenido en inglés (HTML)</label>
                <textarea rows={6} value={form.content_en} onChange={(e) => setForm((p) => ({ ...p, content_en: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 font-mono" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} className="w-4 h-4 accent-[#E8670A]" />
                <label htmlFor="is_published" className="text-sm font-medium text-gray-700 cursor-pointer">Publicar</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button onClick={handleSave} className="flex-1 py-3 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors">Guardar</button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <p className="p-12 text-center text-gray-400">No hay artículos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3">Artículo</th>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map((post) => (
                  <tr key={post.id} className={`hover:bg-gray-50 ${!post.is_published ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{post.title_es}</p>
                      <p className="text-gray-400 text-xs">/blog/{post.slug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-[#E8670A]/10 text-[#E8670A] rounded-full capitalize">{post.category}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {post.is_published ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{new Date(post.created_at).toLocaleDateString('es-MX')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => togglePublished(post)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          {post.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={() => openEdit(post)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
