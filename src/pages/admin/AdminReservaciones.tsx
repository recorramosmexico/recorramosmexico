import { useEffect, useState } from 'react';
import { Download, Filter, Trash2, AlertTriangle, Send, Users, CheckCircle, RefreshCw, Ticket, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendEmail } from '../../lib/email';
import type { Reservation, Tour } from '../../types';

type StatusFilter = 'all' | 'pending' | 'deposit_paid' | 'paid' | 'refunded' | 'cancelled';

const STATUS_LABELS: Record<string, string> = {
  pending:      'Pendiente',
  deposit_paid: 'Anticipo Pagado',
  paid:         'Pagado Completo',
  refunded:     'Reembolsado',
  cancelled:    'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending:      'bg-yellow-100 text-yellow-700',
  deposit_paid: 'bg-blue-100 text-blue-700',
  paid:         'bg-green-100 text-green-700',
  refunded:     'bg-sky-100 text-sky-700',
  cancelled:    'bg-red-100 text-red-700',
};

const today = new Date().toISOString().split('T')[0];

export default function AdminReservaciones() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tours, setTours] = useState<Pick<Tour, 'id' | 'title_es'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [tourFilter, setTourFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  // Payment request state
  const [requestingPayId, setRequestingPayId] = useState<string | null>(null);
  const [requestedPayIds, setRequestedPayIds] = useState<Set<string>>(new Set());
  const [bulkRequestConfirm, setBulkRequestConfirm] = useState<string | null>(null);
  const [bulkRequestingDate, setBulkRequestingDate] = useState<string | null>(null);
  const [bulkRequestedDates, setBulkRequestedDates] = useState<Set<string>>(new Set());

  // Sync payment state
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Proof viewer state
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase
        .from('reservations')
        .select('*, tours(title_es, deposit_percentage)')
        .order('created_at', { ascending: false }),
      supabase
        .from('tours')
        .select('id, title_es')
        .eq('is_active', true)
        .order('title_es'),
    ]).then(([resRes, toursRes]) => {
      if (resRes.data) setReservations(resRes.data as Reservation[]);
      if (toursRes.data) setTours(toursRes.data);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('reservations').update({ payment_status: status }).eq('id', id);
    setReservations((prev) =>
      prev.map((r) => r.id === id ? { ...r, payment_status: status as Reservation['payment_status'] } : r)
    );
  };

  const deleteOne = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (!error) setReservations((prev) => prev.filter((r) => r.id !== id));
    setDeleting(false);
    setDeleteId(null);
  };

  const pastIds = reservations.filter((r) => r.departure_date < today).map((r) => r.id);

  const deletePast = async () => {
    setDeleting(true);
    const { error } = await supabase.from('reservations').delete().in('id', pastIds);
    if (!error) setReservations((prev) => prev.filter((r) => r.departure_date >= today));
    setDeleting(false);
    setBulkConfirm(false);
  };

  const syncPayment = async (res: Reservation) => {
    setSyncingId(res.id);
    setSyncResults((prev) => ({ ...prev, [res.id]: { ok: false, msg: '' } }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reservation_id: res.id }),
        },
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? 'Error al sincronizar');

      setSyncResults((prev) => ({
        ...prev,
        [res.id]: { ok: true, msg: data.message },
      }));

      if (data.changed) {
        setReservations((prev) =>
          prev.map((r) => r.id === res.id ? { ...r, payment_status: data.status } : r)
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncResults((prev) => ({ ...prev, [res.id]: { ok: false, msg } }));
    } finally {
      setSyncingId(null);
    }
  };

  const requestBalancePayment = async (res: Reservation) => {
    setRequestingPayId(res.id);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('reservations')
      .update({ balance_payment_requested_at: now })
      .eq('id', res.id);

    if (error) {
      console.error('Error updating balance_payment_requested_at:', error);
      setSyncResults((prev) => ({ ...prev, [res.id]: { ok: false, msg: 'Error al actualizar la reserva' } }));
      setRequestingPayId(null);
      return;
    }

    setReservations((prev) =>
      prev.map((r) => r.id === res.id ? { ...r, balance_payment_requested_at: now } : r)
    );

    const tourTitle = (res.tours as { title_es: string } | undefined)?.title_es ?? 'Tour';
    sendEmail('reservation_balance_request', res.email, {
      customer_name: res.customer_name,
      tour_title: tourTitle,
      departure_date: res.departure_date,
      travelers: String(res.travelers),
      total: String(res.total_price_mxn),
      remaining_balance: String(res.remaining_balance_mxn ?? 0),
    });

    setRequestedPayIds((prev) => new Set([...prev, res.id]));
    setRequestingPayId(null);
    setTimeout(() => setRequestedPayIds((prev) => { const s = new Set(prev); s.delete(res.id); return s; }), 3000);
  };

  const requestBulkBalancePayment = async (departureDate: string) => {
    setBulkRequestingDate(departureDate);
    const targets = reservations.filter(
      (r) => r.departure_date === departureDate && r.payment_status === 'deposit_paid' && !r.balance_payment_requested_at
    );

    const now = new Date().toISOString();
    const ids = targets.map((r) => r.id);

    const { error } = await supabase
      .from('reservations')
      .update({ balance_payment_requested_at: now })
      .in('id', ids);

    if (error) {
      console.error('Error updating bulk balance_payment_requested_at:', error);
      setBulkRequestingDate(null);
      setBulkRequestConfirm(null);
      return;
    }

    for (const res of targets) {
      const tourTitle = (res.tours as { title_es: string } | undefined)?.title_es ?? 'Tour';
      sendEmail('reservation_balance_request', res.email, {
        customer_name: res.customer_name,
        tour_title: tourTitle,
        departure_date: res.departure_date,
        travelers: String(res.travelers),
        total: String(res.total_price_mxn),
        remaining_balance: String(res.remaining_balance_mxn ?? 0),
      });
    }

    setReservations((prev) =>
      prev.map((r) => ids.includes(r.id) ? { ...r, balance_payment_requested_at: now } : r)
    );

    setBulkRequestingDate(null);
    setBulkRequestedDates((prev) => new Set([...prev, departureDate]));
    setBulkRequestConfirm(null);
    setTimeout(() => setBulkRequestedDates((prev) => { const s = new Set(prev); s.delete(departureDate); return s; }), 4000);
  };

  const bulkableDates = [...new Set(
    reservations
      .filter((r) => r.payment_status === 'deposit_paid' && !r.balance_payment_requested_at)
      .map((r) => r.departure_date)
  )];

  const countByDate = (date: string) =>
    reservations.filter((r) => r.departure_date === date && r.payment_status === 'deposit_paid' && !r.balance_payment_requested_at).length;

  const filtered = reservations.filter((r) => {
    const matchStatus = filter === 'all' || r.payment_status === filter;
    const matchTour = tourFilter === 'all' || r.tour_id === tourFilter;
    const matchSearch = !search ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      (r.reservation_number?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchStatus && matchTour && matchSearch;
  });

  const selectedTourName = tourFilter !== 'all'
    ? tours.find((t) => t.id === tourFilter)?.title_es ?? ''
    : '';

  const exportCsv = () => {
    const headers = ['No. Reserva', 'Tour', 'Nombre', 'Email', 'Teléfono', 'Viajeros', 'Fecha salida', 'Total', 'Anticipo', 'Saldo', 'Estado', 'Metodo pago', 'Fecha creación'];
    const rows = filtered.map((r) => [
      r.reservation_number ?? '—',
      (r.tours as { title_es: string } | undefined)?.title_es ?? '—',
      r.customer_name, r.email, r.phone, r.travelers, r.departure_date,
      `$${r.total_price_mxn}`,
      r.deposit_amount_mxn != null ? `$${r.deposit_amount_mxn}` : '—',
      r.remaining_balance_mxn != null ? `$${r.remaining_balance_mxn}` : '—',
      STATUS_LABELS[r.payment_status] ?? r.payment_status,
      r.payment_method_type ?? '—',
      r.created_at,
    ]);
    const csv = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = selectedTourName
      ? `-${selectedTourName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
      : '';
    a.download = `reservaciones${suffix}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Reservaciones</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} de {reservations.length} reservaciones</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {pastIds.length > 0 && (
            <button
              onClick={() => setBulkConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm"
            >
              <Trash2 size={15} />
              Eliminar pasadas ({pastIds.length})
            </button>
          )}
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            <Download size={16} />
            {selectedTourName ? `CSV — ${selectedTourName}` : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Bulk payment request banners */}
      {bulkableDates.length > 0 && (
        <div className="mb-6 space-y-2">
          {bulkableDates.map((date) => {
            const count = countByDate(date);
            const done = bulkRequestedDates.has(date);
            const isLoading = bulkRequestingDate === date;
            return (
              <div key={date} className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users size={17} className="text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      {count} viajero{count !== 1 ? 's' : ''} con anticipo pagado — salida {date}
                    </p>
                    <p className="text-xs text-blue-600">Aún no se ha solicitado el pago del saldo a ninguno.</p>
                  </div>
                </div>
                <button
                  onClick={() => setBulkRequestConfirm(date)}
                  disabled={done || isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                    done
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                  }`}
                >
                  {done ? <><CheckCircle size={14} /> Enviado</> : isLoading ? 'Enviando...' : <><Send size={14} /> Solicitar pago masivo</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nombre, email o No. reserva..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 bg-white w-64"
          />
        </div>

        {/* Tour filter */}
        <select
          value={tourFilter}
          onChange={(e) => setTourFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 bg-white text-gray-700"
        >
          <option value="all">Todos los tours</option>
          {tours.map((t) => (
            <option key={t.id} value={t.id}>{t.title_es}</option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'deposit_paid', 'paid', 'refunded', 'cancelled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filter === s ? 'bg-[#E8670A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#E8670A]'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-gray-400">No hay reservaciones con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3">No. / Tour</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3 text-center">Viajeros</th>
                  <th className="px-4 py-3">Fecha salida</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Anticipo</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((res) => {
                  const isPast = res.departure_date < today;
                  const isDepositPaid = res.payment_status === 'deposit_paid';
                  const balanceRequested = !!res.balance_payment_requested_at;
                  const justRequested = requestedPayIds.has(res.id);
                  const isRequesting = requestingPayId === res.id;
                  const tourTitle = (res.tours as { title_es: string } | undefined)?.title_es;

                  return (
                    <tr key={res.id} className={`hover:bg-gray-50 ${isPast ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-4 max-w-[180px]">
                        {res.reservation_number ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Ticket size={12} className="text-green-500 flex-shrink-0" />
                            <span className="font-mono text-xs font-bold text-green-700 tracking-wider">{res.reservation_number}</span>
                          </div>
                        ) : null}
                        {tourTitle ? (
                          <p className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2">{tourTitle}</p>
                        ) : (
                          <span className="text-xs text-gray-300 italic">Sin tour</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 whitespace-nowrap">{res.customer_name}</p>
                        <p className="text-gray-400 text-xs">{res.email}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{res.phone}</td>
                      <td className="px-4 py-4 text-gray-600 text-center">{res.travelers}</td>
                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {res.departure_date}
                        {isPast && <span className="ml-1.5 text-xs text-gray-400">(pasada)</span>}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-700 whitespace-nowrap">${res.total_price_mxn.toLocaleString('es-MX')}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {res.deposit_amount_mxn != null ? (
                          <span className="text-[#E8670A] font-semibold">
                            ${res.deposit_amount_mxn.toLocaleString('es-MX')}
                            <span className="text-xs text-gray-400 font-normal ml-1">({res.deposit_percentage_applied}%)</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {res.remaining_balance_mxn != null ? (
                          <div>
                            <span className={`font-semibold ${res.payment_status === 'paid' ? 'text-green-600' : 'text-gray-700'}`}>
                              ${res.remaining_balance_mxn.toLocaleString('es-MX')}
                            </span>
                            {balanceRequested && res.payment_status !== 'paid' && (
                              <span className="block text-xs text-blue-500 mt-0.5">Solicitado</span>
                            )}
                            {res.payment_status === 'paid' && (
                              <span className="block text-xs text-green-500 mt-0.5">Pagado</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${STATUS_COLORS[res.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[res.payment_status] ?? res.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={res.payment_status}
                              onChange={(e) => updateStatus(res.id, e.target.value)}
                              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
                            >
                              <option value="pending">Pendiente</option>
                              <option value="deposit_paid">Anticipo Pagado</option>
                              <option value="paid">Pagado Completo</option>
                              <option value="refunded">Reembolsado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>

                            {(res.payment_status === 'pending' || res.payment_status === 'deposit_paid') && res.stripe_session_id && (
                              <button
                                onClick={() => syncPayment(res)}
                                disabled={syncingId === res.id}
                                title="Consultar Stripe y sincronizar estado"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
                              >
                                <RefreshCw size={12} className={syncingId === res.id ? 'animate-spin' : ''} />
                                {syncingId === res.id ? 'Sync...' : 'Sync'}
                              </button>
                            )}

                            {isDepositPaid && !balanceRequested && (
                              <button
                                onClick={() => requestBalancePayment(res)}
                                disabled={isRequesting}
                                title="Solicitar pago de saldo por tarjeta"
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  justRequested
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                }`}
                              >
                                {justRequested ? <><CheckCircle size={12} /> Enviado</> : isRequesting ? '...' : <><Send size={12} /> Solicitar saldo</>}
                              </button>
                            )}

                            {balanceRequested && res.payment_status === 'deposit_paid' && (
                              <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                                <Send size={11} /> Solicitado
                              </span>
                            )}

                            <button
                              onClick={() => setDeleteId(res.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar reserva"
                            >
                              <Trash2 size={14} />
                            </button>
                            {res.payment_proof_url && (
                              <button
                                onClick={() => setProofUrl(res.payment_proof_url)}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver comprobante de pago"
                              >
                                <FileText size={14} />
                              </button>
                            )}
                          </div>

                          {syncResults[res.id]?.msg && (
                            <p className={`text-xs px-2 py-1 rounded-lg ${
                              syncResults[res.id].ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {syncResults[res.id].msg}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Eliminar reserva?</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteOne(deleteId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete past confirmation modal */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Eliminar reservas pasadas?</h3>
                <p className="text-sm text-gray-500">
                  Se eliminarán <strong>{pastIds.length}</strong> reservas cuya fecha de salida ya pasó. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setBulkConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={deletePast}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : `Eliminar ${pastIds.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment proof viewer modal */}
      {proofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setProofUrl(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-4 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Comprobante de Pago</h3>
              <button
                onClick={() => setProofUrl(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-xl bg-gray-50 flex items-center justify-center min-h-[300px]">
              {proofUrl.match(/\.(pdf)$/i) ? (
                <iframe src={proofUrl} className="w-full h-[70vh] rounded-xl" title="Comprobante" />
              ) : (
                <img src={proofUrl} alt="Comprobante de pago" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
              )}
            </div>
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              <Download size={15} /> Abrir en nueva pestaña
            </a>
          </div>
        </div>
      )}

      {/* Bulk balance request confirmation modal */}
      {bulkRequestConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Send size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Solicitar pago masivo?</h3>
                <p className="text-sm text-gray-500">
                  Se enviará un correo de solicitud de pago de saldo a{' '}
                  <strong>{countByDate(bulkRequestConfirm)}</strong> viajero{countByDate(bulkRequestConfirm) !== 1 ? 's' : ''} con salida el <strong>{bulkRequestConfirm}</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setBulkRequestConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => requestBulkBalancePayment(bulkRequestConfirm)}
                disabled={bulkRequestingDate === bulkRequestConfirm}
                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {bulkRequestingDate === bulkRequestConfirm ? 'Enviando...' : 'Enviar solicitudes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
