import { useEffect, useState } from 'react';
import { X, Truck } from 'lucide-react';
import { Pedido } from '../../../types';
import { obtenerPedidoPorId, confirmarPedidoConEnvio } from '../../../services/pedidoService';
import { sendPaymentReadyEmail } from '../../../services/emailService';
import '../../../styles/components/MessageModal.css';

interface ConfirmarPedidoEnvioModalProps {
  pedidoId: number | null;
  onClose: () => void;
  // Se llama tras aceptar el pedido, con el mensaje a mostrar al administrador
  onConfirmed: (message: string) => void;
}

const formatEur = (value: number) => `${value.toFixed(2)} €`;

/**
 * Paso "Por verificar" -> "Pendiente de pago" de un pedido web:
 * el administrador fija el coste real del envío antes de enviar el enlace de pago.
 */
export function ConfirmarPedidoEnvioModal({ pedidoId, onClose, onConfirmed }: ConfirmarPedidoEnvioModalProps) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [costeEnvioInput, setCosteEnvioInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pedidoId === null) return;
    let cancelled = false;
    setPedido(null);
    setError('');
    setLoading(true);
    obtenerPedidoPorId(pedidoId).then(data => {
      if (cancelled) return;
      if (!data) {
        setError('No se pudo cargar el pedido.');
      } else {
        setPedido(data);
        setCosteEnvioInput((data.coste_envio || 0).toFixed(2));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [pedidoId]);

  if (pedidoId === null) return null;

  const importeProductos = Number(
    (pedido?.detalles || []).reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0).toFixed(2)
  );
  const costeEstimado = pedido?.coste_envio || 0;
  // Solo importes de 0 o más con dos decimales como máximo: lo que se ve es exactamente lo que se guarda y se cobra
  const costeEnvioNormalizado = costeEnvioInput.trim().replace(',', '.');
  const costeValido = /^\d+(\.\d{1,2})?$/.test(costeEnvioNormalizado);
  const costeEnvio = costeValido ? Number(costeEnvioNormalizado) : NaN;
  const nuevoTotal = costeValido ? Number((importeProductos + costeEnvio).toFixed(2)) : null;

  const handleConfirm = async () => {
    if (!pedido || !costeValido) {
      setError('Indica un coste de envío válido: 0 o más, con dos decimales como máximo.');
      return;
    }
    setSubmitting(true);
    setError('');

    const result = await confirmarPedidoConEnvio(pedido.id, costeEnvio);
    if (!result.success || !result.pedido) {
      setError(result.error || 'No se pudo aceptar el pedido.');
      setSubmitting(false);
      return;
    }

    const actualizado = result.pedido;
    let message = 'El pedido ha sido confirmado y movido a Pendiente de Pago.';

    if (actualizado.usuario?.email) {
      const paymentUrl = `${window.location.origin}/stripe-checkout?orderId=${actualizado.id}`;
      const emailResult = await sendPaymentReadyEmail(
        actualizado.id.toString(),
        actualizado.usuario.email,
        actualizado.usuario.nombre_completo || actualizado.usuario.username || 'Cliente',
        actualizado.total || 0,
        paymentUrl,
        {
          productsTotal: result.importeProductos ?? importeProductos,
          shipping: actualizado.coste_envio || 0,
          shippingAdjusted: (actualizado.coste_envio || 0) !== (result.costeEnvioEstimado ?? costeEstimado)
        }
      );
      message = emailResult.success
        ? 'El pedido ha sido confirmado y se ha enviado un email al cliente para que realice el pago.'
        : 'El pedido ha sido confirmado, pero hubo un error al enviar el email. Por favor, contacte al cliente manualmente.';
    }

    setSubmitting(false);
    onConfirmed(message);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <button className="modal-close" onClick={onClose} disabled={submitting}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="icon-container info">
            <Truck size={32} />
          </div>
          <h2>Confirmar pedido y envío</h2>
        </div>

        <div className="modal-body" style={{ textAlign: 'left' }}>
          {loading && <p>Cargando pedido...</p>}

          {pedido && (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Pedido #{pedido.id}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', fontSize: '0.9rem' }}>
                {(pedido.detalles || []).map(d => (
                  <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.25rem 0' }}>
                    <span>{d.cantidad} × {d.libro?.titulo || d.nombre_externo || 'Artículo'}</span>
                    <span>{formatEur(d.cantidad * d.precio_unitario)}</span>
                  </li>
                ))}
              </ul>

              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                <strong>Envío a:</strong> {pedido.direccion_envio || 'Sin dirección'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                <span>Productos</span>
                <span>{formatEur(importeProductos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.75rem', color: '#64748b' }}>
                <span>Envío estimado en el checkout</span>
                <span>{formatEur(costeEstimado)}</span>
              </div>

              <label htmlFor="coste-envio-real" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Coste real del envío (€) *
              </label>
              <input
                id="coste-envio-real"
                type="number"
                step="0.01"
                min="0"
                value={costeEnvioInput}
                onChange={(e) => { setCosteEnvioInput(e.target.value); setError(''); }}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}
              />

              {!costeValido && costeEnvioInput.trim() !== '' && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '-0.75rem 0 0.75rem' }}>
                  Usa un importe de 0 o más, con dos decimales como máximo.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                <span>Nuevo total</span>
                <span>{nuevoTotal !== null ? formatEur(nuevoTotal) : '—'}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                El cliente recibirá el enlace de pago con este importe.
              </p>
            </>
          )}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          )}

          <div className="modal-actions">
            <button className="modal-btn secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              className="modal-btn primary"
              onClick={handleConfirm}
              disabled={!pedido || !costeValido || submitting}
            >
              {submitting ? 'Confirmando...' : 'Confirmar y enviar enlace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
