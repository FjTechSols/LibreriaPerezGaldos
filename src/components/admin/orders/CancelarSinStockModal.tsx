import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Pedido } from '../../../types';
import { cancelarPedidoSinStock, obtenerPedidoPorId } from '../../../services/pedidoService';

interface Props {
  pedidoId: number | null;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelarSinStockModal({ pedidoId, onClose, onCancelled }: Props) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pedidoId === null) return;
    let cancelled = false;
    setPedido(null);
    setSelected([]);
    setError('');
    setLoading(true);
    obtenerPedidoPorId(pedidoId).then(data => {
      if (cancelled) return;
      if (data) setPedido(data);
      else setError('No se pudo cargar el pedido.');
    }).catch(() => {
      if (!cancelled) setError('No se pudo cargar el pedido.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pedidoId]);

  if (pedidoId === null) return null;
  const books = [...new Map((pedido?.detalles || []).filter(d => d.libro_id != null)
    .map(d => [d.libro_id, { id: d.libro_id, title: d.libro?.titulo || d.nombre_externo || `Libro #${d.libro_id}` }])).values()];

  const confirm = async () => {
    if (submitting || selected.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await cancelarPedidoSinStock(pedidoId, selected);
      if (result.success) onCancelled();
      else setError(result.error || 'No se pudo cancelar el pedido.');
    } catch {
      setError('No se pudo cancelar el pedido. Inténtalo de nuevo.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="sin-stock-title" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 id="sin-stock-title">Cancelar por falta de stock · Pedido #{pedidoId}</h3>
          <button className="modal-close" onClick={onClose} disabled={submitting} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p>Selecciona los libros que no están disponibles en el almacén.</p>
          <p className="mt-3 mb-4">El pedido completo quedará cancelado. Los libros seleccionados pasarán a stock 0; los demás recuperarán sus unidades si ya se habían descontado. Los productos externos no modifican el inventario.</p>
          {loading ? <p>Cargando libros…</p> : (
            <div className="space-y-3">
              {books.map(book => (
                <label key={book.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer">
                  <input type="checkbox" checked={selected.includes(book.id)} disabled={submitting}
                    onChange={e => setSelected(prev => e.target.checked ? [...prev, book.id] : prev.filter(id => id !== book.id))} />
                  <span>{book.title}</span>
                </label>
              ))}
              {pedido && books.length === 0 && <p>Este pedido no contiene libros vinculados al inventario.</p>}
            </div>
          )}
          {error && <p role="alert" className="text-red-600 mt-4">{error}</p>}
        </div>
        <div className="modal-footer flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Volver</button>
          <button className="btn-primary" onClick={confirm} disabled={loading || submitting || selected.length === 0}>
            {submitting ? 'Cancelando…' : 'Confirmar cancelación por falta de stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
