import { useEffect, useRef, useCallback } from 'react';
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Link, Minus, Quote, Undo, Redo,
} from 'lucide-react';

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'SPAN', 'A',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BLOCKQUOTE', 'HR', 'IMG',
]);

function sanitizePastedHtml(raw: string): string {
  if (!raw) return '';
  const doc = new DOMParser().parseFromString(raw, 'text/html');

  // Replace FB emoji <img> with its alt text (emoji)
  doc.querySelectorAll('img').forEach((img) => {
    const alt = img.getAttribute('alt') || '';
    if (alt) img.replaceWith(doc.createTextNode(alt));
    else img.remove();
  });

  // Unwrap spans (keep inner content)
  doc.querySelectorAll('span').forEach((span) => {
    span.replaceWith(...Array.from(span.childNodes));
  });

  // Convert divs to paragraphs (or unwrap if empty)
  doc.querySelectorAll('div').forEach((div) => {
    if (div.textContent?.trim()) {
      const p = doc.createElement('p');
      p.append(...Array.from(div.childNodes));
      div.replaceWith(p);
    } else {
      div.remove();
    }
  });

  // Remove disallowed tags but keep their text content
  doc.body.querySelectorAll('*').forEach((el) => {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
    }
  });

  // Strip all attributes except href on <a> and src/alt on <img>
  doc.body.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const keep =
        (el.tagName === 'A' && name === 'href') ||
        (el.tagName === 'IMG' && (name === 'src' || name === 'alt'));
      if (!keep) el.removeAttribute(attr.name);
    });
  });

  // Drop empty links
  doc.querySelectorAll('a').forEach((a) => {
    if (!a.textContent?.trim() && !a.getAttribute('href')) a.remove();
  });

  return doc.body.innerHTML.trim();
}

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastValueRef.current) {
      editorRef.current.innerHTML = value;
      lastValueRef.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url) exec('createLink', url);
  };

  const isActive = (command: string) => {
    try { return document.queryCommandState(command); } catch { return false; }
  };

  const btn = (onClick: () => void, icon: React.ReactNode, title: string, active?: boolean) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-[#E8670A] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {icon}
    </button>
  );

  const sep = () => <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#E8670A]/30">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {btn(() => exec('undo'), <Undo size={15} />, 'Deshacer')}
        {btn(() => exec('redo'), <Redo size={15} />, 'Rehacer')}
        {sep()}
        {btn(() => exec('formatBlock', 'h1'), <Heading1 size={15} />, 'Título 1')}
        {btn(() => exec('formatBlock', 'h2'), <Heading2 size={15} />, 'Título 2')}
        {btn(() => exec('formatBlock', 'h3'), <Heading3 size={15} />, 'Título 3')}
        {btn(() => exec('formatBlock', 'p'), <span className="text-xs font-semibold w-4">P</span>, 'Párrafo')}
        {sep()}
        {btn(() => exec('bold'), <Bold size={15} />, 'Negrita', isActive('bold'))}
        {btn(() => exec('italic'), <Italic size={15} />, 'Cursiva', isActive('italic'))}
        {btn(() => exec('underline'), <Underline size={15} />, 'Subrayado', isActive('underline'))}
        {sep()}
        {btn(() => exec('insertUnorderedList'), <List size={15} />, 'Lista', isActive('insertUnorderedList'))}
        {btn(() => exec('insertOrderedList'), <ListOrdered size={15} />, 'Lista numerada', isActive('insertOrderedList'))}
        {btn(() => exec('formatBlock', 'blockquote'), <Quote size={15} />, 'Cita')}
        {sep()}
        {btn(() => exec('justifyLeft'), <AlignLeft size={15} />, 'Alinear izquierda')}
        {btn(() => exec('justifyCenter'), <AlignCenter size={15} />, 'Centrar')}
        {btn(() => exec('justifyRight'), <AlignRight size={15} />, 'Alinear derecha')}
        {sep()}
        {btn(insertLink, <Link size={15} />, 'Insertar enlace')}
        {btn(() => exec('insertHorizontalRule'), <Minus size={15} />, 'Línea separadora')}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onPaste={(e) => {
          e.preventDefault();
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          const source = html || text;
          if (!source) return;
          const clean = sanitizePastedHtml(source);
          document.execCommand('insertHTML', false, clean);
          emit();
        }}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { isComposingRef.current = false; emit(); }}
        onInput={() => { if (!isComposingRef.current) emit(); }}
        onBlur={emit}
        className="min-h-[280px] p-4 text-sm text-gray-800 outline-none overflow-auto
          [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-gray-900 [&_h1]:my-3
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:my-3
          [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:my-2
          [&_p]:my-2 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
          [&_li]:my-1
          [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8670A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-3
          [&_a]:text-[#E8670A] [&_a]:underline
          [&_hr]:border-gray-300 [&_hr]:my-4
          [&_strong]:font-bold [&_em]:italic"
      />
    </div>
  );
}
