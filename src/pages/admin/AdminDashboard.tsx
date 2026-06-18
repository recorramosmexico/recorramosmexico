import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, ClipboardList, DollarSign, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Reservation } from '../../types';

interface Stats {
  totalTours: number;
  totalReservations: number;
  totalRevenue: number;
  thisWeekDepartures: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalTours: 0, totalReservations: 0, totalRevenue: 0, thisWeekDepartures: 0 });
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [toursRes, reservationsRes] = await Promise.all([
        supabase.from('tours').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('reservations').select('*').order('created_at', { ascending: false }),
      ]);

      const reservations = reservationsRes.data || [];
      const today = new Date();
      const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekDepartures = reservations.filter((r) => {
        const dep = new Date(r.departure_date);
        return dep >= today && dep <= weekEnd;
      }).length;

      const revenue = reservations
        .filter((r) => r.payment_status === 'paid')
        .reduce((sum, r) => sum + r.total_price_mxn, 0);

      setStats({
        totalTours: toursRes.count || 0,
        totalReservations: reservations.length,
        totalRevenue: revenue,
        thisWeekDepartures: weekDepartures,
      });
      setRecentReservations(reservations.slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { icon: <Map size={24} className="text-[#E8670A]" />, label: 'Tours activos', value: stats.totalTours, link: '/admin/tours', color: 'bg-orange-50' },
    { icon: <ClipboardList size={24} className="text-blue-600" />, label: 'Total reservas', value: stats.totalReservations, link: '/admin/reservaciones', color: 'bg-blue-50' },
    { icon: <DollarSign size={24} className="text-green-600" />, label: 'Ingresos pagados', value: `$${stats.totalRevenue.toLocaleString('es-MX')}`, link: '/admin/reservaciones', color: 'bg-green-50' },
    { icon: <Calendar size={24} className="text-purple-600" />, label: 'Salidas esta semana', value: stats.thisWeekDepartures, link: '/admin/reservaciones', color: 'bg-purple-50' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    refunded: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    refunded: 'Reembolsado',
    cancelled: 'Cancelado',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de la agencia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className={`w-11 h-11 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-black text-gray-900">
              {loading ? <span className="bg-gray-200 rounded h-7 w-16 block animate-pulse" /> : card.value}
            </p>
            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1 group-hover:text-[#E8670A] transition-colors">
              {card.label} <ChevronRight size={12} />
            </p>
          </Link>
        ))}
      </div>

      {/* Recent Reservations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Reservas recientes</h2>
          <Link to="/admin/reservaciones" className="text-[#E8670A] text-sm font-semibold flex items-center gap-1 hover:underline">
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentReservations.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No hay reservas aún.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Correo</th>
                  <th className="px-6 py-3">Viajeros</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Fecha salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{res.customer_name}</td>
                    <td className="px-6 py-4 text-gray-500">{res.email}</td>
                    <td className="px-6 py-4 text-gray-600">{res.travelers}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">${res.total_price_mxn.toLocaleString('es-MX')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[res.payment_status]}`}>
                        {statusLabels[res.payment_status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{res.departure_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 bg-[#1A1A1A] rounded-2xl p-6 flex items-center gap-4">
        <TrendingUp size={32} className="text-[#E8670A]" />
        <div>
          <p className="text-white font-bold">Tip para crecer</p>
          <p className="text-gray-400 text-sm">Comparte tus tours en Instagram Stories con el enlace al catálogo para aumentar las reservas.</p>
        </div>
      </div>
    </div>
  );
}
