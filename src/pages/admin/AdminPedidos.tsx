import { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, RefreshCw, Truck, X, Eye, Download,
  CreditCard, Banknote, MapPin, RotateCcw, XCircle, Ticket, Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProductOrder } from '../../types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-800' },
  paid:      { label: 'Pagado',       color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado',    color: 'bg-red-100 text-red-800' },
  refunded:  { label: 'Reembolsado',  color: 'bg-sky-100 text-sky-800' },
};

interface OrderWithProduct extends ProductOrder {
  products: { title_es: string; title_en: string; image_urls: string[]; slug: string } | null;
  profiles: { full_name: string; email: string } | null;
}

export default function AdminPedidos() {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [viewProof, setViewProof] = useState<string | null>(null);
  const [trackingModal, setTrackingModal] = useState<OrderWithProduct | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [refundModal, setRefundModal] = useState<OrderWithProduct | null>(null);
  const [refundMethod, setRefundMethod] = useState<'stripe' | 'bank_transfer'>('stripe');
  const [refundLoading, setRefundLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState<OrderWithProduct | null>(null);
  const [deleteModal, setDeleteModal] = useState<OrderWithProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrders = useCallback(() => {
    setLoading(true);
    supabase
      .from('product_orders')
      .select('*, products(title_es, title_en, image_urls, slug), profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as OrderWithProduct[]) ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = orders.filter((o) => {
    const matchesSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.products?.title_es.toLowerCase().includes(search.toLowerCase()) ||
      o.profiles?.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || o.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const adjustStock = async (productId: string, size: string, quantity: number, decrement: boolean) => {
    const { data: product } = await supabase.from('products').select('sizes').eq('id', productId).maybeSingle();
    if (!product?.sizes) return;
    const updatedSizes = (product.sizes as Array<{ size: string; stock: number }>).map((s) =>
      s.size === size
        ? { ...s, stock: decrement ? Math.max(0, s.stock - quantity) : s.stock + quantity }
        : s
    );
    await supabase.from('products').update({ sizes: updatedSizes }).eq('id', productId);
  };

  const updateStatus = async (id: string, status: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    const wasPaid = order.payment_status === 'paid';
    const willBePaid = status === 'paid';

    await supabase.from('product_orders').update({ payment_status: status }).eq('id', id);

    if (!wasPaid && willBePaid && order.product_id && order.size) {
      await adjustStock(order.product_id, order.size, order.quantity || 1, true);
    } else if (wasPaid && !willBePaid && (status === 'cancelled' || status === 'refunded') && order.product_id && order.size) {
      await adjustStock(order.product_id, order.size, order.quantity || 1, false);
    }

    loadOrders();
  };

  const handleSyncPayment = async (order: OrderWithProduct) => {
    setSyncingId(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ order_id: order.id, order_type: 'product' }),
      });
      const result = await res.json();
      if (result.changed) loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const saveTracking = async () => {
    if (!trackingModal) return;
    await supabase.from('product_orders').update({ tracking_number: trackingInput }).eq('id', trackingModal.id);
    setTrackingModal(null);
    setTrackingInput('');
    loadOrders();
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    setRefundLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ order_id: refundModal.id, method: refundMethod }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Refund failed');
      setRefundModal(null);
      loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    await supabase.from('product_orders').delete().eq('id', deleteModal.id);
    setDeleting(false);
    setDeleteModal(null);
    loadOrders();
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    await supabase.from('product_orders').update({ payment_status: 'cancelled' }).eq('id', cancelModal.id);
    // Restore stock
    if (cancelModal.product_id && cancelModal.size) {
      const { data: product } = await supabase.from('products').select('sizes').eq('id', cancelModal.product_id).maybeSingle();
      if (product?.sizes) {
        const updatedSizes = (product.sizes as Array<{ size: string; stock: number }>).map((s) =>
          s.size === cancelModal.size ? { ...s, stock: s.stock + (cancelModal.quantity || 1) } : s
        );
        await supabase.from('products').update({ sizes: updatedSizes }).eq('id', cancelModal.product_id);
      }
    }
    setCancelModal(null);
    loadOrders();
  };

  const exportCSV = () => {
    const headers = ['Orden', 'Producto', 'Cliente', 'Email', 'Talla', 'Cantidad', 'Total', 'Envío', 'Método entrega', 'Estado pago', 'Método pago', 'Guía', 'Fecha'];
    const rows = filtered.map((o) => [
      o.order_number ?? '',
      o.products?.title_es ?? '',
      o.profiles?.full_name ?? '',
      o.profiles?.email ?? '',
      o.size,
      String(o.quantity),
      String(o.total_mxn),
      String(o.shipping_cost_mxn),
      o.delivery_method,
      o.payment_status,
      o.payment_method_type ?? '',
      o.tracking_number ?? '',
      new Date(o.created_at).toLocaleDateString('es-MX'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedidos-productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Pedidos de Productos</h1>
            <p className="text-sm text-gray-500">Gestiona las compras de la tienda oficial</p>
          </div>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por orden, producto o email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${!statusFilter ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            Todos
          </button>
          {Object.entries(STATUS_LABELS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${statusFilter === key ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay pedidos todavía.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Orden</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Producto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Talla/Cant</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Total</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Entrega</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Guía</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o) => {
                const status = STATUS_LABELS[o.payment_status] ?? STATUS_LABELS.pending;
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {o.order_number ? (
                        <div className="flex items-center gap-1.5">
                          <Ticket size={14} className="text-gray-400" />
                          <span className="text-xs font-mono font-bold text-gray-700">{o.order_number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(o.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {o.products?.image_urls?.[0] && (
                          <img src={o.products.image_urls[0]} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-gray-900">{o.products?.title_es ?? 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{o.profiles?.full_name ?? 'N/A'}</p>
                      <p className="text-xs text-gray-400">{o.profiles?.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{o.size || '—'}</p>
                      <p className="text-xs text-gray-400">x{o.quantity}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">${o.total_mxn.toLocaleString('es-MX')}</p>
                      <p className="text-xs text-gray-400">
                        {o.shipping_cost_mxn > 0 ? `+${o.shipping_cost_mxn} envío` : 'sin envío'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {o.delivery_method === 'shipping' ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Truck size={14} className="text-orange-500" /> Envío
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={14} className="text-orange-500" /> CDMX
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                        {o.payment_method_type === 'card' && <CreditCard size={12} className="text-gray-400" />}
                        {o.payment_method_type === 'oxxo' && <Banknote size={12} className="text-gray-400" />}
                        {o.payment_method_type === 'bank_transfer' && <RotateCcw size={12} className="text-gray-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {o.tracking_number ? (
                        <span className="text-xs font-mono text-gray-700">{o.tracking_number}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Sync payment */}
                        {o.payment_status === 'pending' && o.stripe_session_id && (
                          <button onClick={() => handleSyncPayment(o)} disabled={syncingId === o.id} title="Sincronizar pago" className="p-1.5 text-gray-400 hover:text-blue-500 transition">
                            <RefreshCw size={15} className={syncingId === o.id ? 'animate-spin' : ''} />
                          </button>
                        )}
                        {/* View proof */}
                        {o.payment_proof_url && (
                          <button onClick={() => setViewProof(o.payment_proof_url)} title="Ver comprobante" className="p-1.5 text-gray-400 hover:text-blue-500 transition">
                            <Eye size={15} />
                          </button>
                        )}
                        {/* Tracking */}
                        {o.payment_status === 'paid' && o.delivery_method === 'shipping' && (
                          <button onClick={() => { setTrackingModal(o); setTrackingInput(o.tracking_number ?? ''); }} title="Capturar guía" className="p-1.5 text-gray-400 hover:text-orange-500 transition">
                            <Truck size={15} />
                          </button>
                        )}
                        {/* Refund */}
                        {o.payment_status === 'paid' && (
                          <button onClick={() => setRefundModal(o)} title="Reembolsar" className="p-1.5 text-gray-400 hover:text-sky-500 transition">
                            <RotateCcw size={15} />
                          </button>
                        )}
                        {/* Cancel */}
                        {o.payment_status === 'pending' && (
                          <button onClick={() => setCancelModal(o)} title="Cancelar" className="p-1.5 text-gray-400 hover:text-red-500 transition">
                            <XCircle size={15} />
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => setDeleteModal(o)} title="Eliminar pedido" className="p-1.5 text-gray-400 hover:text-red-600 transition">
                          <Trash2 size={15} />
                        </button>
                        {/* Status dropdown */}
                        <select
                          value={o.payment_status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="paid">Pagado</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="refunded">Reembolsado</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Proof viewer modal */}
      {viewProof && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewProof(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Comprobante de pago</h3>
              <button onClick={() => setViewProof(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewProof.endsWith('.pdf') ? (
                <iframe src={viewProof} title="Comprobante" className="w-full h-[70vh]" />
              ) : (
                <img src={viewProof} alt="Comprobante" className="w-full h-auto rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracking modal */}
      {trackingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setTrackingModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Truck size={20} className="text-orange-600" />
              </div>
              <h3 className="font-black text-gray-900">Guía de rastreo</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Orden: <span className="font-mono font-bold">{trackingModal.order_number ?? trackingModal.id.slice(0, 8)}</span>
            </p>
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Número de guía"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setTrackingModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={saveTracking} className="flex-1 px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition">
                Guardar guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRefundModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                <RotateCcw size={20} className="text-sky-600" />
              </div>
              <h3 className="font-black text-gray-900">Reembolsar pedido</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Orden: <span className="font-mono font-bold">{refundModal.order_number ?? refundModal.id.slice(0, 8)}</span> — ${refundModal.total_mxn.toLocaleString('es-MX')} MXN
            </p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => setRefundMethod('stripe')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${refundMethod === 'stripe' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <CreditCard size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Reembolso vía Stripe</p>
                  <p className="text-xs text-gray-500">Devuelve el dinero al método de pago original</p>
                </div>
              </button>
              <button
                onClick={() => setRefundMethod('bank_transfer')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${refundMethod === 'bank_transfer' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Banknote size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Reembolso vía transferencia</p>
                  <p className="text-xs text-gray-500">Marca como reembolsado (transferencia manual)</p>
                </div>
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleRefund} disabled={refundLoading} className="flex-1 px-4 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 disabled:opacity-50 transition">
                {refundLoading ? 'Procesando...' : 'Reembolsar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Eliminar pedido</h3>
                <p className="text-xs text-gray-500 font-mono">{deleteModal.order_number ?? deleteModal.id.slice(0, 8)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Esta acción es <span className="font-semibold text-red-600">permanente e irreversible</span>. El pedido se eliminará completamente del sistema.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCancelModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
              <h3 className="font-black text-gray-900">¿Cancelar pedido?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              El pedido se marcará como cancelado y el stock se restaurará.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(null)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                No
              </button>
              <button onClick={handleCancel} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition">
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
