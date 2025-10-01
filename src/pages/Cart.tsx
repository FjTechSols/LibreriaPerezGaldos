import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import '../styles/pages/Cart.css';

export function Cart() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();

  const handleCheckout = () => {
    // Simulated checkout process
    alert('¡Compra realizada con éxito! Gracias por tu pedido.');
    clearCart();
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

              <button onClick={handleCheckout} className="checkout-btn">
                <CreditCard size={20} />
                Proceder al Checkout
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