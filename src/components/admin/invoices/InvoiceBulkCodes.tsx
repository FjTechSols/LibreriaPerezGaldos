import { useEffect, useRef, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import type { InvoiceItem } from '../../../types';
import { buscarLibrosPorCodigos, type InvoiceCodeBook } from '../../../services/invoiceCodeService';
import { parseInvoiceCodes } from '../../../utils/invoiceCodes';

interface Props {
  onAdd: (items: InvoiceItem[]) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}

export function InvoiceBulkCodes({ onAdd, onBusyChange, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const active = useRef(true);
  const working = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; onBusyChange(false); };
  }, [onBusyChange]);

  const begin = () => { working.current = true; setBusy(true); onBusyChange(true); setError(''); setMessage(''); setIssues([]); };
  const end = () => { working.current = false; if (active.current) { setBusy(false); onBusyChange(false); } };

  const loadFile = async (file?: File) => {
    if (!file || working.current) return;
    if (!/\.txt$/i.test(file.name)) { setError('Selecciona un archivo .txt.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('El archivo supera 2 MB. Divide la lista en varios archivos .txt.'); return; }
    begin();
    try {
      const content = await file.text();
      if (!active.current) return;
      setText(content);
      setMessage(`Archivo cargado: ${file.name}. Revisa los códigos y pulsa «Añadir a factura».`);
    } catch { if (active.current) setError('No se pudo leer el archivo. Vuelve a intentarlo.'); }
    finally { end(); }
  };

  const addCodes = async () => {
    const codes = parseInvoiceCodes(text);
    if (!codes.length || working.current || disabled) return;
    begin();
    try {
      const books = await buscarLibrosPorCodigos(codes);
      if (!active.current) return;
      const byCode = new Map<string, InvoiceCodeBook[]>();
      for (const book of books) byCode.set(book.code, [...(byCode.get(book.code) || []), book]);
      const counts = new Map<string, number>();
      codes.forEach(code => counts.set(code, (counts.get(code) || 0) + 1));
      const additions: InvoiceItem[] = [];
      const pending = new Set<string>();
      const problems: string[] = [];
      for (const [code, quantity] of counts) {
        const matches = byCode.get(code) || [];
        if (matches.length !== 1 || !Number.isFinite(matches[0].price) || matches[0].price < 0) {
          pending.add(code);
          problems.push(`${code}: ${matches.length === 0 ? 'no encontrado' : matches.length > 1 ? 'corresponde a varios libros' : 'precio no válido'}`);
          continue;
        }
        const book = matches[0];
        additions.push({ book_id: book.id, book_title: book.title, quantity, unit_price: book.price, line_total: Number((book.price * quantity).toFixed(2)) });
      }
      if (additions.length) onAdd(additions);
      setText(codes.filter(code => pending.has(code)).join('\n'));
      setIssues(problems);
      setMessage(`Añadidos ${additions.length} libros (${additions.reduce((sum, item) => sum + item.quantity, 0)} unidades).${pending.size ? ` ${pending.size} códigos pendientes de revisar.` : ''}`);
    } catch {
      if (active.current) setError('No se pudieron consultar los códigos. No se ha añadido ningún libro; la lista se conserva para reintentar.');
    } finally { end(); }
  };

  return (
    <div className="invoice-bulk-codes form-group">
      <label htmlFor="invoice-book-codes">Códigos de los libros</label>
      <p id="invoice-codes-help">Pega códigos internos separados por espacios, comas o saltos de línea. Cada código añade una unidad al precio del catálogo; repetirlo suma otra unidad.</p>
      <textarea id="invoice-book-codes" rows={6} value={text} disabled={busy || disabled} aria-describedby="invoice-codes-help"
        placeholder={'02295875, 02295661\n02293901 02293819'}
        onChange={event => { setText(event.target.value); setMessage(''); setError(''); setIssues([]); }} />
      <input ref={fileInput} type="file" accept=".txt,text/plain" hidden aria-label="Archivo de códigos TXT" disabled={busy || disabled}
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void loadFile(file); }} />
      <div className="invoice-code-actions">
        <button type="button" className="btn-secondary" disabled={busy || disabled} onClick={() => fileInput.current?.click()}><Upload size={16} /> Cargar archivo .txt</button>
        <button type="button" className="btn-add-item" disabled={busy || disabled || !parseInvoiceCodes(text).length} onClick={addCodes}><Plus size={16} />{busy ? 'Procesando códigos…' : 'Añadir a factura'}</button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert" className="error-message">{error}</p>}
      {issues.length > 0 && <ul className="invoice-code-issues" aria-label="Códigos pendientes">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
    </div>
  );
}
