import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { obtenerPedidos } from '../../services/pedidoService';
import { Package, FileText, X, MapPin, CreditCard } from 'lucide-react';
import { Pedido } from '../../types';
import { Pagination } from '../Pagination';
import { useNavigate } from 'react-router-dom';

export function OrderHistory() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, currentPage]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders for this user with pagination
      const { data, count } = await obtenerPedidos({ 
        usuario_id: user!.id,
        page: currentPage,
        limit: itemsPerPage
      });
      setOrders(data || []);
      setTotalItems(count);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      pendiente: { class: 'status-pending', label: 'Pendiente' },
      procesando: { class: 'status-processing', label: 'Procesando' },
      enviado: { class: 'status-shipped', label: 'Enviado' },
      entregado: { class: 'status-delivered', label: 'Entregado' },
      cancelado: { class: 'status-canceled', label: 'Cancelado' },
      devolucion: { class: 'status-canceled', label: 'Devolución' },
      pending_verification: { class: 'status-pending', label: 'Pendiente de Verificación' },
      payment_pending: { class: 'status-processing', label: 'Pendiente de Pago' }
    };

    const badge = badges[estado] || badges.pendiente;

    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.label}
      </span>
    );
  };

  // Helper function to translate order status
  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pendiente': t('statusPending'),
      'procesando': t('statusProcessing'),
      'enviado': t('statusShipped'),
      'entregado': t('statusDelivered'),
      'cancelado': t('statusCancelled'),
      'pending_verification': 'Pendiente de Verificación',
      'payment_pending': 'Pendiente de Pago',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  if (loading) {
    return <div className="loading">{t('loadingOrders')}</div>;
  }

  return (
    <div className="order-history">
      <div className="section-header">
        <h2>{t('orderHistory')}</h2>
        <p>{t('reviewPreviousOrders')}</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>{t('noOrders')}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>{t('orderNumber')}</th>
                  <th>{t('date')}</th>
                  <th>{t('total')}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.legacy_id || order.id}</strong>
                    </td>
                    <td>
                      {new Date(order.created_at || new Date().toISOString()).toLocaleDateString('es-ES')}
                    </td>
                    <td>
                      <strong>{(order.total || 0).toFixed(2)} €</strong>
                    </td>
                    <td>
                      <span className={`status-badge status-${order.estado}`}>
                        {translateStatus(order.estado || 'pendiente')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            className="view-details-btn"
                            onClick={() => setSelectedOrder(order)}
                        >
                            <FileText size={16} />
                            {t('viewDetails')}
                        </button>
                        {order.estado === 'payment_pending' && (
                            <button
                                onClick={() => navigate('/stripe-checkout', { state: { orderId: order.id.toString() } })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.5rem 0.75rem',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500
                                }}
                            >
                                <CreditCard size={16} />
                                Pagar Ahora
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="orders-mobile-cards">
            {orders.map((order) => (
              <div key={order.id} className="order-mobile-card">
                <div className="order-mobile-card-header">
                  <strong>#{order.legacy_id || order.id}</strong>
                  <span className={`status-badge status-${order.estado}`}>
                    {translateStatus(order.estado || 'pendiente')}
                  </span>
                </div>
                
                <div className="order-mobile-card-row">
                  <span className="order-mobile-card-label">{t('date')}</span>
                  <span className="order-mobile-card-value">
                    {new Date(order.created_at || new Date().toISOString()).toLocaleDateString('es-ES')}
                  </span>
                </div>

                <div className="order-mobile-card-row">
                  <span className="order-mobile-card-label">{t('total')}</span>
                  <span className="order-mobile-card-value">
                    {(order.total || 0).toFixed(2)} €
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button 
                        className="view-details-btn"
                        onClick={() => setSelectedOrder(order)}
                        style={{ flex: 1 }}
                    >
                    <FileText size={16} />
                    {t('viewDetails')}
                    </button>
                    {order.estado === 'payment_pending' && (
                        <button
                            onClick={() => navigate('/stripe-checkout', { state: { orderId: order.id.toString() } })}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500
                            }}
                        >
                            <CreditCard size={16} />
                            Pagar
                        </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border)'
          }}>
            <div className="modal-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start', // Align to top
                padding: '1.5rem',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                position: 'sticky',
                top: 0
            }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text)' }}>
                    Pedido #{selectedOrder.legacy_id || selectedOrder.id}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Realizado el {new Date(selectedOrder.created_at || new Date().toISOString()).toLocaleString('es-ES')}
                  </p>
                </div>
                <button 
                    onClick={() => setSelectedOrder(null)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.375rem',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <X size={24} />
                </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="info-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <MapPin size={16} />
                            <strong>{t('shippingAddress')}</strong>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text)', lineHeight: '1.5' }}>
                            {selectedOrder.direccion_envio || t('addressNotAvailable')}
                        </p>
                    </div>
                    
                    <div className="info-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <CreditCard size={16} />
                            <strong>{t('paymentMethod')}</strong>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text)', textTransform: 'capitalize' }}>
                            {selectedOrder.metodo_pago?.replace('_', ' ') || 'Tarjeta'}
                        </p>
                    </div>

                    <div className="info-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                           <Package size={16} />
                           <strong>Estado</strong>
                        </div>
                        {getStatusBadge(selectedOrder.estado || 'pendiente')}
                    </div>
                </div>

                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text)' }}>{t('orderDetails')}</h4>
                <div className="items-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedOrder.detalles?.map((item) => (
                        <div key={item.id} style={{ 
                            display: 'flex', 
                            gap: '1rem', 
                            padding: '1rem', 
                            backgroundColor: 'var(--background)', 
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                        }}>
                            {/* Improved Image handling */}
                            <div style={{ 
                                width: '60px', 
                                height: '90px', 
                                borderRadius: '4px', 
                                overflow: 'hidden', 
                                flexShrink: 0,
                                backgroundColor: '#f3f4f6', // subtle placeholder
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {item.libro?.imagen_url ? (
                                    <img 
                                        src={item.libro.imagen_url} 
                                        alt={item.libro.titulo} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '1.5rem' }}>📚</span>
                                )}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--text)', fontSize: '1rem' }}>
                                    {item.libro?.titulo || item.nombre_externo || 'Producto sin nombre'}
                                </h5>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    {t('quantity')}: {item.cantidad} x {(item.precio_unitario || 0).toFixed(2)} €
                                </p>
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                {((item.precio_unitario || 0) * item.cantidad).toFixed(2)} €
                            </div>
                        </div>
                    ))}
                </div>

                <div className="order-summary" style={{ 
                    marginTop: '2rem', 
                    paddingTop: '1.5rem', 
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    alignItems: 'flex-end'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', color: 'var(--text-secondary)' }}>
                        <span>Subtotal:</span>
                        <span>{((selectedOrder.subtotal || 0)).toFixed(2)} €</span>
                    </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', color: 'var(--text-secondary)' }}>
                        <span>IVA ({settings.billing.taxRate}%):</span>
                        <span>{((selectedOrder.iva || 0)).toFixed(2)} €</span>
                    </div>
                    {selectedOrder.coste_envio !== undefined && selectedOrder.coste_envio > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', color: 'var(--text-secondary)' }}>
                          <span>Gastos de envío:</span>
                          <span>{selectedOrder.coste_envio.toFixed(2)} €</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px', marginTop: '0.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)' }}>
                        <span>Total:</span>
                        <span>{(selectedOrder.total || 0).toFixed(2)} €</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {totalItems > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
