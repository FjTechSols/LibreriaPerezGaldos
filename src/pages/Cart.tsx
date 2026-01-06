import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { validateStock } from '../services/cartService';
import { crearPedido } from '../services/pedidoService';
import CheckoutForm, { CheckoutData } from '../components/CheckoutForm';
import '../styles/pages/Cart.css';

export function Cart() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { formatPrice, settings } = useSettings();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [savedCheckoutData, setSavedCheckoutData] = useState<{
    data: CheckoutData;
    method: 'standard' | 'express';
    cost: number;
  } | null>(null);


  const handleInitiateCheckout = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login', { state: { from: '/carrito' } });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const stockValidation = await validateStock(items);

      if (!stockValidation.valid) {
        setError(stockValidation.errors.join('. '));
        setIsProcessing(false);
        return;
      }

      setShowCheckout(true);
    } catch (err) {
      console.error('Error in checkout:', err);
      setError('Error inesperado al validar el pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestOrder = async () => {
    if (!savedCheckoutData || !user) return;

    setIsProcessing(true);
    setError(null);

    const { data: checkoutData, cost: shippingCost } = savedCheckoutData;
    const direccionCompleta = `${checkoutData.direccion}, ${checkoutData.codigo_postal} ${checkoutData.ciudad}, ${checkoutData.provincia}, ${checkoutData.pais}`;

    try {
      const pedido = await crearPedido({
        usuario_id: user.id || '', // Fallback, though user should be logged in
        direccion_envio: direccionCompleta,
        metodo_pago: 'tarjeta', // Default for now
        coste_envio: shippingCost,
        transportista: 'Otro', // Placeholder
        taxRate: settings.billing.taxRate / 100,
        detalles: items.map(item => ({
          libro_id: parseInt(item.book.id), // Ensure numeric ID
          cantidad: item.quantity,
          precio_unitario: item.book.price
        })),
        observaciones: checkoutData.observaciones
      });

      if (pedido) {
        clearCart();
        navigate('/order-confirmation', { state: { orderId: pedido.id } });
      } else {
        throw new Error('No se pudo crear el pedido');
      }
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError('Error al solicitar el pedido. Por favor, inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckoutSubmit = (checkoutData: CheckoutData, shippingMethod: 'standard' | 'express', shippingCost: number) => {
    setSavedCheckoutData({
      data: checkoutData,
      method: shippingMethod,
      cost: shippingCost
    });
    setShowCheckout(false);
    // Scroll to top or bottom? Maybe stay put but button changes.
  };

  const handleCancelCheckout = () => {
    setShowCheckout(false);
  };

  if (items.length === 0) {
    return (
      <div className="cart">
        <div className="container">
          <div className="empty-cart">
            <ShoppingCart size={64} className="empty-cart-icon" />
            <h2 className="empty-cart-title">{t('yourCartIsEmpty')}</h2>
            <p className="empty-cart-subtitle">
              {t('discoverOurSelection')}
            </p>
            <Link to="/catalogo" className="shop-btn">
              {t('exploreCatalogBtn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="container">
        <div className="cart-header">
          <Link to="/catalogo" className="back-link">
            <ArrowLeft size={20} />
            {t('continueShopping')}
          </Link>
          <h1 className="cart-title">{t('shoppingCart')}</h1>
          <button onClick={clearCart} className="clear-cart-btn">
            <Trash2 size={16} />
            {t('emptyCartBtn')}
          </button>
        </div>

        <div className="cart-content">
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.book.id} className="cart-item">
                <div className="item-image">
                  <img src={item.book.coverImage} alt={item.book.title} />
                </div>
                
                <div className="item-details">
                  <Link to={`/libro/${item.book.id}`} className="item-title">
                    {item.book.title}
                  </Link>
                  <p className="item-author">{t('byAuthor')} {item.book.author}</p>
                  <p className="item-category">{item.book.category}</p>
                  <p className="item-isbn">ISBN: {item.book.isbn}</p>
                </div>

                <div className="item-price">
                  <span className="unit-price">{formatPrice(item.book.price)}</span>
                </div>

                <div className="quantity-controls">
                  <button 
                    onClick={() => updateQuantity(item.book.id, item.quantity - 1)}
                    className="quantity-btn"
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.book.id, item.quantity + 1)}
                    className="quantity-btn"
                    disabled={item.quantity >= item.book.stock}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="item-total">
                  <span className="total-price">{formatPrice(item.book.price * item.quantity)}</span>
                </div>

                <button 
                  onClick={() => removeItem(item.book.id)}
                  className="remove-btn"
                  aria-label={t('removeFromCart')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h2 className="summary-title">{t('orderSummary')}</h2>
              
              <div className="summary-details">
                <div className="summary-row">
                  <span>{t('subtotalLabel')} ({items.reduce((sum, item) => sum + item.quantity, 0)} {items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? t('bookSingular') : t('bookPlural')})</span>
                  <span>{formatPrice(total / (1 + settings.billing.taxRate / 100))}</span>
                </div>
                {/* Shipping Selector Removed - Calculated at Checkout */}

                <div className="summary-row">
                   <span>{t('shippingCostLabel')}</span>
                   {savedCheckoutData ? (
                     <span>{savedCheckoutData.cost === 0 ? t('freeLabel') : formatPrice(savedCheckoutData.cost)}</span>
                   ) : (
                     <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{t('calculatedAtCheckout') || 'Se calculará al finalizar'}</span>
                   )}
                </div>

                <div className="summary-row">
                  <span>{t('taxesLabel')} ({settings.billing.taxRate}%)</span>
                  <span>{formatPrice(total - (total / (1 + settings.billing.taxRate / 100)))}</span>
                </div>

                <hr className="summary-divider" />

                <div className="summary-row total">
                  <span>{t('cartTotal')}</span>
                  <span>
                    {savedCheckoutData 
                      ? formatPrice(total + savedCheckoutData.cost)
                      : `${formatPrice(total)} + ${t('shippingCostLabel')}`
                    }
                  </span>
                </div>
              </div>

              {savedCheckoutData && (
                <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#166534'
                }}>
                  <strong>{t('shippingAddress')}:</strong><br/>
                  {savedCheckoutData.data.direccion}, {savedCheckoutData.data.ciudad}<br/>
                  {savedCheckoutData.data.pais}
                  <button 
                    onClick={() => setShowCheckout(true)} 
                    style={{ 
                        display: 'block', 
                        marginTop: '0.5rem', 
                        background: 'none', 
                        border: 'none', 
                        color: '#2563eb', 
                        textDecoration: 'underline', 
                        cursor: 'pointer',
                        padding: 0
                    }}
                  >
                    {t('edit')}
                  </button>
                </div>
              )}

              {total < settings.shipping.freeShippingThresholdStandard && (
                <div className="shipping-notice">
                  <p>{t('addMoreForFreeShipping').replace('{0}', formatPrice(settings.shipping.freeShippingThresholdStandard - total))}</p>
                </div>
              )}

              {error && (
                <div className="error-notice" style={{
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertCircle size={20} style={{ color: '#c33', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ margin: 0, fontSize: '14px', color: '#c33' }}>{error}</p>
                </div>
              )}

              {!isAuthenticated && (
                <div className="auth-notice" style={{
                  backgroundColor: '#fef3cd',
                  border: '1px solid #f5c67f',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>{t('loginToCompletePurchase')}</p>
                </div>
              )}

              <button 
                className={`checkout-btn ${savedCheckoutData ? 'continue-btn' : ''}`}
                onClick={savedCheckoutData ? handleRequestOrder : handleInitiateCheckout}
                disabled={isProcessing}
                style={{
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  marginTop: '1.5rem',
                  backgroundColor: savedCheckoutData ? '#10b981' : undefined, // Green for continue
                  borderColor: savedCheckoutData ? '#10b981' : undefined
                }}
              >
                <CreditCard size={20} />
                {isProcessing 
                  ? t('validatingCart') 
                  : (savedCheckoutData ? (t('requestOrder') || 'Solicitar Pedido') : (isAuthenticated ? t('proceedToCheckout') : t('login')))
                }
              </button>

              <div className="security-badges">
                <span>🔒 {t('securePayment')}</span>
                <span>📦 {t('fastShipping')}</span>
                <span>↩️ {t('freeReturns')}</span>
              </div>
            </div>
          </div>
        </div>

        {showCheckout && (
          <div className="checkout-overlay">
            <div className="checkout-modal">
              <CheckoutForm
                subtotal={total / (1 + settings.billing.taxRate / 100)}
                iva={total - (total / (1 + settings.billing.taxRate / 100))}
                total={total} // Total will be recalculated in CheckoutForm with shipping
                onSubmit={handleCheckoutSubmit}
                onCancel={handleCancelCheckout}
                isProcessing={isProcessing}
                initialShippingMethod='standard'
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}