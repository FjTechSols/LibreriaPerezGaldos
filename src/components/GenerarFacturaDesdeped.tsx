import { useState, useEffect } from 'react';
import { FileText, X, AlertCircle, Check } from 'lucide-react';
import { Pedido } from '../types';
import { crearFactura, calcularTotalesFactura } from '../services/facturaService';
import { supabase } from '../lib/supabase';
import '../styles/components/GenerarFacturaModal.css';

interface GenerarFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GenerarFacturaModal({
  isOpen,
  onClose,
  onSuccess
}: GenerarFacturaModalProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarPedidosSinFactura();
    }
  }, [isOpen]);

  const cargarPedidosSinFactura = async () => {
    const { data: todosPedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select(`
        *,
        usuario:usuarios(*),
        detalles:pedido_detalles(
          *,
          libro:libros(*)
        )
      `)
      .in('estado', ['completado', 'enviado'])
      .order('fecha_pedido', { ascending: false });

    if (pedidosError) {
      console.error('Error al cargar pedidos:', pedidosError);
      return;
    }

    const { data: facturas } = await supabase
      .from('facturas')
      .select('pedido_id');

    const pedidosConFactura = new Set(facturas?.map(f => f.pedido_id) || []);

    const pedidosSinFactura = todosPedidos?.filter(
      p => !pedidosConFactura.has(p.id)
    ) || [];

    setPedidos(pedidosSinFactura);
  };

  const handleGenerarFactura = async () => {
    if (!pedidoSeleccionado) {
      alert('Debe seleccionar un pedido');
      return;
    }

    setLoading(true);

    try {
      const result = await crearFactura({
        pedido_id: pedidoSeleccionado
      });

      if (result) {
        alert(`Factura ${result.numero_factura} generada correctamente`);
        onSuccess?.();
        onClose();
      } else {
        alert('Error al generar la factura');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar la factura');
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido =>
    pedido.id.toString().includes(searchTerm) ||
    pedido.usuario?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.usuario?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pedidoActual = pedidos.find(p => p.id === pedidoSeleccionado);
  const totales = pedidoActual?.detalles
    ? calcularTotalesFactura(pedidoActual.detalles)
    : null;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-generar-factura" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FileText size={24} />
            Generar Factura desde Pedido
          </h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {pedidos.length === 0 ? (
            <div className="no-pedidos">
              <AlertCircle size={48} />
              <p>No hay pedidos pendientes de facturar</p>
              <p className="hint">
                Solo se pueden facturar pedidos en estado "Completado" o "Enviado"
              </p>
            </div>
          ) : (
            <>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar pedido por ID, cliente o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="pedidos-list">
                {pedidosFiltrados.map(pedido => {
                  const isSelected = pedido.id === pedidoSeleccionado;
                  return (
                    <div
                      key={pedido.id}
                      className={`pedido-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setPedidoSeleccionado(pedido.id)}
                    >
                      <div className="pedido-check">
                        {isSelected && <Check size={18} />}
                      </div>
                      <div className="pedido-info">
                        <div className="pedido-header">
                          <span className="pedido-id">Pedido #{pedido.id}</span>
                          <span className={`pedido-estado ${pedido.estado}`}>
                            {pedido.estado}
                          </span>
                        </div>
                        <div className="pedido-details">
                          <span className="cliente-name">
                            {pedido.usuario?.username}
                          </span>
                          <span className="pedido-fecha">
                            {pedido.fecha_pedido
                              ? new Date(pedido.fecha_pedido).toLocaleDateString('es-ES')
                              : '-'}
                          </span>
                        </div>
                        <div className="pedido-total">
                          Total: <strong>{pedido.total?.toFixed(2) || '0.00'} €</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pedidoActual && totales && (
                <div className="factura-preview">
                  <h4>Vista previa de la factura</h4>
                  <div className="preview-details">
                    <div className="detail-row">
                      <span>Cliente:</span>
                      <strong>{pedidoActual.usuario?.username}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Email:</span>
                      <strong>{pedidoActual.usuario?.email}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Artículos:</span>
                      <strong>{pedidoActual.detalles?.length || 0}</strong>
                    </div>
                    <div className="detail-divider"></div>
                    <div className="detail-row">
                      <span>Subtotal:</span>
                      <strong>{totales.subtotal.toFixed(2)} €</strong>
                    </div>
                    <div className="detail-row">
                      <span>IVA (21%):</span>
                      <strong>{totales.iva.toFixed(2)} €</strong>
                    </div>
                    <div className="detail-row total">
                      <span>TOTAL:</span>
                      <strong>{totales.total.toFixed(2)} €</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancelar">
            Cancelar
          </button>
          <button
            onClick={handleGenerarFactura}
            className="btn-generar"
            disabled={!pedidoSeleccionado || loading}
          >
            {loading ? 'Generando...' : 'Generar Factura'}
          </button>
        </div>
      </div>
    </div>
  );
}
