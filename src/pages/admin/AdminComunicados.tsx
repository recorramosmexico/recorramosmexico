import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Send, ImagePlus, Trash2, Eye, Code, Mail, Users, X, Loader2,
  Bold, Italic, List, Link2, Calendar, CheckCircle, AlertCircle,
} from 'lucide-react';

interface Broadcast {
  id: string;
  subject: string;
  html_content: string;
  recipients_count: number;
  status: 'sent' | 'failed';
  created_at: string;
}

type EditorMode = 'visual' | 'html';

export default function AdminComunicados() {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error: fetchError } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!fetchError && data) {
      setHistory(data as Broadcast[]);
    }
    setLoadingHistory(false);
  }, []);

  const fetchUserCount = useCallback(async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    setUserCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchUserCount();
  }, [fetchHistory, fetchUserCount]);

  // Rich text editor commands
  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleHtmlChange = (val: string) => {
    setHtmlContent(val);
    if (editorRef.current && editorMode === 'visual') {
      editorRef.current.innerHTML = val;
    }
  };

  const switchMode = (mode: EditorMode) => {
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
    setEditorMode(mode);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede pesar más de 5MB.');
      return;
    }

    setUploadingImage(true);
    setError('');

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('broadcasts')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('broadcasts')
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Insert image into editor
    const imgHtml = `<img src="${publicUrl}" alt="${file.name}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`;

    if (editorMode === 'visual' && editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, imgHtml);
      setHtmlContent(editorRef.current.innerHTML);
    } else {
      setHtmlContent(prev => prev + imgHtml);
    }

    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      setError('El asunto y el contenido son obligatorios.');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-broadcast`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      headers['apikey'] = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject: subject.trim(),
          html_content: htmlContent,
          sent_by: session?.user?.id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.detail || 'Error al enviar el comunicado');
      }

      setSuccess(`Comunicado enviado exitosamente a ${result.recipients_count} viajeros.`);
      setSubject('');
      setHtmlContent('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      fetchHistory();
      fetchUserCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setHistory(prev => prev.filter(b => b.id !== id));
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const toolbarButtons = [
    { cmd: 'bold', icon: <Bold size={16} />, label: 'Negrita' },
    { cmd: 'italic', icon: <Italic size={16} />, label: 'Cursiva' },
    { cmd: 'insertUnorderedList', icon: <List size={16} />, label: 'Lista' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Comunicados</h1>
          <p className="text-gray-500 text-sm mt-1">
            Envía comunicados en formato HTML a todos los viajeros registrados.
          </p>
        </div>
        {userCount !== null && (
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
            <Users size={18} className="text-[#E8670A]" />
            <span className="text-sm font-semibold text-gray-700">{userCount} viajeros</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle size={18} className="shrink-0" /> {success}
        </div>
      )}

      {/* Composer */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        {/* Subject */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Asunto
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Escribe el asunto del comunicado..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A]"
          />
        </div>

        {/* Editor mode toggle */}
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Contenido
          </label>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => switchMode('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                editorMode === 'visual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Eye size={14} /> Visual
            </button>
            <button
              onClick={() => switchMode('html')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                editorMode === 'html' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Code size={14} /> HTML
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {editorMode === 'visual' && (
          <div className="flex items-center gap-1 mb-2 border-b border-gray-100 pb-2">
            {toolbarButtons.map(btn => (
              <button
                key={btn.cmd}
                onClick={() => execCmd(btn.cmd)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                title={btn.label}
                type="button"
              >
                {btn.icon}
              </button>
            ))}
            <button
              onClick={() => {
                const url = prompt('Ingresa la URL del enlace:');
                if (url) execCmd('createLink', url);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Enlace"
              type="button"
            >
              <Link2 size={16} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50"
              title="Subir imagen"
              type="button"
            >
              {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              type="button"
            >
              <Eye size={14} /> Vista previa
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Editor */}
        {editorMode === 'visual' ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="w-full min-h-[280px] rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A] prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
            style={{ lineHeight: '1.7' }}
            data-placeholder="Escribe el contenido del comunicado..."
          />
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                type="button"
              >
                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                Subir imagen
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                type="button"
              >
                <Eye size={14} /> Vista previa
              </button>
            </div>
            <textarea
              value={htmlContent}
              onChange={e => handleHtmlChange(e.target.value)}
              rows={14}
              placeholder="<p>Escribe el HTML del comunicado...</p>"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono text-gray-900 focus:outline-none focus:border-[#E8670A] focus:ring-1 focus:ring-[#E8670A] resize-y"
            />
          </div>
        )}

        {/* Send button */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !htmlContent.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8670A] text-white text-sm font-semibold hover:bg-[#c55a05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send size={18} /> Enviar a todos los viajeros
              </>
            )}
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Historial de Comunicados</h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[#E8670A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Mail size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No se han enviado comunicados todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(broadcast => (
              <div
                key={broadcast.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      broadcast.status === 'sent'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {broadcast.status === 'sent' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      {broadcast.status === 'sent' ? 'Enviado' : 'Fallido'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} /> {formatDate(broadcast.created_at)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm truncate">{broadcast.subject}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Enviado a {broadcast.recipients_count} viajero{broadcast.recipients_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSubject(broadcast.subject);
                      setHtmlContent(broadcast.html_content);
                      if (editorRef.current) editorRef.current.innerHTML = broadcast.html_content;
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors"
                  >
                    Reutilizar
                  </button>
                  <button
                    onClick={() => handleDeleteBroadcast(broadcast.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPreview(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Vista Previa</h2>
              <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Asunto</p>
              <p className="text-sm font-bold text-gray-900 mb-4">{subject || '(sin asunto)'}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contenido</p>
              <div
                className="border border-gray-100 rounded-xl p-4 prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg"
                dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-gray-400">(sin contenido)</p>' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
