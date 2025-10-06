import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Tag } from 'lucide-react';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/components/BookCard.css';

interface BookCardProps {
  book: Book;
  viewMode?: 'grid' | 'list';
}

export function BookCard({ book, viewMode = 'grid' }: BookCardProps) {
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (book.stock > 0) {
      addItem(book);
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(book.id)) {
      removeFromWishlist(book.id);
    } else {
      addToWishlist(book);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.floor(rating) ? 'star filled' : 'star'}
        fill={i < Math.floor(rating) ? 'currentColor' : 'none'}
      />
    ));
  };

  return (
    <Link to={`/libro/${book.id}`} className={`book-card ${viewMode}`}>
      <div className="book-image-container">
        <img src={book.coverImage} alt={book.title} className="book-image" />
        
        {book.isNew && <span className="badge new-badge">Nuevo</span>}
        {book.isOnSale && <span className="badge sale-badge">Oferta</span>}
        {book.stock === 0 && <span className="badge stock-badge">Agotado</span>}

        <button
          onClick={handleWishlistToggle}
          className={`wishlist-btn ${isInWishlist(book.id) ? 'active' : ''}`}
          aria-label={isInWishlist(book.id) ? "Eliminar de favoritos" : "Agregar a favoritos"}
          title={isInWishlist(book.id) ? "Eliminar de favoritos" : "Agregar a favoritos"}
        >
          <Heart size={20} fill={isInWishlist(book.id) ? 'currentColor' : 'none'} />
        </button>

        <div className="book-overlay">
          <button 
            onClick={handleAddToCart}
            disabled={book.stock === 0}
            className="add-to-cart-btn"
          >
            <ShoppingCart size={16} />
            {book.stock === 0 ? 'Agotado' : 'Agregar'}
          </button>
        </div>
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">por {book.author}</p>
        
        <div className="book-rating">
          <div className="stars">{renderStars(book.rating)}</div>
          <span className="rating-text">({book.rating})</span>
        </div>

        <div className="book-pricing">
          {book.isOnSale && book.originalPrice ? (
            <>
              <span className="original-price">${book.originalPrice}</span>
              <span className="sale-price">${book.price}</span>
              <span className="discount">
                <Tag size={14} />
                {Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}% OFF
              </span>
            </>
          ) : (
            <span className="current-price">${book.price}</span>
          )}
        </div>

        {viewMode === 'list' && (
          <p className="book-description">{book.description.substring(0, 120)}...</p>
        )}

        <div className="book-meta">
          <span className="book-category">{book.category}</span>
          <span className="book-stock">
            {book.stock > 0 ? `${book.stock} disponibles` : 'Sin stock'}
          </span>
        </div>
      </div>
    </Link>
  );
}