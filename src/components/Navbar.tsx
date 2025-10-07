import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, BookOpen, Settings, LogOut, ChevronDown, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSelector } from './LanguageSelector';
import '../styles/components/Navbar.css';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <Link to="/wishlist" className="nav-link wishlist-link">
            <Heart size={20} />
            {wishlistItems.length > 0 && <span className="wishlist-badge">{wishlistItems.length}</span>}
          </Link>
          <LanguageSelector />
          {user ? (
            <div className="account-dropdown" ref={accountMenuRef}>
              <button
                className="account-btn"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              >
                <User size={20} />
                <span>{t('account')}</span>
                <ChevronDown size={16} className={`chevron ${isAccountMenuOpen ? 'open' : ''}`} />
              </button>
              {isAccountMenuOpen && (
                <div className="account-menu">
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/mi-cuenta'}
                    className="account-menu-item"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <User size={18} />
                    <span>{user.role === 'admin' ? t('adminPanel') : t('myAccount')}</span>
                  </Link>
                  <Link
                    to="/ajustes"
                    className="account-menu-item"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <Settings size={18} />
                    <span>{t('settings')}</span>
                  </Link>
                  <div className="account-menu-divider" />
                  <div className="theme-selector">
                    <span className="theme-label">Tema:</span>
                    <div className="theme-buttons">
                      <button
                        onClick={() => setTheme('light')}
                        className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                        title="Modo claro"
                      >
                        <Sun size={16} />
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                        title="Modo oscuro"
                      >
                        <Moon size={16} />
                      </button>
                      <button
                        onClick={() => setTheme('auto')}
                        className={`theme-btn ${theme === 'auto' ? 'active' : ''}`}
                        title="Automático"
                      >
                        <Monitor size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="account-menu-divider" />
                  <button
                    onClick={() => { logout(); setIsAccountMenuOpen(false); }}
                    className="account-menu-item logout"
                  >
                    <LogOut size={18} />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-link login-link">
              <User size={20} />
              {t('login')}
            </Link>
          )}
          <Link to="/carrito" className="nav-link cart-link">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
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
          <div className="mobile-theme-selector">
            <span className="mobile-theme-label">Tema:</span>
            <div className="mobile-theme-buttons">
              <button
                onClick={() => setTheme('light')}
                className={`mobile-theme-btn ${theme === 'light' ? 'active' : ''}`}
              >
                <Sun size={18} />
                <span>Claro</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`mobile-theme-btn ${theme === 'dark' ? 'active' : ''}`}
              >
                <Moon size={18} />
                <span>Oscuro</span>
              </button>
              <button
                onClick={() => setTheme('auto')}
                className={`mobile-theme-btn ${theme === 'auto' ? 'active' : ''}`}
              >
                <Monitor size={18} />
                <span>Auto</span>
              </button>
            </div>
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