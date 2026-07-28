import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, Search, CreditCard as Edit3, Trash2, X, Save, Upload, Package, Check, Loader2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product, ProductSize } from '../../types';

const CATEGORIES = ['gorras', 'camisetas', 'toallas', 'accesorios', 'otros'];

interface FormData {
  title_es: string;
  description_es: string;
  price_mxn: string;
  shipping_cost_mxn: string;
  category: string;
  sizes: ProductSize[];
  image_urls: string[];
  is_active: boolean;
}

const EMPTY_FORM: FormData = {
  title_es: '',
  description_es: '',
  price_mxn: '',
  shipping_cost_mxn: '',
  category: 'gorras',
  sizes: [],
  image_urls: [],
  is_active: true,
};

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'images', label: 'Imágenes' },
  { id: 'inventory', label: 'Inventario' },
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function AdminProductos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [section, setSection] = useState('general');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setLoading(true);
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setLoading(false);
      });
  };

  const filtered = products.filter((p) =>
    !search || p.title_es.toLowerCase().includes(search.toLowerCase()) || p.title_en.toLowerCase().includes(search.toLowerCase())
  );

  const setF = (patch: Partial<FormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSection('general');
    setSlugEdited(false);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      title_es: p.title_es,
      description_es: p.description_es,
      price_mxn: String(p.price_mxn),
      shipping_cost_mxn: String(p.shipping_cost_mxn),
      category: p.category,
      sizes: p.sizes || [],
      image_urls: p.image_urls || [],
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setSection('general');
    setSlugEdited(true);
    setShowForm(true);
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, file, { cacheControl: '3600' });
        if (error) throw error;
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        urls.push(data.publicUrl);
      }
      setF({ image_urls: [...form.image_urls, ...urls] });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (idx: number) => {
    setF({ image_urls: form.image_urls.filter((_, i) => i !== idx) });
  };

  const addSize = () => {
    setF({ sizes: [...form.sizes, { size: '', stock: 0 }] });
  };

  const updateSize = (idx: number, patch: Partial<ProductSize>) => {
    setF({ sizes: form.sizes.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  };

  const removeSize = (idx: number) => {
    setF({ sizes: form.sizes.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.title_es.trim()) { alert('El título es obligatorio'); return; }
    setSaving(true);
    try {
      const slug = editingId && slugEdited ? toSlug(form.title_es) : toSlug(form.title_es);
      const payload = {
        title_es: form.title_es,
        title_en: form.title_es,
        slug,
        description_es: form.description_es,
        description_en: form.description_es,
        price_mxn: parseFloat(form.price_mxn) || 0,
        shipping_cost_mxn: parseFloat(form.shipping_cost_mxn) || 0,
        category: form.category,
        sizes: form.sizes.filter((s) => s.size.trim() !== ''),
        image_urls: form.image_urls,
        is_active: form.is_active,
      };

      let result;
      if (editingId) {
        result = await supabase.from('products').update(payload).eq('id', editingId);
      } else {
        result = await supabase.from('products').insert(payload);
      }

      if (result.error) {
        if (result.error.code === '23505') {
          alert('Ya existe un producto con ese slug. Cambia el título.');
        } else {
          throw result.error;
        }
        setSaving(false);
        return;
      }

      setShowForm(false);
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setConfirmDelete(null);
    loadProducts();
  };

  const sectionIdx = SECTIONS.findIndex((s) => s.id === section);
  const goNext = () => setSection(SECTIONS[Math.min(SECTIONS.length - 1, sectionIdx + 1)].id);
  const goPrev = () => setSection(SECTIONS[Math.max(0, sectionIdx - 1)].id);

  const renderSection = () => {
    switch (section) {
      case 'general':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Título</label>
              <input
                type="text"
                value={form.title_es}
                onChange={(e) => setF({ title_es: e.target.value })}
                placeholder="Ej: Gorra Recorramos México"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
              <textarea
                value={form.description_es}
                onChange={(e) => setF({ description_es: e.target.value })}
                rows={4}
                placeholder="Descripción del producto..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Precio (MXN)</label>
                <input
                  type="number"
                  value={form.price_mxn}
                  onChange={(e) => setF({ price_mxn: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Costo de envío (MXN)</label>
                <input
                  type="number"
                  value={form.shipping_cost_mxn}
                  onChange={(e) => setF({ shipping_cost_mxn: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setF({ category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setF({ is_active: !form.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-orange-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-700">Producto visible para el público</span>
            </label>
          </div>
        );
      case 'images':
        return (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition"
            >
              {uploadingImages ? (
                <><Loader2 size={24} className="animate-spin text-orange-500 mx-auto mb-2" /><p className="text-sm text-gray-500">Subiendo...</p></>
              ) : (
                <><Upload size={24} className="text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Click para subir imágenes</p></>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
            </div>
            {form.image_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {form.image_urls.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute top-1 left-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded">Portada</span>}
                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'inventory':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Tallas y stock</p>
              <button onClick={addSize} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg hover:bg-orange-200 transition">
                <Plus size={14} /> Agregar talla
              </button>
            </div>
            {form.sizes.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <Package size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No hay tallas configuradas. Agrega al menos una.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.sizes.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <input
                      type="text"
                      value={s.size}
                      onChange={(e) => updateSize(idx, { size: e.target.value })}
                      placeholder="Ej: S, M, L, Única"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Stock</label>
                      <input
                        type="number"
                        value={s.stock}
                        onChange={(e) => updateSize(idx, { stock: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                      />
                    </div>
                    <button onClick={() => removeSize(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <ShoppingBag size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Productos</h1>
            <p className="text-sm text-gray-500">Gestiona la tienda de productos oficiales</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay productos todavía. Crea el primero.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Producto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Categoría</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Precio</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Stock</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => {
                const totalStock = (p.sizes || []).reduce((sum, s) => sum + (s.stock || 0), 0);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_urls?.[0] ? (
                          <img src={p.image_urls[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <ImageIcon size={16} className="text-gray-300" />
                          </div>
                        )}
                        <span className="font-semibold text-gray-900 text-sm">{p.title_es}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-600 capitalize">{p.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">${p.price_mxn.toLocaleString('es-MX')}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold ${totalStock === 0 ? 'text-red-500' : totalStock < 10 ? 'text-amber-500' : 'text-green-600'}`}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${p.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-orange-500 transition">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => setConfirmDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">
                {editingId ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Section nav */}
            <div className="flex gap-1 px-6 py-3 border-b border-gray-50">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    section === s.id ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {renderSection()}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                onClick={goPrev}
                disabled={sectionIdx === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              <button
                onClick={goNext}
                disabled={sectionIdx === SECTIONS.length - 1}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="font-black text-gray-900">¿Eliminar producto?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
