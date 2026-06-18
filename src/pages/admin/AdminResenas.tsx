import { useEffect, useState } from 'react';
import { Check, X, Trash2, Plus, CreditCard as Edit2, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Review, Tour } from '../../types';
import StarRating from '../../components/ui/StarRating';

interface FormData {
  customer_name: string;
  rating: number;
  comment_es: string;
  comment_en: string;
  tour_id: string;
  is_approved: boolean;
}

const EMPTY_FORM: FormData = {
  customer_name: '',
  rating: 5,
  comment_es: '',
  comment_en: '',
  tour_id: '',
  is_approved: true,
};

export default function AdminResenas() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    const [reviewsRes, toursRes] = await Promise.all([
      supabase.from('reviews').select('*, tours(title_es)').order('created_at', { ascending: false }),
      supabase.from('tours').select('id, title_es').eq('is_active', true).order('title_es'),
    ]);
    if (reviewsRes.data) setReviews(reviewsRes.data);
    if (toursRes.data) setTours(toursRes.data as Tour[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (review: Review) => {
    setEditing(review);
    setForm({
      customer_name: review.customer_name,
      rating: review.rating,
      comment_es: review.comment_es,
      comment_en: review.comment_en,
      tour_id: review.tour_id || '',
      is_approved: review.is_approved,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.customer_name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.comment_es.trim()) { setError('El comentario en español es obligatorio.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      customer_name: form.customer_name.trim(),
      rating: form.rating,
      comment_es: form.comment_es.trim(),
      comment_en: form.comment_en.trim() || form.comment_es.trim(),
      tour_id: form.tour_id || null,
      is_approved: form.is_approved,
    };

    const { error: err } = editing
      ? await supabase.from('reviews').update(payload).eq('id', editing.id)
      : await supabase.from('reviews').insert(payload);

    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false);
    load();
  };

  const approve = async (id: string) => {
    await supabase.from('reviews').update({ is_approved: true }).eq('id', id);
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_approved: true } : r));
  };

  const reject = async (id: string) => {
    await supabase.from('reviews').update({ is_approved: false }).eq('id', id);
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_approved: false } : r));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id);
    setConfirmDelete(null);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = reviews.filter((r) => {
    if (filter === 'approved') return r.is_approved;
    if (filter === 'pending') return !r.is_approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.is_approved).length;

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestión de Reseñas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingCount > 0 ? (
              <span className="text-amber-600 font-semibold">{pendingCount} reseñas pendientes de aprobar</span>
            ) : (
              'Todas las reseñas están al día'
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors shadow-sm shadow-[#E8670A]/20"
        >
          <Plus size={18} />
          Nueva reseña
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { value: 'pending', label: `Pendientes (${pendingCount})` },
          { value: 'approved', label: 'Aprobadas' },
          { value: 'all', label: 'Todas' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value as typeof filter)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === value ? 'bg-[#E8670A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#E8670A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">No hay reseñas con este filtro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border ${review.is_approved ? 'border-green-200' : 'border-amber-200'} transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-[#E8670A]/10 rounded-full flex items-center justify-center text-[#E8670A] font-bold text-sm flex-shrink-0">
                      {review.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{review.customer_name}</p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} size={12} />
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    </div>
                    <span className={`ml-auto px-2.5 py-1 text-xs font-semibold rounded-full ${review.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {review.is_approved ? 'Aprobada' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed ml-12">"{review.comment_es}"</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(review)}
                    className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={15} />
                  </button>
                  {!review.is_approved ? (
                    <button
                      onClick={() => approve(review.id)}
                      className="w-9 h-9 flex items-center justify-center bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                      title="Aprobar"
                    >
                      <Check size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => reject(review.id)}
                      className="w-9 h-9 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                      title="Desaprobar"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(review.id)}
                    className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">
                {editing ? 'Editar reseña' : 'Nueva reseña'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre del cliente *</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                    placeholder="Ej: María García"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Tour relacionado</label>
                  <select
                    value={form.tour_id}
                    onChange={(e) => setForm((p) => ({ ...p, tour_id: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Sin tour específico</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>{t.title_es}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Calificación *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, rating: star }))}
                      className="focus:outline-none"
                    >
                      <Star
                        size={28}
                        className={star <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 ml-1">{form.rating}/5</span>
                </div>
              </div>

              <div>
                <label className={labelCls}>Comentario en español *</label>
                <textarea
                  rows={3}
                  value={form.comment_es}
                  onChange={(e) => setForm((p) => ({ ...p, comment_es: e.target.value }))}
                  placeholder="Experiencia del viajero..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Comentario en inglés</label>
                <textarea
                  rows={3}
                  value={form.comment_en}
                  onChange={(e) => setForm((p) => ({ ...p, comment_en: e.target.value }))}
                  placeholder="Traveler experience... (optional, defaults to Spanish)"
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_approved: !p.is_approved }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_approved ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_approved ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700 font-medium">
                  {form.is_approved ? 'Visible en la web (aprobada)' : 'Oculta (pendiente)'}
                </span>
              </div>
            </div>

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
                {saving ? 'Guardando...' : 'Guardar reseña'}
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
            <h3 className="text-lg font-black text-gray-900 mb-2">¿Eliminar reseña?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
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
