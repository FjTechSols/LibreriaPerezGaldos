import { useState } from 'react';
import { X, Package, User, MapPin, Phone, Mail, Calendar, Truck, Check, Send, Ban, Loader2 } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { 
  AbeBooksOrder, 
  ABEBOOKS_STATUS_LABELS, 
  formatAbeBooksDate, 
  getStatusBadgeClass,
  updateAbeBooksOrder 
} from '../../../services/abeBooksOrdersService';
import '../../../styles/components/IberLibroOrderDetail.css';

interface IberLibroOrderDetailProps {
  order: AbeBooksOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function IberLibroOrderDetail({ order, isOpen, onClose, onRefresh }: IberLibroOrderDetailProps) {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingData, setTrackingData] = useState({ carrier: '', trackingNumber: '' });

  // Check if management features are enabled in settings
  const isManageEnabled = settings.integrations.abeBooks.enabled && 
                         settings.integrations.abeBooks.api.orders.manage;

  if (!isOpen || !order) return null;

  // Simple normalization for common AbeBooks statuses if they arrive differently
  const currentStatus = order.status as any;
  const isNew = currentStatus === 'New' || currentStatus === 'Ordered' || currentStatus === 'Ordered-Pending';
  const isAcknowledged = currentStatus === 'Acknowledged' || currentStatus === 'availabilityConfirmed';
  const isShipped = currentStatus === 'Shipped';

  const handleAction = async (action: 'update' | 'updateShipping', status?: any) => {
    setLoading(true);
    try {
      await updateAbeBooksOrder(
        order.abeBooksOrderId, 
        action, 
        status, 
        action === 'updateShipping' ? trackingData : undefined
      );
      if (onRefresh) onRefresh();
      setShowShipForm(false);
    } catch (err: any) {
      alert(`Error al actualizar pedido: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content iberlibro-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-title">
            <Package size={24} />
            <div>
              <h2>Pedido IberLibro</h2>
              <p className="order-id-subtitle">ID: {order.abeBooksOrderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Order Info Section */}
          <div className="info-section">
            <h3 className="section-title">Información del Pedido</h3>
            <div className="info-grid">
              <div className="info-item">
                <Calendar size={18} className="info-icon" />
                <div>
                  <span className="info-label">Fecha de Pedido</span>
                  <span className="info-value">{formatAbeBooksDate(order.orderDate)}</span>
                </div>
              </div>

              <div className="info-item">
                <Package size={18} className="info-icon" />
                <div>
                  <span className="info-label">Estado</span>
                  <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                    {ABEBOOKS_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>

              {order.estimatedDelivery && (
                <div className="info-item">
                  <Truck size={18} className="info-icon" />
                  <div>
                    <span className="info-label">Entrega Estimada</span>
                    <span className="info-value">{formatAbeBooksDate(order.estimatedDelivery)}</span>
                  </div>
                </div>
              )}

              {order.trackingNumber && (
                <div className="info-item">
                  <Truck size={18} className="info-icon" />
                  <div>
                    <span className="info-label">Número de Seguimiento</span>
                    <span className="info-value tracking-number">{order.trackingNumber}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="info-section">
            <h3 className="section-title">Datos del Cliente</h3>
            <div className="customer-card">
              <div className="customer-row">
                <User size={18} className="info-icon" />
                <div>
                  <span className="info-label">Nombre</span>
                  <span className="info-value">{order.customer.name}</span>
                </div>
              </div>

              <div className="customer-row">
                <MapPin size={18} className="info-icon" />
                <div>
                  <span className="info-label">Dirección</span>
                  <span className="info-value">
                    {order.customer.address}<br />
                    {order.customer.postalCode} {order.customer.city}<br />
                    {order.customer.country}
                  </span>
                </div>
              </div>

              {order.customer.phone && (
                <div className="customer-row">
                  <Phone size={18} className="info-icon" />
                  <div>
                    <span className="info-label">Teléfono</span>
                    <span className="info-value">{order.customer.phone}</span>
                  </div>
                </div>
              )}

              {order.customer.email && (
                <div className="customer-row">
                  <Mail size={18} className="info-icon" />
                  <div>
                    <span className="info-label">Email</span>
                    <span className="info-value">{order.customer.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="info-section">
            <h3 className="section-title">Artículos ({order.items.length})</h3>
            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Título</th>
                    <th>Autor</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="item-sku">{item.sku}</td>
                      <td className="item-title">{item.title}</td>
                      <td className="item-author">{item.author}</td>
                      <td className="item-quantity">{item.quantity}</td>
                      <td className="item-price">{item.price.toFixed(2)}€</td>
                      <td className="item-subtotal">{(item.price * item.quantity).toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="info-section">
            <h3 className="section-title">Resumen</h3>
            <div className="totals-card">
              <div className="total-row">
                <span className="total-label">Subtotal</span>
                <span className="total-value">{order.subtotal.toFixed(2)}€</span>
              </div>
              <div className="total-row">
                <span className="total-label">Gastos de Envío</span>
                <span className="total-value">{order.shippingCost.toFixed(2)}€</span>
              </div>
              <div className="total-row final">
                <span className="total-label">Total</span>
                <span className="total-value">{order.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Shipment Tracking Form (Conditional) */}
          {showShipForm && (
            <div className="info-section tracking-form">
              <h3 className="section-title">Datos de Envío</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Transportista</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Correos, DHL..." 
                    value={trackingData.carrier}
                    onChange={(e) => setTrackingData({...trackingData, carrier: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Nº Seguimiento</label>
                  <input 
                    type="text" 
                    placeholder="Código de tracking" 
                    value={trackingData.trackingNumber}
                    onChange={(e) => setTrackingData({...trackingData, trackingNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-actions mt-3">
                <button 
                   className="btn-primary flex items-center gap-2"
                   disabled={loading || !trackingData.carrier || !trackingData.trackingNumber}
                   onClick={() => handleAction('updateShipping')}
                >
                   {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                   Confirmar Seguimiento
                </button>
                <button className="btn-secondary" onClick={() => setShowShipForm(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer actions-footer">
          <div className="flex gap-2">
            {isManageEnabled && isNew && (
              <button 
                className="btn-success flex items-center gap-2"
                disabled={loading}
                onClick={() => handleAction('update', 'availabilityConfirmed')}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                Confirmar Disponibilidad
              </button>
            )}

            {isManageEnabled && (isNew || isAcknowledged) && (
              <>
                <button 
                  className="btn-primary flex items-center gap-2"
                  disabled={loading}
                  onClick={() => handleAction('update', 'Shipped')}
                >
                  <Truck size={18} />
                  Marcar como Enviado
                </button>
                <button 
                    className="btn-danger flex items-center gap-2"
                    disabled={loading}
                    onClick={() => {
                        if(confirm('¿Seguro que quieres cancelar este pedido en AbeBooks?')) {
                            handleAction('update', 'Rejected');
                        }
                    }}
                >
                    <Ban size={18} />
                    Rechazar/Cancelar
                </button>
              </>
            )}

            {isManageEnabled && isShipped && !order.trackingNumber && !showShipForm && (
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={() => setShowShipForm(true)}
              >
                <Truck size={18} />
                Añadir Tracking
              </button>
            )}
          </div>

          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
