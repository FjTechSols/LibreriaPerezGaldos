import { useState } from 'react';
import { X, Package, User, MapPin, Truck, CreditCard, FileText, Calendar, Edit, Trash2, Plus } from 'lucide-react';
import { Pedido, EstadoPedido } from '../types';
import { actualizarEstadoPedido, eliminarDetallePedido } from '../services/pedidoService';
import { crearFactura } from '../services/facturaService';
import '../styles/components/PedidoDetalle.css';

interface PedidoDetalleProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEditar?: () => void;
}

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

export default function PedidoDetalle({ pedido, isOpen, onClose, onRefresh, onEditar }: PedidoDetalleProps) {
  const [generandoFactura, setGenerandoFactura] = useState(false);

  if (!isOpen || !pedido) return null;

  const handleCambiarEstado = async (nuevoEstado: EstadoPedido) => {
    const exito = await actualizarEstadoPedido(pedido.id, nuevoEstado);

    if (exito) {
      alert('Estado actualizado correctamente');
      onRefresh();
    } else {
      alert('Error al actualizar el estado');
    }
  };

  const handleGenerarFactura = async () => {
    if (!pedido.detalles || pedido.detalles.length === 0) {
      alert('El pedido no tiene detalles para facturar');
      return;
    }

    setGenerandoFactura(true);

    try {
      const factura = await crearFactura({
        pedido_id: pedido.id,
        tipo: 'normal'
      });

      if (factura) {
        alert(`Factura ${factura.numero_factura} generada correctamente`);
        onRefresh();
      } else {
        alert('Error al generar la factura');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar la factura');
    } finally {
      setGenerandoFactura(false);
    }
  };

  const calcularSubtotal = () => {
    if (!pedido.detalles) return 0;
    return pedido.detalles.reduce((sum, detalle) => {
      return sum + (detalle.cantidad * detalle.precio_unitario);
    }, 0);
  };

  const subtotal = calcularSubtotal();
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const tieneFactura = pedido.factura && !Array.isArray(pedido.factura);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-pedido-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Package size={24} />
            <h2>Detalle del Pedido #{pedido.id}</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="pedido-info-grid">
            <div className="info-card">
              <div className="info-card-header">
                <User size={20} />
                <h3>Cliente</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">{pedido.usuario?.username}</p>
                <p className="info-secundario">{pedido.usuario?.email}</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Calendar size={20} />
                <h3>Fecha del Pedido</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">
                  {pedido.fecha_pedido
                    ? new Date(pedido.fecha_pedido).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : '-'}
                </p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Package size={20} />
                <h3>Estado</h3>
              </div>
              <div className="info-card-body">
                <select
                  value={pedido.estado || 'pendiente'}
                  onChange={(e) => handleCambiarEstado(e.target.value as EstadoPedido)}
                  className="estado-selector-detalle"
                >
                  {ESTADOS.map(estado => (
                    <option key={estado} value={estado}>
                      {ESTADO_LABELS[estado]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <CreditCard size={20} />
                <h3>Método de Pago</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">{pedido.metodo_pago || '-'}</p>
              </div>
            </div>

            {pedido.direccion_envio && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <MapPin size={20} />
                  <h3>Dirección de Envío</h3>
                </div>
                <div className="info-card-body">
                  <p className="info-principal">{pedido.direccion_envio}</p>
                </div>
              </div>
            )}

            {(pedido.transportista || pedido.tracking) && (
              <div className="info-card">
                <div className="info-card-header">
                  <Truck size={20} />
                  <h3>Envío</h3>
                </div>
                <div className="info-card-body">
                  {pedido.transportista && (
                    <p className="info-principal">Transportista: {pedido.transportista}</p>
                  )}
                  {pedido.tracking && (
                    <p className="info-secundario">Tracking: {pedido.tracking}</p>
                  )}
                </div>
              </div>
            )}

            {pedido.observaciones && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <FileText size={20} />
                  <h3>Observaciones</h3>
                </div>
                <div className="info-card-body">
                  <p className="info-principal">{pedido.observaciones}</p>
                </div>
              </div>
            )}
          </div>

          <div className="detalles-section">
            <div className="detalles-header">
              <h3>Productos del Pedido</h3>
              {onEditar && (
                <button onClick={onEditar} className="btn-editar-pedido">
                  <Edit size={16} />
                  Editar Pedido
                </button>
              )}
            </div>

            <div className="detalles-table">
              <div className="table-header">
                <span>Título</span>
                <span>Cantidad</span>
                <span>Precio Unitario</span>
                <span>Subtotal</span>
              </div>

              {pedido.detalles && pedido.detalles.length > 0 ? (
                pedido.detalles.map(detalle => (
                  <div key={detalle.id} className="table-row">
                    <span className="libro-titulo">{detalle.libro?.titulo || 'Sin título'}</span>
                    <span className="cantidad">{detalle.cantidad}</span>
                    <span className="precio">{detalle.precio_unitario.toFixed(2)} €</span>
                    <span className="subtotal">
                      {(detalle.cantidad * detalle.precio_unitario).toFixed(2)} €
                    </span>
                  </div>
                ))
              ) : (
                <div className="no-detalles">No hay productos en este pedido</div>
              )}
            </div>

            <div className="totales-section">
              <div className="total-row">
                <span>Subtotal:</span>
                <span className="total-valor">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="total-row">
                <span>IVA (21%):</span>
                <span className="total-valor">{iva.toFixed(2)} €</span>
              </div>
              <div className="total-row final">
                <span>Total:</span>
                <span className="total-valor">{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancelar">
            Cerrar
          </button>

          {tieneFactura ? (
            <div className="factura-generada">
              <FileText size={16} />
              Factura: {typeof pedido.factura === 'object' ? pedido.factura.numero_factura : ''}
            </div>
          ) : (
            <button
              onClick={handleGenerarFactura}
              className="btn-generar-factura"
              disabled={generandoFactura || !pedido.detalles || pedido.detalles.length === 0}
            >
              <FileText size={16} />
              {generandoFactura ? 'Generando...' : 'Generar Factura'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
