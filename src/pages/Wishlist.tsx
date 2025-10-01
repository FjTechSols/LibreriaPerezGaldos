import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { BookCard } from '../components/BookCard';
import '../styles/pages/Wishlist.css';

export function Wishlist() {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();

  const handleMoveToCart = (bookId: string) => {
    const book = items.find(item => item.id === bookId);
    if (book && book.stock > 0) {
      addItem(book);
      removeItem(bookId);
    }
  };

  if (items.length === 0) {
    return (
      <div className="wishlist">
        <div className="container">
          <div className="empty-wishlist">
            <Heart size={64} className="empty-wishlist-icon" />
            <h2 className="empty-wishlist-title">Tu lista de deseos está vacía</h2>
            <p className="empty-wishlist-subtitle">
              Guarda tus libros favoritos aquí para comprarlos más tarde
            </p>
            <Link to="/catalogo" className="browse-btn">
              Explorar Libros
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist">
      <div className="container">
        <div className="wishlist-header">
          <Link to="/catalogo" className="back-link">
            <ArrowLeft size={20} />
            Continuar navegando
          </Link>
          <div className="header-content">
            <h1 className="wishlist-title">Mi Lista de Deseos</h1>
            <p className="wishlist-subtitle">
              {items.length} libro{items.length !== 1 ? 's' : ''} guardado{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="wishlist-actions">
          <button 
            onClick={() => {
              const availableItems = items.filter(book => book.stock > 0);
              availableItems.forEach(book => {
                addItem(book);
                removeItem(book.id);
              });
            }}
            className="move-all-btn"
            disabled={!items.some(book => book.stock > 0)}
          >
            <ShoppingCart size={20} />
            Mover Todo al Carrito
          </button>
        </div>

        <div className="wishlist-grid">
          {items.map((book) => (
            <div key={book.id} className="wishlist-item">
              <BookCard book={book} />
              <div className="wishlist-item-actions">
                {book.stock > 0 ? (
                  <button 
                    onClick={() => handleMoveToCart(book.id)}
                    className="move-to-cart-btn"
                  >
                    <ShoppingCart size={16} />
                    Mover al Carrito
                  </button>
                ) : (
                  <span className="out-of-stock-label">Sin Stock</span>
                )}
                <button 
                  onClick={() => removeItem(book.id)}
                  className="remove-from-wishlist-btn"
                >
                  <Heart size={16} />
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="wishlist-stats">
          <div className="stats-card">
            <h3 className="stats-title">Estadísticas de tu Lista</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{items.length}</span>
                <span className="stat-label">Libros Guardados</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  ${items.reduce((sum, book) => sum + book.price, 0).toFixed(2)}
                </span>
                <span className="stat-label">Valor Total</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {items.filter(book => book.stock > 0).length}
                </span>
                <span className="stat-label">Disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}