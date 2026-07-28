import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, Eye, EyeOff, Mail, Send, Image, LogIn, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SettingRow { key: string; value: string }

const SETTING_KEYS = ['smtp2go_api_key', 'from_email', 'from_name', 'admin_email', 'logo_url'] as const;
type SettingKey = typeof SETTING_KEYS[number];

const LABELS: Record<SettingKey, { label: string; hint: string; type: 'text' | 'email' | 'password' | 'url' }> = {
  smtp2go_api_key: { label: 'SMTP2GO API Key', hint: 'Clave de API para el envío de correos.', type: 'password' },
  from_email:      { label: 'Correo remitente', hint: 'Dirección desde donde se envían los emails (debe estar verificada en SMTP2GO).', type: 'email' },
  from_name:       { label: 'Nombre remitente', hint: 'Nombre que aparece como emisor en los correos.', type: 'text' },
  admin_email:     { label: 'Email de notificaciones', hint: 'A este correo llegan los avisos de contacto y reservas.', type: 'email' },
  logo_url:        { label: 'URL del logo (para emails)', hint: 'URL absoluta de la imagen que aparece en el encabezado de los correos. Ej: https://tudominio.com/Logo_Naranja.jpeg', type: 'url' },
};

const BOOLEAN_KEYS = ['google_auth_enabled', 'products_section_enabled'] as const;
type BooleanKey = typeof BOOLEAN_KEYS[number];

const BOOLEAN_LABELS: Record<BooleanKey, { label: string; hint: string }> = {
  google_auth_enabled: { label: 'Inicio de sesión con Google', hint: 'Activa o desactiva el botón "Continuar con Google" en las pantallas de inicio de sesión y registro.' },
  products_section_enabled: { label: 'Productos Oficiales', hint: 'Activa o desactiva el enlace a la tienda de productos en el menú del sitio. Aunque esté desactivado, la página sigue siendo accesible vía URL directa.' },
};

export default function AdminConfiguracion() {
  const [values, setValues] = useState<Record<SettingKey, string>>({
    smtp2go_api_key: '',
    from_email: '',
    from_name: '',
    admin_email: '',
    logo_url: '',
  });
  const [boolValues, setBoolValues] = useState<Record<BooleanKey, boolean>>({ google_auth_enabled: true, products_section_enabled: false });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', [...SETTING_KEYS, ...BOOLEAN_KEYS] as unknown as string[])
      .then(({ data }) => {
        if (data) {
          const map: Partial<Record<SettingKey, string>> = {};
          const boolMap: Partial<Record<BooleanKey, boolean>> = {};
          (data as SettingRow[]).forEach((r) => {
            if (SETTING_KEYS.includes(r.key as SettingKey)) {
              map[r.key as SettingKey] = r.value;
            } else if (BOOLEAN_KEYS.includes(r.key as BooleanKey)) {
              boolMap[r.key as BooleanKey] = r.value === 'true';
            }
          });
          setValues((prev) => ({ ...prev, ...map }));
          setBoolValues((prev) => ({ ...prev, ...boolMap }));
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    const textUpserts = SETTING_KEYS.map((key) => ({ key, value: values[key] ?? '', updated_at: new Date().toISOString() }));
    const boolUpserts = BOOLEAN_KEYS.map((key) => ({ key, value: boolValues[key] ? 'true' : 'false', updated_at: new Date().toISOString() }));
    const { error: err } = await supabase.from('settings').upsert([...textUpserts, ...boolUpserts]);

    setSaving(false);
    if (err) {
      setError('Error al guardar: ' + err.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleTestEmail = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            type: 'contact',
            to: values.admin_email,
            data: {
              name: 'Admin Test',
              email: values.admin_email,
              phone: '',
              subject: 'Prueba de configuración de email',
              message: 'Este es un correo de prueba enviado desde el panel de administración de Recorramos México para verificar que la configuración de SMTP2GO está funcionando correctamente.',
            },
          }),
        }
      );
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Configuración de envío de correos vía SMTP2GO</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

        {SETTING_KEYS.map((key) => {
          const meta = LABELS[key];
          const isPasswordField = meta.type === 'password';
          return (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {meta.label}
              </label>
              <div className="relative">
                {meta.type === 'email' && (
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
                {meta.type === 'url' && (
                  <Image size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
                <input
                  type={isPasswordField ? (showKey ? 'text' : 'password') : 'text'}
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  className={`w-full ${meta.type === 'email' || meta.type === 'url' ? 'pl-9' : 'pl-4'} ${isPasswordField ? 'pr-10' : 'pr-4'} py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 font-mono`}
                />
                {isPasswordField && (
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {key === 'logo_url' && values.logo_url && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={values.logo_url}
                    alt="Logo preview"
                    className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="text-xs text-gray-400">Vista previa</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
            </div>
          );
        })}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <LogIn size={18} className="text-orange-500" />
            <h3 className="font-bold text-gray-800 text-sm">Autenticación</h3>
          </div>
          {(['google_auth_enabled'] as BooleanKey[]).map((key) => {
            const meta = BOOLEAN_LABELS[key];
            return (
              <div key={key} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBoolValues((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${boolValues[key] ? 'bg-orange-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${boolValues[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={18} className="text-orange-500" />
            <h3 className="font-bold text-gray-800 text-sm">Tienda de Productos</h3>
          </div>
          {(['products_section_enabled'] as BooleanKey[]).map((key) => {
            const meta = BOOLEAN_LABELS[key];
            return (
              <div key={key} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{meta.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBoolValues((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${boolValues[key] ? 'bg-orange-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${boolValues[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>

          <button
            onClick={handleTestEmail}
            disabled={testLoading || !values.admin_email}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            <Send size={15} />
            {testLoading ? 'Enviando...' : 'Enviar correo de prueba'}
          </button>
        </div>

        {testResult === 'success' && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} /> Correo de prueba enviado correctamente.
          </div>
        )}
        {testResult === 'error' && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            Error al enviar el correo. Verifica que el API Key y el correo remitente sean válidos en SMTP2GO.
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 text-sm mb-2">¿Cuándo se envían correos automáticamente?</h3>
        <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
          <li>Al registrarse un nuevo usuario → correo de bienvenida</li>
          <li>Al enviar el formulario de contacto → notificación al email de admin</li>
          <li>Al hacer una reserva → confirmación al viajero + notificación al admin</li>
        </ul>
      </div>
    </div>
  );
}
