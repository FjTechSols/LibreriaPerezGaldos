import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, Tag } from 'lucide-react';
import { Book } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedBook, getTranslatedCategory } from '../data/mockBooks';
import '../styles/components/BookCard.css';

interface BookCardProps {
  book: Book;
  viewMode?: 'grid' | 'list';
}

export function BookCard({ book, viewMode = 'grid' }: BookCardProps) {
  const { addItem } = useCart();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlist();
  const { language, t } = useLanguage();

  const translatedBook = getTranslatedBook(book, language);

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
    <Link to={`/libro/${book.id}`} className={`bookcard ${viewMode === 'list' ? 'bookcard--list' : ''}`}>
      <div className="bookcard__image-container">
        <img src={translatedBook.coverImage} alt={translatedBook.title} className="bookcard__image" />

        {translatedBook.isNew && <span className="bookcard__badge bookcard__badge--new">{language === 'es' ? 'Nuevo' : language === 'en' ? 'New' : 'Nouveau'}</span>}
        {translatedBook.isOnSale && <span className="bookcard__badge bookcard__badge--sale">{language === 'es' ? 'Oferta' : language === 'en' ? 'Sale' : 'Promo'}</span>}
        {translatedBook.stock === 0 && <span className="bookcard__badge bookcard__badge--stock">{t('outOfStock')}</span>}

        <button
          onClick={handleWishlistToggle}
          className={`bookcard__wishlist-btn ${isInWishlist(book.id) ? 'bookcard__wishlist-btn--active' : ''}`}
          aria-label={isInWishlist(book.id) ? t('removeFromWishlist') : t('addToWishlist')}
          title={isInWishlist(book.id) ? t('removeFromWishlist') : t('addToWishlist')}
        >
          <Heart size={24} fill={isInWishlist(book.id) ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>

        <div className="bookcard__overlay">
          <button
            onClick={handleAddToCart}
            disabled={translatedBook.stock === 0}
            className="bookcard__add-to-cart-btn"
          >
            <ShoppingCart size={16} />
            {translatedBook.stock === 0 ? t('outOfStock') : t('addToCart')}
          </button>
        </div>
      </div>

      <div className="bookcard__info">
        <h3 className="bookcard__title">{translatedBook.title}</h3>
        <p className="bookcard__author">{language === 'es' ? 'por' : language === 'en' ? 'by' : 'par'} {translatedBook.author}</p>

        <div className="bookcard__rating">
          <div className="bookcard__stars">{renderStars(translatedBook.rating)}</div>
          <span className="bookcard__rating-text">({translatedBook.rating})</span>
        </div>

        <div className="bookcard__pricing">
          {translatedBook.isOnSale && translatedBook.originalPrice ? (
            <>
              <span className="bookcard__original-price">${translatedBook.originalPrice}</span>
              <span className="bookcard__sale-price">${translatedBook.price}</span>
              <span className="bookcard__discount">
                <Tag size={14} />
                {Math.round(((translatedBook.originalPrice - translatedBook.price) / translatedBook.originalPrice) * 100)}% OFF
              </span>
            </>
          ) : (
            <span className="bookcard__current-price">${translatedBook.price}</span>
          )}
        </div>

        {viewMode === 'list' && (
          <p className="bookcard__description">{translatedBook.description.substring(0, 120)}...</p>
        )}

        <div className="bookcard__meta">
          <span className="bookcard__category">{translatedBook.category}</span>
          <span className="bookcard__stock">
            {translatedBook.stock > 0 ? `${translatedBook.stock} ${language === 'es' ? 'disponibles' : language === 'en' ? 'available' : 'disponibles'}` : t('outOfStock')}
          </span>
        </div>
      </div>
    </Link>
  );
}
