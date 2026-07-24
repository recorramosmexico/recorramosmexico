import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays, MapPin, Users, CreditCard, LogOut, Clock, User, Phone,
  Mail, Save, CheckCircle, CreditCard as Edit2, AlertTriangle, Banknote,
  Building2, Wallet, ArrowRight, Calendar, RefreshCw, Upload, FileCheck, Loader2, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useSEO } from '../hooks/useSEO';

const EXPIRY_HOURS = 72;

interface Reservation {
  id: string;
  created_at: string;
  customer_name: string;
  email: string;
  phone: string;
  departure_date: string;
  travelers: number;
  total_price_mxn: number;
  payment_status: 'pending' | 'deposit_paid' | 'paid' | 'refunded' | 'cancelled';
  payment_method_type: 'card' | 'oxxo' | 'bank_transfer' | null;
  deposit_percentage_applied: number | null;
  deposit_amount_mxn: number | null;
  remaining_balance_mxn: number | null;
  balance_payment_requested_at: string | null;
  notes: string;
  confirmation_token: string | null;
  payment_proof_url: string | null;
  tours: { title_es: string; title_en: string; destination: string; image_urls: string[] } | null;
}

interface Profile {
  full_name: string;
  phone: string;
  birth_date: string;
  sex: string;
}

type Tab = 'reservations' | 'profile';
type PaymentMethod = 'card' | 'oxxo' | 'bank_transfer';

function hoursElapsed(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

function hoursRemaining(createdAt: string): number {
  return Math.max(0, EXPIRY_HOURS - hoursElapsed(createdAt));
}

function formatTimeRemaining(hours: number, lang: string): string {
  if (hours <= 0) return lang === 'en' ? 'Expired' : 'Expirado';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return lang === 'en' ? `${mins} min remaining` : `${mins} min restantes`;
  }
  const h = Math.floor(hours);
  return lang === 'en' ? `${h} h remaining` : `${h} h restantes`;
}

