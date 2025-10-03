import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { crearPedido } from '../services/pedidoService';
import { validateStock } from '../services/cartService';
import '../styles/pages/Cart.css';

export function Cart() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
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

      const detalles = items.map(item => ({
        libro_id: parseInt(item.book.id),
        cantidad: item.quantity,
        precio_unitario: item.book.price
      }));

      const pedido = await crearPedido({
        usuario_id: user.id,
        tipo: 'interno',
        metodo_pago: 'tarjeta',
        detalles
      });

      if (pedido) {
        clearCart();
        alert('¡Pedido creado con éxito! Puede ver el estado en su panel de usuario.');
        navigate('/mi-cuenta');
      } else {
        setError('Error al crear el pedido. Por favor, intente nuevamente.');
      }
    } catch (err) {
      console.error('Error in checkout:', err);
      setError('Error inesperado al procesar el pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart">
        <div className="container">
          <div className="empty-cart">
            <ShoppingCart size={64} className="empty-cart-icon" />
            <h2 className="empty-cart-title">Tu carrito está vacío</h2>
            <p className="empty-cart-subtitle">
              ¡Descubre nuestra increíble selección de libros y añade algunos a tu carrito!
            </p>
            <Link to="/catalogo" className="shop-btn">
              Explorar Catálogo
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
            Continuar comprando
          </Link>
          <h1 className="cart-title">Carrito de Compras</h1>
          <button onClick={clearCart} className="clear-cart-btn">
            <Trash2 size={16} />
            Vaciar carrito
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
                  <p className="item-author">por {item.book.author}</p>
                  <p className="item-category">{item.book.category}</p>
                  <p className="item-isbn">ISBN: {item.book.isbn}</p>
                </div>

                <div className="item-price">
                  <span className="unit-price">${item.book.price}</span>
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
                  <span className="total-price">${(item.book.price * item.quantity).toFixed(2)}</span>
                </div>

                <button 
                  onClick={() => removeItem(item.book.id)}
                  className="remove-btn"
                  aria-label="Eliminar del carrito"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h2 className="summary-title">Resumen del Pedido</h2>
              
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} libro{items.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''})</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Envío</span>
                  <span>{total >= 50 ? 'Gratis' : '$5.99'}</span>
                </div>
                <div className="summary-row">
                  <span>Impuestos</span>
                  <span>${(total * 0.1).toFixed(2)}</span>
                </div>
                
                <hr className="summary-divider" />
                
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>${(total + (total >= 50 ? 0 : 5.99) + total * 0.1).toFixed(2)}</span>
                </div>
              </div>

              {total < 50 && (
                <div className="shipping-notice">
                  <p>Añade ${(50 - total).toFixed(2)} más para envío gratuito</p>
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
                  <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>Inicia sesión para completar tu compra</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                className="checkout-btn"
                disabled={isProcessing}
                style={{
                  opacity: isProcessing ? 0.6 : 1,
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                <CreditCard size={20} />
                {isProcessing ? 'Procesando...' : isAuthenticated ? 'Proceder al Checkout' : 'Iniciar Sesión'}
              </button>

              <div className="security-badges">
                <span>🔒 Compra 100% segura</span>
                <span>📦 Envío en 24-48h</span>
                <span>↩️ Devolución gratis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}