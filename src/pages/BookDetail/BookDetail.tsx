import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, ArrowLeft, Bookmark, Share2, Truck } from 'lucide-react';
import { mockBooks } from '../../data/mockBooks';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { ShareModal } from '../../components/ShareModal/ShareModal';
import './BookDetail.css';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const book = mockBooks.find(b => b.id === id);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showShareModal, setShowShareModal] = useState(false);
  
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  if (!book) {
    return (
      <div className="book-detail">
        <div className="container">
          <div className="not-found">
            <h1>Libro no encontrado</h1>
            <Link to="/catalogo" className="back-link">
              <ArrowLeft size={20} />
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(book);
    }
  };

  const handleWishlistToggle = () => {
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
        size={20}
        className={i < Math.floor(rating) ? 'star filled' : 'star'}
        fill={i < Math.floor(rating) ? 'currentColor' : 'none'}
      />
    ));
  };

  return (
    <div className="book-detail">
      <div className="container">
        <Link to="/catalogo" className="back-link">
          <ArrowLeft size={20} />
          Volver al catálogo
        </Link>

        <div className="book-detail-content">
          <div className="book-image-section">
            <div className="book-image-container">
              <img src={book.coverImage} alt={book.title} className="book-image" />
              {book.isNew && <span className="badge new-badge">Nuevo</span>}
              {book.isOnSale && <span className="badge sale-badge">Oferta</span>}
            </div>
            
            <div className="book-actions">
              <button 
                onClick={handleWishlistToggle}
                className={`wishlist-btn ${isInWishlist(book.id) ? 'active' : ''}`}
              >
                <Heart size={20} />
                {isInWishlist(book.id) ? 'En Lista de Deseos' : 'Agregar a Deseos'}
              </button>
              
              <button 
                onClick={() => setShowShareModal(true)}
                className="share-btn"
              >
                <Share2 size={20} />
                Compartir
              </button>
            </div>
          </div>

          <div className="book-info-section">
            <div className="book-header">
              <h1 className="book-title">{book.title}</h1>
              <p className="book-author">por {book.author}</p>
              
              <div className="book-rating">
                <div className="stars">{renderStars(book.rating)}</div>
                <span className="rating-text">
                  {book.rating}/5 ({book.reviews.length} reseña{book.reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            <div className="book-pricing">
              {book.isOnSale && book.originalPrice ? (
                <div className="pricing-sale">
                  <span className="original-price">${book.originalPrice}</span>
                  <span className="sale-price">${book.price}</span>
                  <span className="discount-badge">
                    {Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="current-price">${book.price}</span>
              )}
            </div>

            <div className="book-meta">
              <div className="meta-item">
                <span className="meta-label">ISBN:</span>
                <span className="meta-value">{book.isbn}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Categoría:</span>
                <span className="meta-value">{book.category}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Stock:</span>
                <span className={`meta-value ${book.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {book.stock > 0 ? `${book.stock} disponibles` : 'Agotado'}
                </span>
              </div>
            </div>

            {book.stock > 0 && (
              <div className="purchase-section">
                <div className="quantity-selector">
                  <label htmlFor="quantity" className="quantity-label">Cantidad:</label>
                  <select 
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="quantity-select"
                  >
                    {Array.from({ length: Math.min(book.stock, 10) }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div className="purchase-buttons">
                  <button onClick={handleAddToCart} className="add-to-cart-btn">
                    <ShoppingCart size={20} />
                    Agregar al Carrito
                  </button>
                  
                  <button className="reserve-btn">
                    <Bookmark size={20} />
                    Reservar
                  </button>
                </div>

                <div className="shipping-info">
                  <Truck size={16} />
                  <span>Envío gratis en pedidos mayores a $50</span>
                </div>
              </div>
            )}

            {book.stock === 0 && (
              <div className="out-of-stock-section">
                <p className="out-of-stock-message">Este libro está actualmente agotado</p>
                <button className="notify-btn">
                  Notificarme cuando esté disponible
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="book-details-tabs">
          <div className="tabs-header">
            <button 
              onClick={() => setActiveTab('description')}
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            >
              Descripción
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            >
              Reseñas ({book.reviews.length})
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'description' && (
              <div className="description-content">
                <h3>Acerca de este libro</h3>
                <p>{book.description}</p>
                
                <div className="book-specs">
                  <h4>Especificaciones</h4>
                  <div className="specs-grid">
                    <div className="spec-item">
                      <span className="spec-label">Autor:</span>
                      <span className="spec-value">{book.author}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Editorial:</span>
                      <span className="spec-value">{book.publisher}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">ISBN:</span>
                      <span className="spec-value">{book.isbn}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Páginas:</span>
                      <span className="spec-value">{book.pages}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Categoría:</span>
                      <span className="spec-value">{book.category}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Año de Publicación:</span>
                      <span className="spec-value">{book.publicationYear}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Valoración:</span>
                      <span className="spec-value">{book.rating}/5 estrellas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-content">
                {book.reviews.length > 0 ? (
                  <div className="reviews-list">
                    {book.reviews.map(review => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <span className="reviewer-name">{review.userName}</span>
                          <div className="review-rating">
                            {renderStars(review.rating)}
                          </div>
                          <span className="review-date">{review.date}</span>
                        </div>
                        <p className="review-comment">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>Este libro aún no tiene reseñas</p>
                    <p>¡Sé el primero en dejar una reseña!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <ShareModal 
          book={book}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </div>
    </div>
  );
}