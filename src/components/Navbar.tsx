import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import '../styles/components/Navbar.css';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      // Scroll will be handled by ScrollToTop component
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <BookOpen size={32} />
          <span>Perez Galdos</span>
        </Link>

        <form onSubmit={handleSearch} className="navbar-search">
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Buscar libros, autores, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </form>

        <div className="navbar-links desktop-only">
          <Link to="/catalogo" className="nav-link">{t('catalog')}</Link>
          <Link to="/carrito" className="nav-link cart-link">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <Link to="/wishlist" className="nav-link wishlist-link">
            <Heart size={20} />
            {wishlistItems.length > 0 && <span className="wishlist-badge">{wishlistItems.length}</span>}
          </Link>
          <LanguageSelector />
          {user ? (
            <div className="user-menu">
              <span className="user-greeting">Hola, {user.name}</span>
              <Link to="/mi-cuenta" className="nav-link account-link">
                <User size={20} />
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="nav-link admin-link">Admin</Link>
              )}
              <button onClick={logout} className="logout-btn">{t('logout')}</button>
            </div>
          ) : (
            <Link to="/login" className="nav-link login-link">
              <User size={20} />
              {t('login')}
            </Link>
          )}
        </div>

        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-menu">
          <Link to="/catalogo" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            {t('catalog')}
          </Link>
          <Link to="/carrito" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            {t('cart')} ({cartCount})
          </Link>
          <Link to="/wishlist" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            {t('wishlist')} ({wishlistItems.length})
          </Link>
          <div className="mobile-language-selector">
            <LanguageSelector />
          </div>
          {user ? (
            <>
              <span className="mobile-user">Hola, {user.name}</span>
              <Link to="/mi-cuenta" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                {t('dashboard')}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  Panel Admin
                </Link>
              )}
              <button
                onClick={() => { logout(); setIsMenuOpen(false); }}
                className="mobile-logout"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
              {t('login')}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}