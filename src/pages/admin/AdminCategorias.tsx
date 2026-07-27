import { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, X, Check, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types';

interface FormData {
  name_es: string;
  slug: string;
  icon_name: string;
  description_es: string;
}

const EMPTY_FORM: FormData = {
  name_es: '',
  slug: '',
  icon_name: '',
  description_es: '',
};

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export default function AdminCategorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name_es');
    if (data) setCategories(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name_es: cat.name_es,
      slug: cat.slug,
      icon_name: cat.icon_name || '',
      description_es: cat.description_es || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleNameEsChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name_es: value,
      slug: prev.slug === toSlug(prev.name_es) || !prev.slug ? toSlug(value) : prev.slug,
    }));
  };

  const handleSave = async () => {
    if (!form.name_es.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.slug.trim()) { setError('El slug es obligatorio.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      name_es: form.name_es.trim(),
      name_en: form.name_es.trim(),
      slug: form.slug.trim(),
      icon_name: form.icon_name.trim() || null,
      description_es: form.description_es.trim() || null,
      description_en: form.description_es.trim() || null,
    };

    const { error: err } = editing
      ? await supabase.from('categories').update(payload).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);

    setSaving(false);

    if (err) {
      setError(err.code === '23505' ? 'Ya existe una categoría con ese slug.' : err.message);
      return;
    }

    setShowModal(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    setConfirmDelete(null);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Categorías de Tours</h1>
          <p className="text-gray-500 text-sm mt-1">{categories.length} categorías registradas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors shadow-sm shadow-[#E8670A]/20"
        >
          <Plus size={18} />
          Nueva categoría
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No hay categorías aún.</p>
            <p className="text-gray-400 text-sm mt-1">Crea la primera para empezar a organizar tus tours.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3.5">Nombre</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">Slug</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Ícono</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Descripción</th>
                  <th className="px-5 py-3.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{cat.name_es}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono">
                        {cat.slug}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {cat.icon_name ? (
                        <span className="px-2 py-1 bg-orange-50 text-[#E8670A] rounded-lg text-xs font-mono">
                          {cat.icon_name}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <p className="text-gray-500 text-xs truncate max-w-[240px]">
                        {cat.description_es || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(cat.id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">
                {editing ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  {error}
                </div>
              )}

              {/* Nombres bilingues */}
              <div>
                <label className={labelCls}>Nombre *</label>
                <input
                  type="text"
                  value={form.name_es}
                  onChange={(e) => handleNameEsChange(e.target.value)}
                  placeholder="Ej: Aventura"
                  className={inputCls}
                />
              </div>

              {/* Slug + Icono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Slug (URL) *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="aventura"
                    className={`${inputCls} font-mono`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Solo letras, números y guiones.</p>
                </div>
                <div>
                  <label className={labelCls}>Ícono (Lucide)</label>
                  <input
                    type="text"
                    value={form.icon_name}
                    onChange={(e) => setForm((p) => ({ ...p, icon_name: e.target.value }))}
                    placeholder="Mountain, Waves, Globe..."
                    className={inputCls}
                  />
                  <p className="text-xs text-gray-400 mt-1">Nombre del ícono de lucide-react.</p>
                </div>
              </div>

              {/* Descripciones */}
              <div>
                <label className={labelCls}>Descripción</label>
                <textarea
                  rows={2}
                  value={form.description_es}
                  onChange={(e) => setForm((p) => ({ ...p, description_es: e.target.value }))}
                  placeholder="Breve descripción de esta categoría..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {saving ? 'Guardando...' : 'Guardar categoría'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">¿Eliminar categoría?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Esta acción no se puede deshacer. Los tours que tengan esta categoría quedarán sin categoría asignada.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
