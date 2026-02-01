import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, ArrowLeft, Bookmark, Share2, Truck, Edit, Trash2 } from 'lucide-react';
import { obtenerLibroPorId } from '../services/libroService';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

import { ShareModal } from '../components/ShareModal';
import { ReservationRequestModal } from '../components/ReservationRequestModal';
import { MessageModal } from '../components/MessageModal';
import { ReviewForm } from '../components/ReviewForm';
import { Book } from '../types';
import {
  getReviewsByLibroId,
  getUserReviewForLibro,
  deleteReview,
  Review,
  getBookAverageRating
} from '../services/reviewService';
import { NotFound } from '../components/NotFound';
import { createReservation } from '../services/reservationService';
import '../styles/pages/BookDetail.css';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { settings, formatPrice } = useSettings();


  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  
  // MessageModal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    onConfirm?: () => void;
    showCancel?: boolean;
    buttonText?: string;
  }>({ title: '', message: '', type: 'info' });

  const showModal = (
      title: string, 
      message: string, 
      type: 'info' | 'error' | 'success' | 'warning' = 'info',
      onConfirm?: () => void
  ) => {
    setMessageModalConfig({ 
        title, 
        message, 
        type, 
        onConfirm,
        showCancel: !!onConfirm,
        buttonText: onConfirm ? 'Aceptar' : 'Cerrar'
    });
    setShowMessageModal(true);
  };

  const [isReserving, setIsReserving] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;
      try {
        const libroData = await obtenerLibroPorId(id);
        setBook(libroData);

        const reviewsData = await getReviewsByLibroId(Number(id));
        setReviews(reviewsData);

        const avgRating = await getBookAverageRating(Number(id));
        setAverageRating(avgRating);

        if (user) {
          const userReviewData = await getUserReviewForLibro(Number(id), user.id);
          setUserReview(userReviewData);
        }
      } catch (error) {
        console.error('Error loading book:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBook();
  }, [id, user]);

  // Scroll to top when tab changes
  const handleTabChange = (tab: 'description' | 'reviews') => {
    setActiveTab(tab);
    const tabsElement = document.querySelector('.book-details-tabs');
    if (tabsElement) {
      tabsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to top when modal opens
  const handleShareModalOpen = () => {
    setShowShareModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="book-detail">
        <div className="container">
          <div className="loading-state">
            <p>Cargando libro...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return <NotFound type="book" />;
  }

  const handleReservationClick = () => {
    if (!isAuthenticated || !user) {
      setMessageModalConfig({
        title: language === 'es' ? 'Acceso requerido' : 'Login required',
        message: language === 'es' 
          ? 'Debes iniciar sesión para reservar un libro.' 
          : 'You must log in to reserve a book.',
        type: 'info'
      });
      setShowMessageModal(true);
      return;
    }
    setReservationSuccess(false);
    setShowReservationModal(true);
  };

  const handleConfirmReservation = async () => {
    if (!book || !user) return;
    
    setIsReserving(true);
    try {
      await createReservation(user.id, Number(book.id));
      setReservationSuccess(true);
    } catch (error: any) {
      console.error('Error reserving book:', error);
      const errorMessage = error.message || 'Error desconocido';
      
      setMessageModalConfig({
        title: 'Error',
        message: language === 'es' 
          ? `Error al solicitar la reserva: ${errorMessage}` 
          : `Error requesting reservation: ${errorMessage}`,
        type: 'error'
      });
      setShowMessageModal(true);
    } finally {
      setIsReserving(false);
    }
  };

  const handleCloseReservationModal = () => {
    setShowReservationModal(false);
    setTimeout(() => {
      setReservationSuccess(false);
    }, 300);
  };

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

  const handleReviewSuccess = async () => {
    setShowReviewForm(false);
    setEditingReview(false);

    const reviewsData = await getReviewsByLibroId(Number(id));
    setReviews(reviewsData);

    const avgRating = await getBookAverageRating(Number(id));
    setAverageRating(avgRating);

    if (user) {
      const userReviewData = await getUserReviewForLibro(Number(id!), user.id);
      setUserReview(userReviewData);
    }
  };

  const handleDeleteReview = (reviewId: number) => {
    showModal(
        'Confirmar Eliminación',
        '¿Estás seguro de que deseas eliminar tu reseña?',
        'warning',
        async () => {
            const success = await deleteReview(reviewId);
            if (success) {
                handleReviewSuccess();
                showModal('Éxito', 'Reseña eliminada correctamente', 'success');
            } else {
                showModal('Error', 'No se pudo eliminar la reseña', 'error');
            }
        }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="book-detail">
      <div className="container">
        <Link to="/catalogo" className="back-link">
          <ArrowLeft size={20} />
          {language === 'es' ? 'Volver al catálogo' : language === 'en' ? 'Back to catalog' : 'Retour au catalogue'}
        </Link>
        
        <div className="book-detail-content">
          <div className="book-image-section">
            <div className="book-image-container">
              <img src={book.coverImage} alt={book.title} className="book-image" />
              {book.isNew && <span className="badge new-badge">{language === 'es' ? 'Nuevo' : language === 'en' ? 'New' : 'Nouveau'}</span>}
              {book.isOnSale && <span className="badge sale-badge">{language === 'es' ? 'Oferta' : language === 'en' ? 'Sale' : 'Promo'}</span>}
            </div>
            
            <div className="book-actions">
              <button
                onClick={handleWishlistToggle}
                className={`wishlist-btn ${isInWishlist(book.id) ? 'active' : ''}`}
              >
                <Heart size={20} />
                {isInWishlist(book.id) ? (language === 'es' ? 'En Lista de Deseos' : language === 'en' ? 'In Wishlist' : 'Dans la Liste') : t('addToWishlist')}
              </button>

              <button
                onClick={handleShareModalOpen}
                className="share-btn"
              >
                <Share2 size={20} />
                {language === 'es' ? 'Compartir' : language === 'en' ? 'Share' : 'Partager'}
              </button>
            </div>
          </div>

          <div className="book-info-section">
            <div className="book-header">
              {/* ID removed from header */}
              <h1 className="book-title">{book.title}</h1>
              <p className="book-author">{language === 'es' ? 'por' : language === 'en' ? 'by' : 'par'} {book.author}</p>
              
              <div className="book-rating">
                <div className="stars">{renderStars(averageRating)}</div>
                <span className="rating-text">
                  {averageRating}/5 ({reviews.length} {language === 'es' ? `reseña${reviews.length !== 1 ? 's' : ''}` : language === 'en' ? `review${reviews.length !== 1 ? 's' : ''}` : `avis`})
                </span>
              </div>
            </div>

            <div className="book-pricing">
              {book.isOnSale && book.originalPrice && book.price ? (
                <div className="pricing-sale">
                  <span className="original-price">${book.originalPrice}</span>
                  <span className="sale-price">${book.price}</span>
                  <span className="discount-badge">
                    {Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="current-price">${book.price || '0.00'}</span>
              )}
            </div>

            <div className="book-meta">
              {book.isbn && book.isbn.trim() !== '' && (
                <div className="meta-item">
                  <span className="meta-label">ISBN:</span>
                  <span className="meta-value">{book.isbn}</span>
                </div>
              )}
              <div className="meta-item">
                <span className="meta-label">{language === 'es' ? 'Categoría' : language === 'en' ? 'Category' : 'Catégorie'}:</span>
                <span className="meta-value">{book.category}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Stock:</span>
                <span className={`meta-value ${book.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {book.stock > 0 ? `${book.stock} ${book.stock === 1 ? t('available_singular') : t('available')}` : t('outOfStock')}
                </span>
              </div>
            </div>

            {book.stock > 0 && (
              <div className="purchase-section">
                <div className="quantity-selector">
                  <label htmlFor="quantity" className="quantity-label">{language === 'es' ? 'Cantidad' : language === 'en' ? 'Quantity' : 'Quantité'}:</label>
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
                    {t('addToCart')}
                  </button>

                  <button 
                    className="reserve-btn"
                    onClick={handleReservationClick}
                  >
                    <Bookmark size={20} />
                    {language === 'es' ? 'Reservar' : language === 'en' ? 'Reserve' : 'Réserver'}
                  </button>
                </div>

                <div className="shipping-info">
                  <Truck size={16} />
                  <span>
                    {language === 'es' 
                      ? `Envío gratis en pedidos mayores a ${formatPrice(settings.shipping.freeShippingThresholdStandard)}` 
                      : language === 'en' 
                      ? `Free shipping on orders over ${formatPrice(settings.shipping.freeShippingThresholdStandard)}` 
                      : `Livraison gratuite pour les commandes de plus de ${formatPrice(settings.shipping.freeShippingThresholdStandard)}`
                    }
                  </span>
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
              onClick={() => handleTabChange('description')}
              className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            >
              {t('description')}
            </button>
            <button
              onClick={() => handleTabChange('reviews')}
              className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            >
              {language === 'es' ? 'Reseñas' : language === 'en' ? 'Reviews' : 'Avis'} ({reviews.length})
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'description' && (
              <div className="description-content">
                <h3>{language === 'es' ? 'Acerca de este libro' : language === 'en' ? 'About this book' : 'À propos de ce livre'}</h3>
                <p>{book.description}</p>
                
                <div className="book-specs">
                  <h4>{language === 'es' ? 'Especificaciones' : language === 'en' ? 'Specifications' : 'Spécifications'}</h4>
                  <div className="specs-grid">
                    <div className="spec-item">
                      <span className="spec-label">Autor:</span>
                      <span className="spec-value" title={book.author}>{book.author}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Editorial:</span>
                      <span className="spec-value" title={book.publisher}>{book.publisher}</span>
                    </div>
                    {book.code && (
                      <div className="spec-item">
                        <span className="spec-label">Código Ref.:</span>
                        <span className="spec-value" title={book.code}>{book.code}</span>
                      </div>
                    )}
                    {book.isbn && book.isbn.trim() !== '' && (
                      <div className="spec-item">
                        <span className="spec-label">ISBN:</span>
                        <span className="spec-value" title={book.isbn}>{book.isbn}</span>
                      </div>
                    )}
                    <div className="spec-item">
                      <span className="spec-label">Páginas:</span>
                      <span className="spec-value" title={String(book.pages)}>{book.pages}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">{language === 'es' ? 'Categoría' : language === 'en' ? 'Category' : 'Catégorie'}:</span>
                      <span className="spec-value" title={book.category}>{book.category}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Año de Publicación:</span>
                      <span className="spec-value" title={String(book.publicationYear)}>{book.publicationYear}</span>
                    </div>
                    {book.language && (
                      <div className="spec-item">
                        <span className="spec-label">{language === 'es' ? 'Idioma' : language === 'en' ? 'Language' : 'Langue'}:</span>
                        <span className="spec-value" title={book.language}>{book.language}</span>
                      </div>
                    )}
                    {book.condition && (
                      <div className="spec-item">
                        <span className="spec-label">{language === 'es' ? 'Estado' : language === 'en' ? 'Condition' : 'État'}:</span>
                        <span className="spec-value" title={book.condition === 'nuevo' 
                            ? (language === 'es' ? 'Nuevo' : language === 'en' ? 'New' : 'Neuf') 
                            : (language === 'es' ? 'Leído / Usado' : language === 'en' ? 'Used' : 'Occasion')}>
                          {book.condition === 'nuevo' 
                            ? (language === 'es' ? 'Nuevo' : language === 'en' ? 'New' : 'Neuf') 
                            : (language === 'es' ? 'Leído / Usado' : language === 'en' ? 'Used' : 'Occasion')}
                        </span>
                      </div>
                    )}
                    {book.contents && book.contents.length > 0 && (
                       <div className="spec-item full-width">
                          <span className="spec-label">{language === 'es' ? 'Contenido' : language === 'en' ? 'Contents' : 'Contenu'}:</span>
                          <div className="spec-value-list">
                            {book.contents.map((vol, idx) => (
                              <span key={idx} className="spec-value-item" title={`Vol ${idx + 1}. ${vol}`}>Vol {idx + 1}. {vol}</span>
                            ))}
                          </div>
                       </div>
                    )}
                    <div className="spec-item">
                      <span className="spec-label">Valoración:</span>
                      <span className="spec-value" title={`${averageRating}/5 estrellas`}>{averageRating}/5 estrellas</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="reviews-content">
                {isAuthenticated && (
                  <div className="review-form-section">
                    {!userReview && !showReviewForm && (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="write-review-btn"
                      >
                        Escribir una reseña
                      </button>
                    )}

                    {userReview && !editingReview && (
                      <div className="user-review-card">
                        <div className="user-review-header">
                          <h4>Tu reseña</h4>
                          <div className="user-review-actions">
                            <button
                              onClick={() => setEditingReview(true)}
                              className="edit-review-btn"
                              title="Editar reseña"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteReview(userReview.id)}
                              className="delete-review-btn"
                              title="Eliminar reseña"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="review-rating">
                          {renderStars(userReview.rating)}
                        </div>
                        <p className="review-comment">{userReview.comment}</p>
                        <span className="review-date">{formatDate(userReview.created_at)}</span>
                      </div>
                    )}

                    {(showReviewForm || editingReview) && (
                      <ReviewForm
                        libroId={Number(id)}
                        existingReview={editingReview && userReview ? {
                          id: userReview.id,
                          rating: userReview.rating,
                          comment: userReview.comment
                        } : undefined}
                        onSuccess={handleReviewSuccess}
                        onCancel={() => {
                          setShowReviewForm(false);
                          setEditingReview(false);
                        }}
                      />
                    )}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="login-prompt">
                    <p>
                      <Link to="/login">Inicia sesión</Link> para dejar una reseña
                    </p>
                  </div>
                )}

                <div className="reviews-summary">
                  <h3>Todas las reseñas ({reviews.length})</h3>
                  {reviews.length > 0 && (
                    <div className="average-rating-display">
                      <div className="large-rating">{averageRating}</div>
                      <div className="rating-details">
                        <div className="stars">{renderStars(averageRating)}</div>
                        <span>{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}
                </div>

                {reviews.length > 0 ? (
                  <div className="reviews-list">
                    {reviews.filter(r => r.id !== userReview?.id).map(review => (
                      <div key={review.id} className="review-item">
                        <div className="review-header">
                          <span className="reviewer-name">
                            {review.usuario?.email?.split('@')[0] || 'Usuario'}
                          </span>
                          <div className="review-rating">
                            {renderStars(review.rating)}
                          </div>
                          <span className="review-date">{formatDate(review.created_at)}</span>
                        </div>
                        <p className="review-comment">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>Este libro aún no tiene reseñas</p>
                    {isAuthenticated && <p>¡Sé el primero en dejar una reseña!</p>}
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
        
        {book && (
          <ReservationRequestModal
            isOpen={showReservationModal}
            onClose={handleCloseReservationModal}
            onConfirm={handleConfirmReservation}
            bookTitle={book.title}
            isProcessing={isReserving}
            isSuccess={reservationSuccess}
          />
        )}
        
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          title={messageModalConfig.title}
          message={messageModalConfig.message}
          type={messageModalConfig.type as any}
          onConfirm={messageModalConfig.onConfirm}
          showCancel={messageModalConfig.showCancel}
          buttonText={messageModalConfig.buttonText}
        />
      </div>
    </div>
  );
}
