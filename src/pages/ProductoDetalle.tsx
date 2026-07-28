import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag, ChevronLeft, Package, Truck, MapPin, CreditCard,
  Banknote, Upload, Check, Loader2, AlertTriangle, Minus, Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';
import { useAuth } from '../hooks/useAuth';
import { productSchema } from '../lib/structuredData';
import type { Product } from '../types';

type DeliveryMethod = 'shipping' | 'personal_cdmx';
type PaymentMethod = 'card' | 'oxxo' | 'bank_transfer';

export default function ProductoDetalle() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('shipping');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '', zip: '', references: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankTransferInfo, setBankTransferInfo] = useState<{ orderId: string; total: number } | null>(null);

  useSEO({
    title: product ? (lang === 'en' ? product.title_en : product.title_es) : 'Producto',
    description: product ? (lang === 'en' ? product.description_en : product.description_es) : '',
    path: `/productos/${slug}`,
    image: product?.image_urls?.[0],
    type: 'product',
  });

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as Product | null);
        if (data) {
          const sizes = (data as Product).sizes || [];
          if (sizes.length > 0) setSelectedSize(sizes[0].size);
        }
        setLoading(false);
      });
  }, [slug]);

  // Set JSON-LD after product loads
  useEffect(() => {
    if (product) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(productSchema(product));
      document.head.appendChild(script);
      return () => { document.head.removeChild(script); };
    }
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E8670A]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex justify-center items-center">
        <div className="text-center">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{lang === 'en' ? 'Product not found' : 'Producto no encontrado'}</h2>
          <Link to="/productos" className="text-[#E8670A] font-semibold hover:underline">
            {lang === 'en' ? 'Back to products' : 'Volver a productos'}
          </Link>
        </div>
      </div>
    );
  }

  const title = lang === 'en' ? product.title_en : product.title_es;
  const description = lang === 'en' ? product.description_en : product.description_es;
  const sizes = product.sizes || [];
  const selectedSizeObj = sizes.find((s) => s.size === selectedSize);
  const maxStock = selectedSizeObj?.stock ?? 0;
  const shippingCost = deliveryMethod === 'shipping' ? product.shipping_cost_mxn : 0;
  const subtotal = product.price_mxn * quantity;
  const total = subtotal + shippingCost;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(prev + delta, maxStock || 1)));
  };

  const handleCheckout = async () => {
    setError(null);
    if (!user) {
      navigate('/login');
      return;
    }

    if (deliveryMethod === 'shipping') {
      if (!address.street || !address.city || !address.zip) {
        setError(lang === 'en' ? 'Please fill in your shipping address.' : 'Por favor completa tu dirección de envío.');
        return;
      }
    }

    if (maxStock === 0) {
      setError(lang === 'en' ? 'This size is out of stock.' : 'Esta talla está agotada.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(lang === 'en' ? 'Session expired.' : 'Sesión expirada.');

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('product_orders')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity,
          size: selectedSize,
          unit_price_mxn: product.price_mxn,
          total_mxn: total,
          shipping_cost_mxn: shippingCost,
          delivery_method: deliveryMethod,
          shipping_address: deliveryMethod === 'shipping' ? address : null,
          payment_status: 'pending',
          payment_method_type: paymentMethod,
        })
        .select('id')
        .single();

      if (orderError) throw new Error(orderError.message);
      const orderId = order.id;

      if (paymentMethod === 'bank_transfer') {
        // Send confirmation email to traveler with bank details
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            type: 'product_bank_transfer',
            to: user.email,
            data: { product_title: title, quantity: String(quantity), size: selectedSize, total: String(total), order_id: orderId },
          }),
        });
        // Send notification to admin
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            type: 'product_purchase_admin',
            to: 'contacto@recorramosmexico.com.mx',
            data: {
              product_title: title,
              quantity: String(quantity),
              size: selectedSize,
              total: String(total),
              order_number: orderId.slice(0, 8),
              customer_name: user.user_metadata?.full_name ?? user.email ?? '',
              email: user.email ?? '',
              delivery_method: deliveryMethod,
              payment_method: 'Transferencia bancaria',
            },
          }),
        });
        setBankTransferInfo({ orderId, total });
      } else {
        // Stripe checkout
        const origin = window.location.origin;
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            unit_amount: Math.round(total * 100),
            quantity: 1,
            product_name: `${title} — ${lang === 'en' ? 'Product purchase' : 'Compra de producto'}`,
            success_url: `${origin}/success?order_id=${orderId}&type=product`,
            cancel_url: `${origin}/productos/${product.slug}`,
            order_type: 'product',
            order_id: orderId,
            payment_method: paymentMethod,
            payment_type: 'full',
          }),
        });
        const json = await response.json();
        if (!response.ok || !json.url) throw new Error(json.error || 'Could not create payment session.');
        // Send admin notification for card/oxxo purchases
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            type: 'product_purchase_admin',
            to: 'contacto@recorramosmexico.com.mx',
            data: {
              product_title: title,
              quantity: String(quantity),
              size: selectedSize,
              total: String(total),
              order_number: orderId.slice(0, 8),
              customer_name: user.user_metadata?.full_name ?? user.email ?? '',
              email: user.email ?? '',
              delivery_method: deliveryMethod,
              payment_method: paymentMethod === 'card' ? 'Tarjeta' : 'OXXO',
            },
          }),
        });
        window.location.href = json.url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setSubmitting(false);
    }
  };

  // Bank transfer confirmation screen
  if (bankTransferInfo) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Check size={24} className="text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">
                  {lang === 'en' ? 'Order placed!' : '¡Pedido realizado!'}
                </h1>
                <p className="text-sm text-gray-500">
                  {lang === 'en' ? 'Complete your payment via bank transfer.' : 'Completa tu pago vía transferencia.'}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-amber-900 text-sm mb-3">
                {lang === 'en' ? 'Bank details for transfer' : 'Datos bancarios para transferencia'}
              </h3>
              <div className="space-y-1.5 text-sm text-amber-800">
                <div className="flex justify-between"><span>{lang === 'en' ? 'Bank' : 'Banco'}</span><span className="font-bold">Bancomer (BBVA)</span></div>
                <div className="flex justify-between"><span>{lang === 'en' ? 'Card' : 'Tarjeta'}</span><span className="font-mono font-bold">4152 3141 0698 0256</span></div>
                <div className="flex justify-between"><span>CLABE</span><span className="font-mono font-bold">012180004833647476</span></div>
                <div className="flex justify-between"><span>{lang === 'en' ? 'Account holder' : 'Titular'}</span><span className="font-bold">Trinidad Gil Martínez</span></div>
                <div className="flex justify-between"><span>{lang === 'en' ? 'Concept' : 'Concepto'}</span><span className="font-mono font-bold">{bankTransferInfo.orderId.slice(0, 8)}</span></div>
                <div className="border-t border-amber-200 mt-2 pt-2 flex justify-between">
                  <span className="font-bold">{lang === 'en' ? 'Amount' : 'Monto'}</span>
                  <span className="text-lg font-black">${bankTransferInfo.total.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-xs text-blue-800">
                <AlertTriangle size={14} className="inline mr-1" />
                {lang === 'en'
                  ? 'You have 72 hours to upload your payment proof. After that, the order will be cancelled.'
                  : 'Tienes 72 horas para subir tu comprobante de pago. Después de eso, el pedido será cancelado.'}
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                to="/mi-cuenta"
                className="flex-1 text-center px-5 py-3 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors"
              >
                {lang === 'en' ? 'Upload proof in My Account' : 'Subir comprobante en Mi Cuenta'}
              </Link>
              <Link
                to="/productos"
                className="px-5 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                {lang === 'en' ? 'Continue shopping' : 'Seguir comprando'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/productos" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E8670A] transition-colors mb-6">
          <ChevronLeft size={16} />
          {lang === 'en' ? 'Back to products' : 'Volver a productos'}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {product.image_urls?.[0] ? (
                <img src={product.image_urls[0]} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={48} className="text-gray-300" />
                </div>
              )}
            </div>
            {product.image_urls?.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.image_urls.map((img, i) => (
                  <div key={i} className="aspect-square bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <img src={img} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info + Purchase */}
          <div>
            <p className="text-xs text-[#E8670A] font-semibold uppercase tracking-wider mb-1">{product.category}</p>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">{title}</h1>
            <p className="text-3xl font-black text-gray-900 mb-4">
              ${product.price_mxn.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} <span className="text-base font-normal text-gray-500">MXN</span>
            </p>

            {description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-6">{description}</p>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Size' : 'Talla'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s.size}
                      onClick={() => { setSelectedSize(s.size); setQuantity(1); }}
                      disabled={s.stock === 0}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        selectedSize === s.size
                          ? 'border-[#E8670A] bg-[#E8670A] text-white'
                          : s.stock === 0
                            ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {s.size}
                      {s.stock === 0 && ` (${lang === 'en' ? 'Out' : 'Agotado'})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'en' ? 'Quantity' : 'Cantidad'}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <Minus size={16} />
                </button>
                <span className="text-lg font-bold text-gray-900 w-12 text-center">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxStock}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <Plus size={16} />
                </button>
                {maxStock > 0 && maxStock < 10 && (
                  <span className="text-xs text-amber-600 font-medium ml-2">
                    {lang === 'en' ? `Only ${maxStock} left!` : `¡Solo quedan ${maxStock}!`}
                  </span>
                )}
              </div>
            </div>

            {/* Delivery method */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'en' ? 'Delivery method' : 'Método de entrega'}
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setDeliveryMethod('shipping')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    deliveryMethod === 'shipping' ? 'border-[#E8670A] bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Truck size={18} className={deliveryMethod === 'shipping' ? 'text-[#E8670A]' : 'text-gray-400'} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {lang === 'en' ? 'Shipping' : 'Envío'}
                      {product.shipping_cost_mxn > 0 && (
                        <span className="text-gray-500 font-normal ml-1">+ ${product.shipping_cost_mxn.toLocaleString('es-MX')} MXN</span>
                      )}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setDeliveryMethod('personal_cdmx')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition ${
                    deliveryMethod === 'personal_cdmx' ? 'border-[#E8670A] bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <MapPin size={18} className={deliveryMethod === 'personal_cdmx' ? 'text-[#E8670A]' : 'text-gray-400'} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {lang === 'en' ? 'Personal pickup in CDMX' : 'Entrega personal en CDMX'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lang === 'en' ? 'To be arranged' : 'A acordar'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Shipping address */}
            {deliveryMethod === 'shipping' && (
              <div className="mb-5 bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {lang === 'en' ? 'Shipping address' : 'Dirección de envío'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder={lang === 'en' ? 'Street' : 'Calle'} value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                  <input type="text" placeholder={lang === 'en' ? 'Number' : 'Número'} value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                  <input type="text" placeholder={lang === 'en' ? 'Neighborhood' : 'Colonia'} value={address.neighborhood}
                    onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                  <input type="text" placeholder={lang === 'en' ? 'City' : 'Ciudad'} value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                  <input type="text" placeholder={lang === 'en' ? 'Zip code' : 'Código postal'} value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                  <input type="text" placeholder={lang === 'en' ? 'References (optional)' : 'Referencias (opcional)'} value={address.references}
                    onChange={(e) => setAddress({ ...address, references: e.target.value })}
                    className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30" />
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {lang === 'en' ? 'Payment method' : 'Método de pago'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border transition ${
                    paymentMethod === 'card' ? 'border-[#E8670A] bg-orange-50 text-[#E8670A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <CreditCard size={18} />
                  <span className="text-xs font-semibold">{lang === 'en' ? 'Card' : 'Tarjeta'}</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('oxxo')}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border transition ${
                    paymentMethod === 'oxxo' ? 'border-[#E8670A] bg-orange-50 text-[#E8670A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Banknote size={18} />
                  <span className="text-xs font-semibold">OXXO</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border transition ${
                    paymentMethod === 'bank_transfer' ? 'border-[#E8670A] bg-orange-50 text-[#E8670A]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Upload size={18} />
                  <span className="text-xs font-semibold">{lang === 'en' ? 'Transfer' : 'Transfer'}</span>
                </button>
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{lang === 'en' ? 'Subtotal' : 'Subtotal'}</span>
                <span className="font-semibold text-gray-900">${subtotal.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{lang === 'en' ? 'Shipping' : 'Envío'}</span>
                <span className="font-semibold text-gray-900">
                  {shippingCost === 0 ? (lang === 'en' ? 'Free / Arrange' : 'Gratis / Acordar') : `$${shippingCost.toLocaleString('es-MX')} MXN`}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-bold text-gray-900">{lang === 'en' ? 'Total' : 'Total'}</span>
                <span className="text-xl font-black text-[#E8670A]">${total.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 mb-4">
                {error}
              </div>
            )}

            {!user && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-800">
                  {lang === 'en' ? 'Please sign in to purchase.' : 'Por favor inicia sesión para comprar.'}
                </p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={submitting || !user || maxStock === 0}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" />{lang === 'en' ? 'Processing...' : 'Procesando...'}</>
              ) : (
                <><ShoppingBag size={18} />{lang === 'en' ? 'Buy now' : 'Comprar ahora'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
