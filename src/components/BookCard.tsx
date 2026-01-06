import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Tag } from 'lucide-react';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import '../styles/components/BookCard.css';

interface BookCardProps {
  book: Book;
  viewMode?: 'grid' | 'list';
}

export function BookCard({ book, viewMode = 'grid' }: BookCardProps) {
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { t } = useLanguage();
  const { formatPrice } = useSettings();

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
        className={i < Math.floor(rating) ? 'bookcard__star bookcard__star--filled' : 'bookcard__star'}
        fill={i < Math.floor(rating) ? 'currentColor' : 'none'}
      />
    ));
  };

  return (
    <Link to={`/libro/${book.id}`} className={`bookcard bookcard--${viewMode}`}>
      <div className="bookcard__image-container">
        {/* Blurred background for premium feel on low-res images */}
        <div 
          className="bookcard__image-background" 
          style={{ backgroundImage: `url(${book.coverImage})` }} 
        />
        <img 
          src={book.coverImage} 
          alt={book.title} 
          className="bookcard__image" 
          loading="lazy" 
        />

        {book.isNew && <span className="bookcard__badge bookcard__badge--new">{t('new')}</span>}
        {book.isOnSale && <span className="bookcard__badge bookcard__badge--sale">{t('sale')}</span>}
        {book.stock === 0 && <span className="bookcard__badge bookcard__badge--stock">{t('outOfStock')}</span>}

        <button
          onClick={handleWishlistToggle}
          className={`bookcard__wishlist-btn ${isInWishlist(book.id) ? 'bookcard__wishlist-btn--active' : ''}`}
          aria-label={isInWishlist(book.id) ? t('removeFromWishlist') : t('addToWishlist')}
          title={isInWishlist(book.id) ? t('removeFromWishlist') : t('addToWishlist')}
        >
          <Heart size={24} fill={isInWishlist(book.id) ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>

        {viewMode === 'grid' && (
          <div className="bookcard__overlay">
            <button
              onClick={handleAddToCart}
              disabled={book.stock === 0}
              className="bookcard__add-to-cart-btn"
            >
              <ShoppingCart size={16} />
              {book.stock === 0 ? t('outOfStock') : t('addToCart')}
            </button>
          </div>
        )}
      </div>

      <div className="bookcard__info">
        <h3 className="bookcard__title">{book.title}</h3>
        <p className="bookcard__author">{t('by')} {book.author}</p>

        <div className="bookcard__rating">
          <div className="bookcard__stars">{renderStars(book.rating || 0)}</div>
          <span className="bookcard__rating-text">({book.rating || 0})</span>
        </div>

        <div className="bookcard__pricing">
          {book.isOnSale && book.originalPrice ? (
            <>
              <span className="bookcard__original-price">{formatPrice(book.originalPrice)}</span>
              <span className="bookcard__sale-price">{formatPrice(book.price)}</span>
              <span className="bookcard__discount">
                <Tag size={14} />
                {Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}% OFF
              </span>
            </>
          ) : (
            <span className="bookcard__current-price">{formatPrice(book.price)}</span>
          )}
        </div>

        {viewMode === 'list' && (
          <>
            <p className="bookcard__description">{book.description?.substring(0, 150)}...</p>
            
            <div className="bookcard__list-actions">
               <button
                onClick={handleAddToCart}
                disabled={book.stock === 0}
                className="bookcard__add-to-cart-btn bookcard__add-to-cart-btn--list"
              >
                <ShoppingCart size={16} />
                {book.stock === 0 ? t('outOfStock') : t('addToCart')}
              </button>
            </div>
          </>
        )}

        <div className="bookcard__meta">
          <div className="bookcard__meta-badges">
            <span className="bookcard__category">{book.category}</span>
            {book.code && <span className="bookcard__code">Codigo Ref. {book.code}</span>}
          </div>
          <span className="bookcard__stock">
            {book.stock > 0 ? `${book.stock} ${book.stock === 1 ? t('available_singular') : t('available')}` : t('outOfStock')}
          </span>
        </div>
      </div>
    </Link>
  );
}