export default function MiCuenta() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useSEO({
    title: 'Mi Cuenta',
    description: 'Gestiona tus reservaciones y perfil en Recorramos México.',
    path: '/mi-cuenta',
    noindex: true,
  });

  const [activeTab, setActiveTab] = useState<Tab>('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [refreshingRes, setRefreshingRes] = useState(false);

  const [profile, setProfile] = useState<Profile>({ full_name: '', phone: '', birth_date: '', sex: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [expandedPayId, setExpandedPayId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [proofUploadingId, setProofUploadingId] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending:      { label: lang === 'en' ? 'Pending'        : 'Pendiente',       color: 'bg-yellow-100 text-yellow-800' },
    deposit_paid: { label: lang === 'en' ? 'Deposit Paid'   : 'Anticipo Pagado', color: 'bg-blue-100 text-blue-800' },
    paid:         { label: lang === 'en' ? 'Fully Paid'     : 'Pagado Completo', color: 'bg-green-100 text-green-800' },
    refunded:     { label: lang === 'en' ? 'Refunded'       : 'Reembolsado',     color: 'bg-sky-100 text-sky-800' },
    cancelled:    { label: lang === 'en' ? 'Cancelled'      : 'Cancelado',       color: 'bg-red-100 text-red-800' },
    expired:      { label: lang === 'en' ? 'Expired'        : 'Expirado',        color: 'bg-red-100 text-red-800' },
  };

  const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'card',          label: lang === 'en' ? 'Credit / Debit Card' : 'Tarjeta de crédito / débito', icon: <CreditCard size={16} /> },
    { id: 'oxxo',          label: 'OXXO',                                                                 icon: <Banknote size={16} /> },
    { id: 'bank_transfer', label: lang === 'en' ? 'Bank Transfer (SPEI)' : 'Transferencia bancaria (SPEI)', icon: <Building2 size={16} /> },
  ];

  const fetchReservations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoadingRes(true);
    else setRefreshingRes(true);
    const { data } = await supabase
      .from('reservations')
      .select('*, tours(title_es, title_en, destination, image_urls)')
      .eq('email', user.email)
      .order('created_at', { ascending: false });
    setReservations((data as Reservation[]) ?? []);
    if (!silent) setLoadingRes(false);
    else setRefreshingRes(false);
  }, [user]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Silently re-fetch when user returns to the tab so admin changes are reflected
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && activeTab === 'reservations') {
        fetchReservations(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchReservations, activeTab]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, phone, birth_date, sex')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile({
          full_name: data?.full_name || user.user_metadata?.full_name || '',
          phone: data?.phone || '',
          birth_date: data?.birth_date || '',
          sex: data?.sex || '',
        });
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileError('');
    setProfileSaved(false);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        birth_date: profile.birth_date || null,
        sex: profile.sex || null,
      });

    setSavingProfile(false);
    if (error) {
      setProfileError(lang === 'en' ? 'Error saving profile. Try again.' : 'Error al guardar el perfil. Intenta de nuevo.');
    } else {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCompletePayment = async (res: Reservation, mode: 'pending' | 'balance') => {
    setCheckoutError(null);
    setCheckoutLoadingId(res.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(lang === 'en' ? 'Session expired. Please sign in again.' : 'Sesión expirada. Inicia sesión de nuevo.');

      const tourTitle = res.tours
        ? (lang === 'en' ? res.tours.title_en : res.tours.title_es) || res.tours.title_es
        : 'Tour';

      const origin = window.location.origin;
      const isBalance = mode === 'balance';
      const amountMxn = isBalance
        ? (res.remaining_balance_mxn ?? res.total_price_mxn)
        : (res.deposit_amount_mxn ?? res.total_price_mxn);

      const productName = isBalance
        ? `${tourTitle} — ${lang === 'en' ? 'Balance payment' : 'Pago de saldo'}`
        : tourTitle;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            unit_amount: Math.round(amountMxn * 100),
            quantity: 1,
            product_name: productName,
            success_url: `${origin}/success?reservation_id=${res.id}&method=${selectedMethod}`,
            cancel_url: `${origin}/mi-cuenta`,
            reservation_id: res.id,
            payment_method: selectedMethod,
            payment_type: isBalance ? 'balance' : 'full',
          }),
        },
      );

      const json = await response.json();
      if (!response.ok || !json.url) {
        throw new Error(json.error || (lang === 'en' ? 'Could not create payment session.' : 'No se pudo crear la sesión de pago.'));
      }

      window.location.href = json.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCheckoutError(msg);
      setCheckoutLoadingId(null);
    }
  };

  const handleUploadProof = async (res: Reservation, file: File) => {
    setProofError(null);
    setProofUploadingId(res.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(lang === 'en' ? 'Session expired. Please sign in again.' : 'Sesion expirada. Inicia sesion de nuevo.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${res.id}-${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      if (uploadErr) throw new Error(lang === 'en' ? 'Error uploading proof.' : 'Error al subir comprobante.');
      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
      const proofUrl = urlData.publicUrl;
      const { error: updateErr } = await supabase
        .from('reservations')
        .update({ payment_proof_url: proofUrl })
        .eq('id', res.id);
      if (updateErr) throw new Error(lang === 'en' ? 'Error saving proof URL.' : 'Error al guardar el comprobante.');
      const tourTitle = res.tours
        ? (lang === 'en' ? res.tours.title_en : res.tours.title_es) || res.tours.title_es
        : 'Tour';
      const confirmUrl = res.confirmation_token
        ? `${window.location.origin}/confirmar-pago?token=${res.confirmation_token}`
        : null;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'reservation_admin_proof',
          to: 'contacto@recorramosmexico.com.mx',
          data: {
            tour_title: tourTitle,
            customer_name: res.customer_name || '',
            email: res.email || user?.email || '',
            phone: res.phone || '',
            departure_date: res.departure_date,
            travelers: String(res.travelers),
            total: String(res.total_price_mxn),
            deposit_amount: String(res.deposit_amount_mxn ?? 0),
            deposit_percentage: String(res.deposit_percentage_applied ?? 40),
            payment_proof_url: proofUrl,
            confirm_url: confirmUrl || '',
          },
        }),
      });
      await fetchReservations(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProofError(msg);
    } finally {
      setProofUploadingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-[#1A1A1A] py-12 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover border-2 border-[#E8670A]" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#E8670A]/20 flex items-center justify-center border-2 border-[#E8670A]/40">
                <User size={24} className="text-[#E8670A]" />
              </div>
            )}
            <div>
              <p className="text-[#E8670A] text-xs font-semibold uppercase tracking-wider mb-0.5">
                {t('account.title')}
              </p>
              <h1 className="text-xl md:text-2xl font-black text-white leading-tight">{displayName}</h1>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t('account.signOut')}</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto mt-8 flex gap-1 bg-white/10 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'reservations' ? 'bg-[#E8670A] text-white shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'Reservations' : 'Reservaciones'}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'profile' ? 'bg-[#E8670A] text-white shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            {lang === 'en' ? 'My Profile' : 'Mi Perfil'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* ── RESERVATIONS TAB ── */}
        {activeTab === 'reservations' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">{t('account.reservations')}</h2>
              <button
                onClick={() => fetchReservations(true)}
                disabled={refreshingRes}
                title={lang === 'en' ? 'Refresh reservations' : 'Actualizar reservaciones'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshingRes ? 'animate-spin' : ''} />
                {lang === 'en' ? 'Refresh' : 'Actualizar'}
              </button>
            </div>
            {loadingRes ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E8670A]" />
              </div>
            ) : reservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin size={28} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('account.noReservations')}</h3>
                <p className="text-gray-500 text-sm mb-6">{t('account.noReservationsDesc')}</p>
                <button
                  onClick={() => navigate('/tours')}
                  className="px-6 py-3 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors text-sm"
                >
                  {t('account.viewTours')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((res) => {
                  const elapsed = hoursElapsed(res.created_at);
                  const remaining = hoursRemaining(res.created_at);
                  const isClientExpired = res.payment_status === 'pending' && elapsed >= EXPIRY_HOURS;
                  const isPendingPayable = res.payment_status === 'pending' && elapsed < EXPIRY_HOURS;
                  const expiryProgress = Math.min(100, (elapsed / EXPIRY_HOURS) * 100);
                  const isDepositPaid = res.payment_status === 'deposit_paid';
                  const balanceRequested = isDepositPaid && !!res.balance_payment_requested_at;

                  const statusKey = isClientExpired ? 'expired' : res.payment_status;
                  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;

                  const tourImg = res.tours?.image_urls?.[0];
                  const tourTitle = res.tours
                    ? (lang === 'en' ? res.tours.title_en : res.tours.title_es) || res.tours.title_es
                    : t('common.notFound');

                  const isExpanded = expandedPayId === res.id;

                  return (
                    <div key={res.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row">
                        {tourImg && (
                          <img
                            src={tourImg}
                            alt={tourTitle}
                            className="w-full sm:w-40 h-40 sm:h-auto object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-base leading-tight">{tourTitle}</h3>
                              {res.tours?.destination && (
                                <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                                  <MapPin size={12} />
                                  {res.tours.destination}
                                </div>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${status.color}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays size={13} className="text-[#E8670A]" />
                              <span>{formatDate(res.departure_date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users size={13} className="text-[#E8670A]" />
                              <span>
                                {res.travelers} {res.travelers !== 1 ? t('account.travelers') : t('account.traveler')}
                              </span>
                            </div>
                            {res.total_price_mxn > 0 && (
                              <div className="flex items-center gap-1.5">
                                <CreditCard size={13} className="text-[#E8670A]" />
                                <span>${res.total_price_mxn.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX')} MXN</span>
                              </div>
                            )}
                          </div>

                          {/* Deposit / balance breakdown */}
                          {(isDepositPaid || res.payment_status === 'paid') && res.deposit_amount_mxn != null && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="bg-green-50 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 mb-0.5">
                                  {lang === 'en' ? `Deposit paid (${res.deposit_percentage_applied ?? ''}%)` : `Anticipo pagado (${res.deposit_percentage_applied ?? ''}%)`}
                                </p>
                                <p className="text-sm font-bold text-green-700">
                                  ${(res.deposit_amount_mxn ?? 0).toLocaleString('es-MX')} MXN
                                </p>
                              </div>
                              <div className={`rounded-lg px-3 py-2 ${res.payment_status === 'paid' ? 'bg-green-50' : 'bg-orange-50'}`}>
                                <p className="text-xs text-gray-500 mb-0.5">
                                  {res.payment_status === 'paid'
                                    ? (lang === 'en' ? 'Balance paid' : 'Saldo pagado')
                                    : (lang === 'en' ? 'Balance (cash on boarding)' : 'Saldo (efectivo al abordar)')}
                                </p>
                                <p className={`text-sm font-bold ${res.payment_status === 'paid' ? 'text-green-700' : 'text-[#E8670A]'}`}>
                                  ${(res.remaining_balance_mxn ?? 0).toLocaleString('es-MX')} MXN
                                </p>
                              </div>
                            </div>
                          )}

                          {res.notes && (
                            <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{res.notes}</p>
                          )}

                          <div className="flex items-center gap-1 text-gray-400 text-xs mt-3">
                            <Clock size={11} />
                            <span>{t('account.bookedOn')} {formatDate(res.created_at)}</span>
                          </div>

                          {/* ── Pending initial payment (no deposit paid yet) ── */}
                          {isPendingPayable && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center gap-1 text-amber-600 font-medium">
                                  <AlertTriangle size={12} />
                                  <span>
                                    {lang === 'en' ? 'Payment due:' : 'Pago pendiente:'}
                                    {' '}
                                    <span className="font-bold">{formatTimeRemaining(remaining, lang)}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    expiryProgress > 75 ? 'bg-red-400' : expiryProgress > 40 ? 'bg-amber-400' : 'bg-green-400'
                                  }`}
                                  style={{ width: `${expiryProgress}%` }}
                                />
                              </div>

                              {!isExpanded ? (
                                <button
                                  onClick={() => {
                                    setExpandedPayId(res.id);
                                    setSelectedMethod(res.payment_method_type || 'card');
                                    setCheckoutError(null);
                                  }}
                                  className="w-full sm:w-auto px-5 py-2.5 bg-[#E8670A] text-white text-sm font-bold rounded-xl hover:bg-[#B8520A] active:scale-95 transition-all"
                                >
                                  {lang === 'en' ? 'Pay Deposit' : 'Pagar Anticipo'}
                                </button>
                              ) : (
                                <PaymentMethodSelector
                                  lang={lang}
                                  methods={PAYMENT_METHODS}
                                  selected={selectedMethod}
                                  onSelect={setSelectedMethod}
                                  onPay={() => handleCompletePayment(res, 'pending')}
                                  onCancel={() => { setExpandedPayId(null); setCheckoutError(null); }}
                                  loading={checkoutLoadingId === res.id}
                                  error={checkoutError}
                                  label={lang === 'en' ? 'Pay Deposit Now' : 'Pagar Anticipo Ahora'}
                                />
                              )}
                            </div>
                          )}

                          {/* ── Balance payment requested by admin ── */}
                          {balanceRequested && res.payment_status !== 'paid' && (
                            <div className="mt-4">
                              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3">
                                <Wallet size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-blue-800">
                                    {lang === 'en' ? 'Balance payment requested' : 'Se solicitó el pago del saldo'}
                                  </p>
                                  <p className="text-xs text-blue-600 mt-0.5">
                                    {lang === 'en'
                                      ? `Pay $${(res.remaining_balance_mxn ?? 0).toLocaleString('es-MX')} MXN to complete your reservation.`
                                      : `Paga $${(res.remaining_balance_mxn ?? 0).toLocaleString('es-MX')} MXN para completar tu reserva.`}
                                  </p>
                                </div>
                              </div>

                              {!isExpanded ? (
                                <button
                                  onClick={() => {
                                    setExpandedPayId(res.id);
                                    setSelectedMethod('card');
                                    setCheckoutError(null);
                                  }}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-bold rounded-xl hover:bg-black active:scale-95 transition-all"
                                >
                                  <ArrowRight size={15} />
                                  {lang === 'en'
                                    ? `Pay balance $${(res.remaining_balance_mxn ?? 0).toLocaleString('es-MX')} MXN`
                                    : `Pagar saldo $${(res.remaining_balance_mxn ?? 0).toLocaleString('es-MX')} MXN`}
                                </button>
                              ) : (
                                <PaymentMethodSelector
                                  lang={lang}
                                  methods={PAYMENT_METHODS}
                                  selected={selectedMethod}
                                  onSelect={setSelectedMethod}
                                  onPay={() => handleCompletePayment(res, 'balance')}
                                  onCancel={() => { setExpandedPayId(null); setCheckoutError(null); }}
                                  loading={checkoutLoadingId === res.id}
                                  error={checkoutError}
                                  label={lang === 'en' ? 'Pay Balance Now' : 'Pagar Saldo Ahora'}
                                />
                              )}
                            </div>
                          )}

                          {/* ── Bank transfer: upload payment proof ── */}
                          {res.payment_method_type === 'bank_transfer' && res.payment_status === 'pending' && !isClientExpired && (
                            <div className="mt-4">
                              {res.payment_proof_url ? (
                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
                                  <FileCheck size={16} className="text-green-600 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-green-800">
                                      {lang === 'en' ? 'Proof uploaded — pending confirmation' : 'Comprobante enviado — pendiente de confirmacion'}
                                    </p>
                                    <a href={res.payment_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-700 underline mt-1">
                                      <ExternalLink size={12} />
                                      {lang === 'en' ? 'View proof' : 'Ver comprobante'}
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
                                    <Upload size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-bold text-amber-800">
                                        {lang === 'en' ? 'Upload your payment proof' : 'Sube tu comprobante de pago'}
                                      </p>
                                      <p className="text-xs text-amber-700 mt-0.5">
                                        {lang === 'en'
                                          ? 'Upload a photo or PDF of your transfer receipt so we can confirm your reservation.'
                                          : 'Sube una foto o PDF de tu comprobante de transferencia para que confirmemos tu reserva.'}
                                      </p>
                                    </div>
                                  </div>
                                  <label className="cursor-pointer block">
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadProof(res, f);
                                      }}
                                      className="hidden"
                                    />
                                    <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors ${
                                      proofUploadingId === res.id
                                        ? 'border-orange-300 bg-orange-50 cursor-wait'
                                        : 'border-gray-200 hover:border-[#E8670A] hover:bg-orange-50'
                                    }`}>
                                      {proofUploadingId === res.id ? (
                                        <><Loader2 size={18} className="animate-spin text-[#E8670A]" /><span className="text-sm font-semibold text-[#E8670A]">{lang === 'en' ? 'Uploading...' : 'Subiendo...'}</span></>
                                      ) : (
                                        <><Upload size={18} className="text-gray-400" /><span className="text-sm text-gray-600">{lang === 'en' ? 'Choose file (image or PDF)' : 'Elegir archivo (imagen o PDF)'}</span></>
                                      )}
                                    </div>
                                  </label>
                                  {proofError && proofUploadingId === null && (
                                    <p className="text-xs text-red-600 mt-2">{proofError}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Client-side expired notice */}
                          {isClientExpired && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
                              <AlertTriangle size={12} />
                              <span>
                                {lang === 'en'
                                  ? 'This reservation expired and will be cancelled shortly.'
                                  : 'Esta reserva expiró y será cancelada en breve.'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="max-w-xl">
            <h2 className="text-xl font-black text-gray-900 mb-1">
              {lang === 'en' ? 'My Profile' : 'Mi Perfil'}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {lang === 'en'
                ? 'This information is used to pre-fill your reservation forms.'
                : 'Esta información se usa para prellenar tus formularios de reserva.'}
            </p>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Email' : 'Correo electrónico'}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {lang === 'en' ? 'Email cannot be changed here.' : 'El correo no se puede cambiar aquí.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Full Name' : 'Nombre completo'}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder={lang === 'en' ? 'Your full name' : 'Tu nombre completo'}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition"
                  />
                  <Edit2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Phone' : 'Teléfono'}
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+52 55 1234 5678"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition"
                  />
                  <Edit2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-fields="birth-sex">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {lang === 'en' ? 'Date of birth' : 'Fecha de nacimiento'}
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={profile.birth_date}
                      onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {lang === 'en' ? 'Sex' : 'Sexo'}
                  </label>
                  <select
                    value={profile.sex}
                    onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition bg-white"
                  >
                    <option value="">{lang === 'en' ? 'Select...' : 'Seleccionar...'}</option>
                    <option value="male">{lang === 'en' ? 'Male' : 'Masculino'}</option>
                    <option value="female">{lang === 'en' ? 'Female' : 'Femenino'}</option>
                    <option value="other">{lang === 'en' ? 'Other' : 'Otro'}</option>
                    <option value="prefer_not_to_say">{lang === 'en' ? 'Prefer not to say' : 'Prefiero no decir'}</option>
                  </select>
                </div>
              </div>

              {profileError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                  {profileError}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
              >
                {profileSaved ? (
                  <>
                    <CheckCircle size={18} />
                    {lang === 'en' ? 'Saved!' : '¡Guardado!'}
                  </>
                ) : savingProfile ? (
                  lang === 'en' ? 'Saving...' : 'Guardando...'
                ) : (
                  <>
                    <Save size={18} />
                    {lang === 'en' ? 'Save Changes' : 'Guardar Cambios'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PaymentMethodSelectorProps {
  lang: string;
  methods: { id: PaymentMethod; label: string; icon: React.ReactNode }[];
  selected: PaymentMethod;
  onSelect: (m: PaymentMethod) => void;
  onPay: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
  label: string;
}

function PaymentMethodSelector({ lang, methods, selected, onSelect, onPay, onCancel, loading, error, label }: PaymentMethodSelectorProps) {
  return (
    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {lang === 'en' ? 'Select payment method' : 'Selecciona método de pago'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
              selected === m.id
                ? 'border-[#E8670A] bg-white text-[#E8670A] shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {error && !loading && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onPay}
          disabled={loading}
          className="flex-1 py-2.5 bg-[#E8670A] text-white text-sm font-bold rounded-xl hover:bg-[#B8520A] disabled:opacity-60 transition-all"
        >
          {loading ? (lang === 'en' ? 'Redirecting...' : 'Redirigiendo...') : label}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
        >
          {lang === 'en' ? 'Cancel' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
