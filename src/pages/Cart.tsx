import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, CreditCard, AlertCircle, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { validateStock } from '../services/cartService';
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
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<'standard' | 'express'>('standard');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const handleCheckoutSubmit = async (checkoutData: CheckoutData, shippingMethod: 'standard' | 'express', shippingCost: number) => {
    setIsProcessing(true);
    setError(null);

    try {
      // DO NOT create order here - it will be created after successful payment
      // Just navigate to Stripe with all the necessary data
      
      const direccionCompleta = `${checkoutData.direccion}, ${checkoutData.codigo_postal} ${checkoutData.ciudad}, ${checkoutData.provincia}, ${checkoutData.pais}`;
      
      // Calculate total with shipping and tax
      const subtotal = total;
      const taxAmount = subtotal * (settings.billing.taxRate / 100);
      const orderTotal = subtotal + shippingCost + taxAmount;

      navigate('/stripe-checkout', { 
        state: { 
          checkoutData,
          shippingMethod,
          shippingCost,
          subtotal,
          taxAmount,
          orderTotal,
          direccionCompleta,
          cartItems: items // Pass cart items to create order after payment
        } 
      });

    } catch (err) {
      console.error('Error in checkout:', err);
      setError('Error inesperado al procesar el pedido. Inténtelo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
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
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="summary-row" style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                  <span>{t('shippingMethodLabel')}</span>
                  
                  <div className="custom-shipping-selector">
                    <div 
                      className="selector-trigger" 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <div className="option-content">
                        <div className="option-title-row">
                          <span>
                            {selectedShippingMethod === 'standard' ? t('standardShipping') : t('expressShipping')}
                          </span>
                        </div>
                        <span className="option-subtitle">
                          {selectedShippingMethod === 'standard' 
                            ? `(${t('freeFromAmount')} ${settings.shipping.freeShippingThresholdStandard}€)`
                            : `(${t('freeFromAmount')} ${settings.shipping.freeShippingThresholdExpress}€)`
                          }
                        </span>
                      </div>
                      <ChevronDown size={16} />
                    </div>

                    {isDropdownOpen && (
                      <div className="selector-options">
                        <div 
                          className={`selector-option ${selectedShippingMethod === 'standard' ? 'selected' : ''}`}
                          onClick={() => { setSelectedShippingMethod('standard'); setIsDropdownOpen(false); }}
                        >
                          <div className="option-content">
                            <div className="option-title-row">
                              <span>{t('standardOption')}</span>
                              <span>{total >= settings.shipping.freeShippingThresholdStandard ? t('freeLabel') : formatPrice(settings.shipping.standardShippingCost)}</span>
                            </div>
                            <span className="option-subtitle">({t('freeFromAmount')} {settings.shipping.freeShippingThresholdStandard}€)</span>
                          </div>
                        </div>

                        <div 
                          className={`selector-option ${selectedShippingMethod === 'express' ? 'selected' : ''}`}
                          onClick={() => { setSelectedShippingMethod('express'); setIsDropdownOpen(false); }}
                        >
                          <div className="option-content">
                            <div className="option-title-row">
                              <span>{t('expressOption')}</span>
                              <span>{total >= settings.shipping.freeShippingThresholdExpress ? t('freeLabel') : formatPrice(settings.shipping.expressShippingCost)}</span>
                            </div>
                            <span className="option-subtitle">({t('freeFromAmount')} {settings.shipping.freeShippingThresholdExpress}€)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="summary-row">
                   <span>{t('shippingCostLabel')}</span>
                   <span>
                     {selectedShippingMethod === 'standard' 
                       ? (total >= settings.shipping.freeShippingThresholdStandard ? t('freeLabel') : formatPrice(settings.shipping.standardShippingCost))
                       : (total >= settings.shipping.freeShippingThresholdExpress ? t('freeLabel') : formatPrice(settings.shipping.expressShippingCost))
                     }
                   </span>
                </div>

                <div className="summary-row">
                  <span>{t('taxesLabel')} ({settings.billing.taxRate}%)</span>
                  <span>{formatPrice(total * (settings.billing.taxRate / 100))}</span>
                </div>

                <hr className="summary-divider" />

                <div className="summary-row total-row">
                  <span>{t('estimatedTotalLabel')}</span>
                  <span>{formatPrice(
                    total + 
                    (selectedShippingMethod === 'standard' 
                      ? (total >= settings.shipping.freeShippingThresholdStandard ? 0 : settings.shipping.standardShippingCost)
                      : (total >= settings.shipping.freeShippingThresholdExpress ? 0 : settings.shipping.expressShippingCost)
                    ) + 
                    total * (settings.billing.taxRate / 100)
                  )}</span>
                </div>
              </div>

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
                onClick={handleInitiateCheckout}
                className="checkout-btn"
                disabled={isProcessing}
                style={{
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                <CreditCard size={20} />
                {isProcessing ? t('validatingCart') : isAuthenticated ? t('proceedToCheckout') : t('login')}
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
                subtotal={total}
                iva={total * (settings.billing.taxRate / 100)}
                total={total + (total * (settings.billing.taxRate / 100))}
                onSubmit={handleCheckoutSubmit}
                onCancel={handleCancelCheckout}
                isProcessing={isProcessing}
                initialShippingMethod={selectedShippingMethod}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}