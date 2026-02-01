import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, X, BookOpen, Settings, LogOut, ChevronDown, Sun, Moon, Monitor, Info, MapPin, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { LanguageSelector } from './LanguageSelector';
import { SearchBar } from './SearchBar';
import { getUnreadCount, getAdminUnreadCount } from '../services/notificationService';
import '../styles/components/Navbar.css';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { user, logout, hasRole, isAdmin } = useAuth();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings } = useSettings();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        // SearchBar handles its own click-outside, so we don't strictly need to do it here for suggestions.
        // But if we had other logic, we'd keep it.
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search handled by SearchBar component

  const cartCount = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  // Fetch unread notifications count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (user) {
        try {
          // Use admin-specific function for admins, regular function for users
          const count = isAdmin
            ? await getAdminUnreadCount(user.id)
            : await getUnreadCount(user.id);
          setUnreadNotifications(count);
        } catch (error) {
          console.error('Error fetching notification count:', error);
        }
      }
    };

    fetchNotificationCount();
    // Refresh every 10 seconds for more responsive updates
    const interval = setInterval(fetchNotificationCount, 10000);
    return () => clearInterval(interval);
  }, [user, hasRole]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/Logo Exlibris Perez Galdos.png" alt="Logo" className="navbar-logo-img" />
          <span>{settings.company.name}</span>
        </Link>

        <SearchBar 
          mode="navigate" 
          variant="header"
          showSuggestions={true} 
          placeholder="Buscar por título, autor, ISBN o código..."
          className="navbar-search"
        />

        <div className="navbar-links desktop-only">
          <div className="nav-dropdown-container">
            <button className="nav-dropdown-btn">
              {t('catalog')}
              <ChevronDown size={14} />
            </button>
            <div className="nav-dropdown-menu">
              <Link to="/catalogo" className="nav-dropdown-item">
                <BookOpen size={18} className="nav-dropdown-icon" />
                {t('viewAllCatalog')}
              </Link>
              <Link to="/nosotros" className="nav-dropdown-item">
                <Info size={18} className="nav-dropdown-icon" />
                {t('aboutUs')}
              </Link>
              <Link to="/ubicacion" className="nav-dropdown-item">
                <MapPin size={18} className="nav-dropdown-icon" />
                {t('location')}
              </Link>
              <Link to="/contacto" className="nav-dropdown-item">
                <Mail size={18} className="nav-dropdown-icon" />
                {t('contact')}
              </Link>
            </div>
          </div>
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
                <div className="account-btn-icon">
                  <User size={20} />
                  {unreadNotifications > 0 && <span className="notification-dot"></span>}
                </div>
                <span>{t('account')}</span>
                <ChevronDown size={16} className={`chevron ${isAccountMenuOpen ? 'open' : ''}`} />
              </button>
              {isAccountMenuOpen && (
                <div className="account-menu">
                  <div className="account-menu-header">
                      <div className="account-user-info">
                      <User size={20} className="user-avatar-icon" />
                      <div className="user-details">
                        <span className="user-email">{user.username || user.email}</span>
                        {user.rolPrincipal && <span className="user-role">{user.rolPrincipal.nombre.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="account-menu-divider" />
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="account-menu-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <User size={18} />
                      <span>{t('adminPanel')}</span>
                      {unreadNotifications > 0 && (
                        <span className="notification-count">{unreadNotifications}</span>
                      )}
                    </Link>
                  )}
                  {hasRole('usuario') && (
                    <Link
                      to="/mi-cuenta"
                      className="account-menu-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <User size={18} />
                      <span>{t('myAccount')}</span>
                      {unreadNotifications > 0 && (
                        <span className="notification-count">{unreadNotifications}</span>
                      )}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin/ajustes"
                      className="account-menu-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <Settings size={18} />
                      <span>{t('adminSettings')}</span>
                    </Link>
                  )}
                  {hasRole('usuario') && (
                    <Link
                      to="/ajustes"
                      className="account-menu-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <Settings size={18} />
                      <span>{t('settings')}</span>
                    </Link>
                  )}
                  <div className="account-menu-divider" />
                  <div className="theme-selector">
                    <span className="theme-label">{t('theme')}:</span>
                    <div className="theme-buttons">
                      <button
                        onClick={() => setTheme('light')}
                        className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                        title={t('lightMode')}
                      >
                        <Sun size={16} />
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                        title={t('darkMode')}
                      >
                        <Moon size={16} />
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                        title={t('systemMode')}
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
          <Link to="/nosotros" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            {t('aboutUs')}
          </Link>
          <Link to="/ubicacion" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            {t('location')}
          </Link>
          <Link to="/contacto" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            {t('contact')}
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
            <span className="mobile-theme-label">{t('theme')}:</span>
            <div className="mobile-theme-buttons">
              <button
                onClick={() => setTheme('light')}
                className={`mobile-theme-btn ${theme === 'light' ? 'active' : ''}`}
              >
                <Sun size={18} />
                <span>{t('light')}</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`mobile-theme-btn ${theme === 'dark' ? 'active' : ''}`}
              >
                <Moon size={18} />
                <span>{t('dark')}</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`mobile-theme-btn ${theme === 'system' ? 'active' : ''}`}
              >
                <Monitor size={18} />
                <span>{t('system')}</span>
              </button>
            </div>
          </div>
          {user ? (
            <>
              <span className="mobile-user">{t('hello')}, {user.name}</span>
              {hasRole('usuario') && (
                <Link to="/mi-cuenta" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  {t('dashboard')}
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  {t('adminPanel')}
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin/ajustes" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                  {t('adminSettings')}
                </Link>
              )}
              {hasRole('usuario') && (
                <Link
                  to="/ajustes"
                  className="mobile-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('settings')}
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
