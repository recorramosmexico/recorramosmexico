import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, Eye, EyeOff, Star, X, ChevronRight,
  Upload, Image, Check, AlertCircle, Search, MapPin,
  Globe, Calendar, Users, DollarSign, Clock, List,
  ChevronDown, Map,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Category, ItineraryDay, Tour } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItineraryEntry {
  day: number;
  title_es: string;
  desc_es: string;
}

interface FormData {
  // General
  title_es: string;
  slug: string;
  category_id: string;
  destination: string;
  difficulty: 'low' | 'medium' | 'high';
  meeting_point: string;
  is_active: boolean;
  is_featured: boolean;
  // Content
  description_es: string;
  // Logistics
  price_mxn: string;
  duration_days: string;
  min_participants: string;
  max_capacity: string;
  deposit_percentage: string;
  departure_dates: string[];
  // Includes / Excludes
  includes_es: string[];
  excludes_es: string[];
  // Itinerary
  itinerary: ItineraryEntry[];
  // Images
  image_urls: string[];
}

const EMPTY_FORM: FormData = {
  title_es: '', slug: '', category_id: '', destination: '',
  difficulty: 'medium', meeting_point: '', is_active: true, is_featured: false,
  description_es: '',
  price_mxn: '', duration_days: '', min_participants: '1', max_capacity: '20',
  deposit_percentage: '40',
  departure_dates: [],
  includes_es: [''],
  excludes_es: [''],
  itinerary: [{ day: 1, title_es: '', desc_es: '' }],
  image_urls: [],
};

const SECTIONS = [
  { id: 'general', label: 'Información general', icon: <Map size={16} /> },
  { id: 'content', label: 'Contenido', icon: <Globe size={16} /> },
  { id: 'logistics', label: 'Logística', icon: <Clock size={16} /> },
  { id: 'features', label: 'Incluye / No incluye', icon: <List size={16} /> },
  { id: 'itinerary', label: 'Itinerario', icon: <Calendar size={16} /> },
  { id: 'images', label: 'Imágenes', icon: <Image size={16} /> },
];

