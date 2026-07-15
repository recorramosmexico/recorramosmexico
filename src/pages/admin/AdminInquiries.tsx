import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { sendEmail } from '../../lib/email';
import {
  MessageSquare, Mail, Phone, Calendar, Trash2, Send, X, ChevronRight, Filter,
} from 'lucide-react';

type InquiryStatus = 'abierto' | 'en_revision' | 'cerrado';
type InquiryType = 'transporte' | 'tour_personalizado' | 'contacto';

interface Inquiry {
  id: string;
  tipo: InquiryType;
  nombre: string;
  email: string;
  telefono: string;
  asunto: string;
  mensaje: string;
  status: InquiryStatus;
  admin_reply: string;
  replied_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; dot: string }> = {
  abierto: { label: 'Abierto', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  en_revision: { label: 'En Revisión', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  cerrado: { label: 'Cerrado', color: 'bg-gray-200 text-gray-600', dot: 'bg-gray-400' },
};

const TYPE_LABELS: Record<InquiryType, string> = {
  transporte: 'Transporte',
  tour_personalizado: 'Tour Personalizado',
  contacto: 'Contacto',
};

const STATUS_OPTIONS: InquiryStatus[] = ['abierto', 'en_revision', 'cerrado'];

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | 'todos'>('todos');
  const [filterType, setFilterType] = useState<InquiryType | 'todos'>('todos');
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('inquiries')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'todos') query = query.eq('status', filterStatus);
    if (filterType !== 'todos') query = query.eq('tipo', filterType);

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setInquiries(data as Inquiry[]);
    }
    setLoading(false);
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const updateStatus = async (id: string, status: InquiryStatus) => {
    setUpdatingStatus(id);
    const { error: updateError } = await supabase
      .from('inquiries')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    }
    setUpdatingStatus(null);
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSendingReply(true);
    setError('');

    const { error: updateError } = await supabase
      .from('inquiries')
      .update({
        admin_reply: replyText.trim(),
        replied_at: new Date().toISOString(),
        status: 'cerrado',
      })
      .eq('id', selected.id);

    if (updateError) {
      setError(updateError.message);
      setSendingReply(false);
      return;
    }

    sendEmail('inquiry_reply', selected.email, {
      nombre: selected.nombre,
      asunto: selected.asunto,
      reply: replyText.trim(),
      mensaje_original: selected.mensaje,
    });

    setInquiries(prev => prev.map(i =>
      i.id === selected.id
        ? { ...i, admin_reply: replyText.trim(), replied_at: new Date().toISOString(), status: 'cerrado' }
        : i
    ));
    setSelected(prev => prev ? {
      ...prev,
      admin_reply: replyText.trim(),
      replied_at: new Date().toISOString(),
      status: 'cerrado',
    } : null);
    setReplyText('');
    setSendingReply(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error: deleteError } = await supabase
      .from('inquiries')
      .update({ is_deleted: true })
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setInquiries(prev => prev.filter(i => i.id !== id));
      if (selected?.id === id) setSelected(null);
    }
    setDeletingId(null);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Cotizaciones y Mensajes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gestiona las solicitudes de los formularios de Servicios y Contacto.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={16} />
          <span>Estado:</span>
        </div>
        {(['todos', ...STATUS_OPTIONS] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === s
                ? 'bg-[#E8670A] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {s === 'todos' ? 'Todos' : STATUS_CONFIG[s].label}
          </button>
        ))}
        <div className="flex items-center gap-2 text-sm text-gray-500 ml-4">
          <span>Tipo:</span>
        </div>
        {(['todos', 'transporte', 'tour_personalizado', 'contacto'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === t
                ? 'bg-[#E8670A] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {t === 'todos' ? 'Todos' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#E8670A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No hay mensajes que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inquiry => {
            const sc = STATUS_CONFIG[inquiry.status];
            return (
              <div
                key={inquiry.id}
                className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {TYPE_LABELS[inquiry.tipo]}
                      </span>
                      {inquiry.replied_at && (
                        <span className="text-xs text-green-600 font-medium">Respondido</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm truncate">{inquiry.nombre}</h3>
                    <p className="text-gray-500 text-sm truncate">{inquiry.asunto || inquiry.mensaje.slice(0, 60)}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {formatDate(inquiry.created_at)}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <Mail size={12} /> {inquiry.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelected(inquiry);
                        setReplyText(inquiry.admin_reply || '');
                      }}
                      className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      Ver detalle <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(inquiry.id)}
                      disabled={deletingId === inquiry.id}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      {deletingId === inquiry.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Detalle de Solicitud</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={updatingStatus === selected.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        selected.status === s
                          ? 'bg-[#E8670A] text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
                  <p className="text-sm text-gray-900 font-medium">{TYPE_LABELS[selected.tipo]}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fecha</label>
                  <p className="text-sm text-gray-900">{formatDate(selected.created_at)}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre</label>
                  <p className="text-sm text-gray-900 font-medium">{selected.nombre}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Teléfono</label>
                  <p className="text-sm text-gray-900">{selected.telefono || '—'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label>
                  <p className="text-sm text-gray-900">{selected.email}</p>
                </div>
                {selected.asunto && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Asunto</label>
                    <p className="text-sm text-gray-900">{selected.asunto}</p>
                  </div>
                )}
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mensaje</label>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selected.mensaje}
                </div>
              </div>

              {/* Respuesta anterior */}
              {selected.admin_reply && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Respuesta enviada {selected.replied_at && `· ${formatDate(selected.replied_at)}`}
                  </label>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selected.admin_reply}
                  </div>
                </div>
              )}

              {/* Formulario de respuesta */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {selected.admin_reply ? 'Nueva respuesta' : 'Responder al usuario'}
                </label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Escribe tu respuesta..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A] resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">
                    Se enviará por correo a <strong>{selected.email}</strong>
                  </p>
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || sendingReply}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8670A] text-white text-sm font-semibold hover:bg-[#c55a05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingReply ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Enviar respuesta
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
