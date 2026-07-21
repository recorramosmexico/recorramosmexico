import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Download, Search, Mail, Phone, Calendar, User, Pencil, Trash2, X, Save, AlertTriangle } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  birth_date: string | null;
  sex: string | null;
  created_at: string;
  email: string;
}

interface EditForm {
  full_name: string;
  phone: string;
  birth_date: string;
  sex: string;
  is_admin: boolean;
}

const SEX_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
  prefer_not_to_say: 'Prefiere no decir',
};

const SEX_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiere no decir' },
];

export default function AdminViajeros() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, is_admin, birth_date, sex, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    let emailMap: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentAdminId(session.user.id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(apiUrl, { method: 'GET', headers });
      if (response.ok) {
        const result = await response.json();
        if (result.users) {
          for (const u of result.users) {
            emailMap[u.id] = u.email;
          }
        }
      }
    } catch {
      // Emails are optional — table still works without them
    }

    setProfiles((profileData || []).map((p: Profile) => ({
      ...p,
      email: emailMap[p.id] || '',
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filtered = profiles.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatBirthDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const exportToExcel = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Fecha de Nacimiento', 'Sexo', 'Administrador', 'Fecha de Registro'];
    const rows = filtered.map(p => [
      p.full_name || '—',
      p.email || '—',
      p.phone || '—',
      p.birth_date || '—',
      p.sex ? (SEX_LABELS[p.sex] || p.sex) : '—',
      p.is_admin ? 'Sí' : 'No',
      formatDate(p.created_at),
    ]);

    const csv = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `viajeros-recorramos-mexico-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditForm({
      full_name: p.full_name || '',
      phone: p.phone || '',
      birth_date: p.birth_date || '',
      sex: p.sex || '',
      is_admin: p.is_admin,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    setSaving(true);
    setError('');

    const payload: Record<string, string | boolean | null> = {
      full_name: editForm.full_name.trim() || null,
      phone: editForm.phone.trim() || null,
      sex: editForm.sex || null,
      is_admin: editForm.is_admin,
    };
    if (editForm.birth_date) {
      payload.birth_date = editForm.birth_date;
    } else {
      payload.birth_date = null;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editingId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfiles(prev => prev.map(p => p.id === editingId ? {
      ...p,
      full_name: payload.full_name as string | null,
      phone: payload.phone as string | null,
      birth_date: payload.birth_date as string | null,
      sex: payload.sex as string | null,
      is_admin: payload.is_admin as boolean,
    } : p));
    cancelEdit();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: deleteTarget.id }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || result.detail || `Error (${response.status})`);
        setDeleting(false);
        return;
      }

      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el usuario');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Viajeros Registrados</h1>
          <p className="text-gray-500 text-sm mt-1">
            Consulta, edita y elimina la lista de viajeros registrados en la plataforma.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
          <Users size={18} className="text-[#E8670A]" />
          <span className="text-sm font-semibold text-gray-700">{profiles.length} viajeros</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A]"
          />
        </div>
        <button
          onClick={exportToExcel}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8670A] text-white text-sm font-semibold hover:bg-[#c55a05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} /> Descargar Excel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#E8670A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? 'No se encontraron viajeros con esos criterios.' : 'No hay viajeros registrados todavía.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Nombre</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Teléfono</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Fecha Nac.</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Sexo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Registro</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Rol</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#E8670A]/10 flex items-center justify-center shrink-0">
                          <User size={16} className="text-[#E8670A]" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{p.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.email ? (
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Mail size={13} className="text-gray-400" /> {p.email}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.phone ? (
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" /> {p.phone}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{formatBirthDate(p.birth_date)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{p.sex ? (SEX_LABELS[p.sex] || p.sex) : '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" /> {formatDate(p.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.is_admin ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8670A]/10 text-[#E8670A]">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          Viajero
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-[#E8670A]/10 hover:text-[#E8670A] transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        {p.id !== currentAdminId && (
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editingId && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Editar viajero</h2>
              <button onClick={cancelEdit} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={editForm.birth_date}
                    onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Sexo
                  </label>
                  <select
                    value={editForm.sex}
                    onChange={e => setEditForm({ ...editForm, sex: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A] bg-white"
                  >
                    {SEX_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editForm.is_admin}
                  onChange={e => setEditForm({ ...editForm, is_admin: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#E8670A] focus:ring-[#E8670A]"
                />
                <span className="text-sm font-medium text-gray-700">Es administrador</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={cancelEdit}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8670A] text-white text-sm font-semibold hover:bg-[#c55a05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} className="text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Eliminar viajero</h2>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                ¿Seguro que deseas eliminar a <span className="font-semibold text-gray-900">{deleteTarget.full_name || deleteTarget.email || 'este usuario'}</span>?
              </p>
              <p className="text-sm text-gray-500">
                Esta acción eliminará permanentemente su cuenta de autenticación y todos sus datos. No se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
