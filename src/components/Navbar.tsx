import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, BookOpen, Settings, LogOut, ChevronDown, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { LanguageSelector } from './LanguageSelector';
import { buscarLibros } from '../services/libroService';
import { Book } from '../types';
import '../styles/components/Navbar.css';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en tiempo real con debouncing
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 2) {
        setLoadingSuggestions(true);
        try {
          const results = await buscarLibros(searchQuery.trim());
          setSuggestions(results.slice(0, 10));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (book: Book) => {
    navigate(`/libro/${book.id}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const cartCount = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/Logo Exlibris Perez Galdos.png" alt="Logo" className="navbar-logo-img" />
          <span>{settings.company.name}</span>
        </Link>

        <form onSubmit={handleSearch} className="navbar-search" ref={searchContainerRef}>
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Buscar libros, autores, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className="clear-search-btn"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {showSuggestions && (
            <div className="search-suggestions">
              {loadingSuggestions ? (
                <div className="suggestions-loading">
                  <p>Buscando...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  {suggestions.map(book => (
                    <div
                      key={book.id}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(book)}
                    >
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="suggestion-image"
                      />
                      <div className="suggestion-info">
                        <span className="suggestion-title">{book.title}</span>
                        <span className="suggestion-author">{book.author}</span>
                      </div>
                      <span className="suggestion-price">${book.price}</span>
                    </div>
                  ))}
                  <div className="suggestion-footer">
                    <button type="submit" className="view-all-btn">
                      Ver todos los resultados ({suggestions.length}+)
                    </button>
                  </div>
                </>
              ) : (
                <div className="suggestions-empty">
                  <p>No se encontraron resultados</p>
                </div>
              )}
            </div>
          )}
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
                  <div className="account-menu-header">
                    <div className="account-user-info">
                      <User size={20} className="user-avatar-icon" />
                      <div className="user-details">
                        <span className="user-email">{user.email}</span>
                        {user.role && <span className="user-role">{user.role}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="account-menu-divider" />
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/mi-cuenta'}
                    className="account-menu-item"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    <User size={18} />
                    <span>{user.role === 'admin' ? t('adminPanel') : t('myAccount')}</span>
                  </Link>
                  <Link
                    to={user.role === 'admin' ? '/admin/ajustes' : '/ajustes'}
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
              <Link
                to={user.role === 'admin' ? '/admin/ajustes' : '/ajustes'}
                className="mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('settings')}
              </Link>
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