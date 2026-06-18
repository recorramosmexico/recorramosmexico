import { useEffect, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Reservation } from '../../types';

type StatusFilter = 'all' | 'pending' | 'paid' | 'refunded' | 'cancelled';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  refunded: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminReservaciones() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('reservations')
      .select('*, tours(title_es)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReservations(data);
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('reservations').update({ payment_status: status }).eq('id', id);
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, payment_status: status as Reservation['payment_status'] } : r));
  };

  const filtered = reservations.filter((r) => {
    const matchStatus = filter === 'all' || r.payment_status === filter;
    const matchSearch = !search ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const exportCsv = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Viajeros', 'Fecha salida', 'Total', 'Estado', 'Fecha creación'];
    const rows = filtered.map((r) => [
      r.customer_name, r.email, r.phone, r.travelers, r.departure_date,
      `$${r.total_price_mxn}`, r.payment_status, r.created_at
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservaciones-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Reservaciones</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} reservaciones</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'paid', 'refunded', 'cancelled'] as StatusFilter[]).map((s) => (
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
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Teléfono</th>
                  <th className="px-5 py-3">Viajeros</th>
                  <th className="px-5 py-3">Fecha salida</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Notas</th>
                  <th className="px-5 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{res.customer_name}</p>
                      <p className="text-gray-400 text-xs">{res.email}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{res.phone}</td>
                    <td className="px-5 py-4 text-gray-600">{res.travelers}</td>
                    <td className="px-5 py-4 text-gray-600">{res.departure_date}</td>
                    <td className="px-5 py-4 font-semibold text-[#E8670A]">${res.total_price_mxn.toLocaleString('es-MX')}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[res.payment_status]}`}>
                        {STATUS_LABELS[res.payment_status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs max-w-32 truncate">{res.notes || '—'}</td>
                    <td className="px-5 py-4">
                      <select
                        value={res.payment_status}
                        onChange={(e) => updateStatus(res.id, e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="refunded">Reembolsado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
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