const DIFFICULTY_LABELS: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
const DIFFICULTY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const toSlug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [occupancy, setOccupancy] = useState<Record<string, { reserved: number; capacity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [section, setSection] = useState('general');
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [toursRes, catsRes] = await Promise.all([
      supabase.from('tours').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name_es'),
    ]);
    if (toursRes.data) setTours(toursRes.data as Tour[]);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);

    if (toursRes.data) {
      const { data: resv } = await supabase
        .from('reservations')
        .select('tour_id, travelers, payment_status')
        .in('payment_status', ['pending', 'deposit_paid', 'paid']);
      if (resv) {
        const occ: Record<string, { reserved: number; capacity: number }> = {};
        for (const t of toursRes.data as Tour[]) {
          occ[t.id] = { reserved: 0, capacity: t.max_capacity };
        }
        for (const r of resv as { tour_id: string | null; travelers: number }[]) {
          if (r.tour_id && occ[r.tour_id]) {
            occ[r.tour_id].reserved += r.travelers;
          }
        }
        setOccupancy(occ);
      }
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const setF = (patch: Partial<FormData>) => setForm((p) => ({ ...p, ...patch }));

  const openCreate = () => {
    setEditingTour(null);
    setForm(EMPTY_FORM);
    setSection('general');
    setSaveError('');
    setShowForm(true);
  };

  const openEdit = (tour: Tour) => {
    setEditingTour(tour);
    setForm({
      title_es: tour.title_es,
      slug: tour.slug,
      category_id: tour.category_id ?? '',
      destination: tour.destination,
      difficulty: tour.difficulty ?? 'medium',
      meeting_point: tour.meeting_point ?? '',
      is_active: tour.is_active,
      is_featured: tour.is_featured,
      description_es: tour.description_es,
      price_mxn: String(tour.price_mxn),
      duration_days: String(tour.duration_days),
      min_participants: String(tour.min_participants ?? 1),
      max_capacity: String(tour.max_capacity),
      deposit_percentage: String(tour.deposit_percentage ?? 40),
      departure_dates: tour.departure_dates ?? [],
      includes_es: tour.includes_es?.length ? tour.includes_es : [''],
      excludes_es: tour.excludes_es?.length ? tour.excludes_es : [''],
      itinerary: tour.itinerary_es?.length
        ? tour.itinerary_es.map((d) => ({
            day: d.day,
            title_es: d.title,
            desc_es: d.description,
          }))
        : [{ day: 1, title_es: '', desc_es: '' }],
      image_urls: tour.image_urls ?? [],
    });
    setSection('general');
    setSaveError('');
    setShowForm(true);
  };

  const handleTitleEsChange = (value: string) => {
    setForm((p) => ({
      ...p,
      title_es: value,
      slug: p.slug === toSlug(p.title_es) || !p.slug ? toSlug(value) : p.slug,
    }));
  };

  // ── Image upload ────────────────────────────────────────────────────────────

  const uploadImages = async (files: FileList) => {
    setUploadingImages(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const { data, error } = await supabase.storage.from('tour-images').upload(name, file);
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    setForm((p) => ({ ...p, image_urls: [...p.image_urls, ...urls] }));
    setUploadingImages(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) uploadImages(e.dataTransfer.files);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title_es.trim()) { setSaveError('El título en español es obligatorio.'); setSection('general'); return; }
    if (!form.destination.trim()) { setSaveError('El destino es obligatorio.'); setSection('general'); return; }

    setSaving(true);
    setSaveError('');

    const payload = {
      title_es: form.title_es.trim(),
      title_en: form.title_es.trim(),
      slug: form.slug || toSlug(form.title_es),
      category_id: form.category_id || null,
      destination: form.destination.trim(),
      difficulty: form.difficulty,
      meeting_point: form.meeting_point.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      description_es: form.description_es.trim(),
      description_en: form.description_es.trim(),
      price_mxn: parseFloat(form.price_mxn) || 0,
      duration_days: parseInt(form.duration_days) || 1,
      min_participants: parseInt(form.min_participants) || 1,
      max_capacity: parseInt(form.max_capacity) || 20,
      deposit_percentage: Math.min(100, Math.max(10, parseInt(form.deposit_percentage) || 40)),
      departure_dates: form.departure_dates.filter(Boolean),
      includes_es: form.includes_es.filter(Boolean),
      includes_en: form.includes_es.filter(Boolean),
      excludes_es: form.excludes_es.filter(Boolean),
      excludes_en: form.excludes_es.filter(Boolean),
      itinerary_es: form.itinerary.map((d) => ({ day: d.day, title: d.title_es, description: d.desc_es })),
      itinerary_en: form.itinerary.map((d) => ({ day: d.day, title: d.title_es, description: d.desc_es })),
      image_urls: form.image_urls,
    };

    const { error } = editingTour
      ? await supabase.from('tours').update(payload).eq('id', editingTour.id)
      : await supabase.from('tours').insert(payload);

    setSaving(false);

    if (error) {
      setSaveError(error.code === '23505' ? 'Ya existe un tour con ese slug. Cambia el slug o el título.' : error.message);
      return;
    }

    setShowForm(false);
    loadAll();
  };

  // ── Toggle actions ──────────────────────────────────────────────────────────

  const toggleActive = async (tour: Tour) => {
    await supabase.from('tours').update({ is_active: !tour.is_active }).eq('id', tour.id);
    loadAll();
  };

  const toggleFeatured = async (tour: Tour) => {
    await supabase.from('tours').update({ is_featured: !tour.is_featured }).eq('id', tour.id);
    loadAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('tours').delete().eq('id', id);
    setConfirmDelete(null);
    setTours((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const displayed = tours.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title_es.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q);
  });

  // ── Shared styles ───────────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition-colors bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';
  const sectionTitle = (title: string, subtitle?: string) => (
    <div className="mb-5">
      <h3 className="text-base font-black text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );

  // ── Dynamic list helpers ────────────────────────────────────────────────────

  const DynList = ({
    label, items, onChange,
  }: { label: string; items: string[]; onChange: (items: string[]) => void }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items]; next[idx] = e.target.value; onChange(next);
              }}
              className={inputCls}
              placeholder={`Elemento ${idx + 1}`}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#E8670A] hover:text-[#B8520A] transition-colors mt-1"
        >
          <Plus size={14} /> Agregar elemento
        </button>
      </div>
    </div>
  );

  // ── Form sections ───────────────────────────────────────────────────────────

  const renderSection = () => {
    switch (section) {
      case 'general':
        return (
          <div className="space-y-5">
            {sectionTitle('Información General', 'Datos básicos de identificación del tour')}

            {/* Título */}
            <div>
              <label className={labelCls}>Título *</label>
              <input value={form.title_es} onChange={(e) => handleTitleEsChange(e.target.value)}
                placeholder="Ej: Tour al Cañón del Sumidero" className={inputCls} />
            </div>

            {/* Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Slug (URL)</label>
                <input value={form.slug} onChange={(e) => setF({ slug: e.target.value })}
                  placeholder="tour-canon-sumidero" className={`${inputCls} font-mono`} />
                <p className="text-xs text-gray-400 mt-1">Se genera automáticamente desde el título.</p>
              </div>
              <div>
                <label className={labelCls}>Categoría</label>
                <div className="relative">
                  <select value={form.category_id} onChange={(e) => setF({ category_id: e.target.value })}
                    className={`${inputCls} appearance-none pr-10`}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name_es}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Destino + Dificultad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Destino *</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.destination} onChange={(e) => setF({ destination: e.target.value })}
                    placeholder="Chiapas, México" className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Dificultad</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setF({ difficulty: d })}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                        form.difficulty === d
                          ? `${DIFFICULTY_COLORS[d]} border-transparent`
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Punto de encuentro */}
            <div>
              <label className={labelCls}>Punto de encuentro</label>
              <input value={form.meeting_point} onChange={(e) => setF({ meeting_point: e.target.value })}
                placeholder="Ej: Museo de Antropología, CDMX" className={inputCls} />
            </div>

            {/* Estado */}
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-11 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-[#E8670A]' : 'bg-gray-200'}`}
                  onClick={() => setF({ is_active: !form.is_active })}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Publicado</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-11 h-6 rounded-full transition-colors relative ${form.is_featured ? 'bg-[#E8670A]' : 'bg-gray-200'}`}
                  onClick={() => setF({ is_featured: !form.is_featured })}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_featured ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Destacado en inicio</span>
              </label>
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="space-y-5">
            {sectionTitle('Contenido del Tour', 'Descripción del tour')}
            <div>
              <label className={labelCls}>Descripción</label>
              <textarea rows={5} value={form.description_es}
                onChange={(e) => setF({ description_es: e.target.value })}
                placeholder="Describe la experiencia del tour..."
                className={`${inputCls} resize-none`} />
            </div>
          </div>
        );

      case 'logistics':
        return (
          <div className="space-y-5">
            {sectionTitle('Logística', 'Precio, duración y disponibilidad')}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Precio (MXN)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" min="0" value={form.price_mxn}
                    onChange={(e) => setF({ price_mxn: e.target.value })}
                    placeholder="0" className={`${inputCls} pl-8`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Duración (días)</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" min="1" value={form.duration_days}
                    onChange={(e) => setF({ duration_days: e.target.value })}
                    placeholder="1" className={`${inputCls} pl-8`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Mín. participantes</label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" min="1" value={form.min_participants}
                    onChange={(e) => setF({ min_participants: e.target.value })}
                    placeholder="1" className={`${inputCls} pl-8`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Máx. participantes</label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" min="1" value={form.max_capacity}
                    onChange={(e) => setF({ max_capacity: e.target.value })}
                    placeholder="20" className={`${inputCls} pl-8`} />
                </div>
              </div>
            </div>

            {/* Deposit percentage */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className={labelCls}>% Anticipo al reservar</label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-32">
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={form.deposit_percentage}
                        onChange={(e) => setF({ deposit_percentage: e.target.value })}
                        className={`${inputCls} pr-8 text-center font-bold text-[#E8670A]`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={form.deposit_percentage}
                      onChange={(e) => setF({ deposit_percentage: e.target.value })}
                      className="flex-1 accent-[#E8670A]"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    El saldo restante ({100 - (parseInt(form.deposit_percentage) || 40)}%) se cobra en efectivo al abordar. Mínimo 10%.
                  </p>
                </div>
                {form.price_mxn && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500 mb-1">Por viajero</p>
                    <p className="text-sm font-black text-[#E8670A]">
                      ${Math.ceil((parseFloat(form.price_mxn) || 0) * (parseInt(form.deposit_percentage) || 40) / 100).toLocaleString('es-MX')} MXN
                    </p>
                    <p className="text-xs text-gray-400">anticipo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas de salida */}
            <div>
              <label className={labelCls}>Fechas de salida disponibles</label>
              <div className="space-y-2">
                {form.departure_dates.length === 0 && (
                  <p className="text-xs text-gray-400 py-2">No hay fechas. Agrega la primera.</p>
                )}
                {form.departure_dates.map((date, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="date" value={date}
                      onChange={(e) => {
                        const next = [...form.departure_dates]; next[idx] = e.target.value;
                        setF({ departure_dates: next });
                      }}
                      className={inputCls} />
                    <button type="button"
                      onClick={() => setF({ departure_dates: form.departure_dates.filter((_, i) => i !== idx) })}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setF({ departure_dates: [...form.departure_dates, ''] })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#E8670A] hover:text-[#B8520A] transition-colors mt-1"
                >
                  <Plus size={14} /> Agregar fecha
                </button>
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-6">
            {sectionTitle('Incluye / No incluye', 'Lista de características del tour')}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-green-600" />
                  </div>
                  <span className="text-sm font-black text-gray-800">Incluye</span>
                </div>
                <DynList label="Elementos" items={form.includes_es}
                  onChange={(v) => setF({ includes_es: v })} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <X size={11} className="text-red-500" />
                  </div>
                  <span className="text-sm font-black text-gray-800">No incluye</span>
                </div>
                <DynList label="Elementos" items={form.excludes_es}
                  onChange={(v) => setF({ excludes_es: v })} />
              </div>
            </div>
          </div>
        );

      case 'itinerary':
        return (
          <div className="space-y-5">
            {sectionTitle('Itinerario por día', 'Describe las actividades de cada día')}
            {form.itinerary.map((day, idx) => (
              <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-black text-gray-800">Día {day.day}</span>
                  {form.itinerary.length > 1 && (
                    <button type="button"
                      onClick={() => setF({
                        itinerary: form.itinerary.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 })),
                      })}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className={labelCls}>Título</label>
                    <input value={day.title_es}
                      onChange={(e) => {
                        const next = [...form.itinerary]; next[idx] = { ...next[idx], title_es: e.target.value };
                        setF({ itinerary: next });
                      }}
                      placeholder="Ej: Llegada y bienvenida" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Descripción</label>
                    <textarea rows={3} value={day.desc_es}
                      onChange={(e) => {
                        const next = [...form.itinerary]; next[idx] = { ...next[idx], desc_es: e.target.value };
                        setF({ itinerary: next });
                      }}
                      className={`${inputCls} resize-none`} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button"
              onClick={() => setF({
                itinerary: [
                  ...form.itinerary,
                  { day: form.itinerary.length + 1, title_es: '', desc_es: '' },
                ],
              })}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#E8670A]/40 text-[#E8670A] text-sm font-semibold rounded-xl hover:border-[#E8670A] hover:bg-[#E8670A]/5 transition-all w-full justify-center"
            >
              <Plus size={16} /> Agregar día
            </button>
          </div>
        );

      case 'images':
        return (
          <div className="space-y-5">
            {sectionTitle('Imágenes del Tour', 'La primera imagen se mostrará como portada')}

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#E8670A] hover:bg-[#E8670A]/5 transition-all group"
            >
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#E8670A]/10 transition-colors">
                {uploadingImages
                  ? <div className="w-6 h-6 border-2 border-[#E8670A]/40 border-t-[#E8670A] rounded-full animate-spin" />
                  : <Upload size={24} className="text-gray-400 group-hover:text-[#E8670A] transition-colors" />}
              </div>
              <p className="font-semibold text-gray-700 text-sm">
                {uploadingImages ? 'Subiendo imágenes...' : 'Haz clic o arrastra las imágenes aquí'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Máx. 5 MB por imagen</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadImages(e.target.files)}
              />
            </div>

            {/* Preview grid */}
            {form.image_urls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {form.image_urls.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#E8670A] text-white text-xs font-bold rounded-full">
                        Portada
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setF({ image_urls: form.image_urls.filter((_, i) => i !== idx) })}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestión de Tours</h1>
          <p className="text-gray-500 text-sm mt-1">{tours.length} tours en total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors shadow-sm shadow-[#E8670A]/20"
        >
          <Plus size={18} /> Nuevo tour
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar tours por título o destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A]"
        />
      </div>

      {/* Tours table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Map size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">{search ? 'Sin resultados para esa búsqueda.' : 'No hay tours aún.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3.5">Tour</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">Categoría</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Ocupación</th>
                  <th className="px-5 py-3.5 hidden sm:table-cell">Precio</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((tour) => (
                  <tr key={tour.id} className={`hover:bg-gray-50 transition-colors ${!tour.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={tour.image_urls?.[0] || `https://picsum.photos/seed/${tour.slug}/88/88`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight line-clamp-1">{tour.title_es}</p>
                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                            <MapPin size={10} />
                            {tour.destination}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {(tour as Tour & { categories?: Category }).categories ? (
                        <span className="px-2 py-1 bg-orange-50 text-[#E8670A] text-xs font-semibold rounded-lg">
                          {(tour as Tour & { categories?: Category }).categories!.name_es}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {(() => {
                        const o = occupancy[tour.id];
                        if (!o) return <span className="text-gray-300 text-xs">—</span>;
                        const pct = o.capacity > 0 ? Math.round((o.reserved / o.capacity) * 100) : 0;
                        const color = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';
                        const textColor = pct >= 100 ? 'text-red-600' : 'text-gray-600';
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${textColor}`}>{o.reserved}/{o.capacity}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell font-semibold text-[#E8670A]">
                      ${tour.price_mxn.toLocaleString('es-MX')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${tour.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {tour.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {tour.is_featured && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-[#E8670A]">
                            Destacado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActive(tour)}
                          title={tour.is_active ? 'Desactivar' : 'Activar'}
                          className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                          {tour.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button onClick={() => toggleFeatured(tour)} title="Destacado"
                          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${tour.is_featured ? 'text-[#E8670A]' : 'text-gray-400 hover:text-gray-700'}`}>
                          <Star size={15} />
                        </button>
                        <button onClick={() => openEdit(tour)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                          <ChevronRight size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(tour.id)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
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

      {/* ── TOUR FORM MODAL ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-stretch backdrop-blur-sm">
          {/* Sidebar navigation */}
          <div className="hidden md:flex flex-col w-56 bg-[#1A1A1A] py-6 flex-shrink-0">
            <div className="px-5 mb-6">
              <p className="text-white font-black text-sm leading-tight line-clamp-2">
                {form.title_es || 'Nuevo tour'}
              </p>
              <p className="text-gray-500 text-xs mt-1 font-mono truncate">{form.slug || '—'}</p>
            </div>
            <nav className="flex-1 px-3 space-y-0.5">
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                    section === s.id ? 'bg-[#E8670A] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </nav>
            <div className="px-3 mt-4">
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-gray-500 hover:text-white text-xs font-semibold rounded-xl hover:bg-white/5 transition-colors">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>

          {/* Form panel */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
            {/* Header */}
            <div ref={formTopRef} className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {editingTour ? 'Editar tour' : 'Crear nuevo tour'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {SECTIONS.find((s) => s.id === section)?.label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Mobile section selector */}
                <div className="md:hidden">
                  <select value={section} onChange={(e) => setSection(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                    {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex-shrink-0">
                <AlertCircle size={16} className="flex-shrink-0" />
                {saveError}
              </div>
            )}

            {/* Section content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderSection()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-100 flex-shrink-0">
              {/* Section prev/next */}
              <div className="flex gap-2">
                {SECTIONS.findIndex((s) => s.id === section) > 0 && (
                  <button
                    onClick={() => setSection(SECTIONS[SECTIONS.findIndex((s) => s.id === section) - 1].id)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    ← Anterior
                  </button>
                )}
                {SECTIONS.findIndex((s) => s.id === section) < SECTIONS.length - 1 && (
                  <button
                    onClick={() => setSection(SECTIONS[SECTIONS.findIndex((s) => s.id === section) + 1].id)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Siguiente →
                  </button>
                )}
              </div>
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50 shadow-sm shadow-[#E8670A]/20"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {saving ? 'Guardando...' : editingTour ? 'Actualizar tour' : 'Crear tour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">¿Eliminar este tour?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta acción es permanente y no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
                Sí, eliminar
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
