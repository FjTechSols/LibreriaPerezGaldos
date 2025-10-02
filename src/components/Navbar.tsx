import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import '../styles/components/Navbar.css';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();
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
          <Link to="/catalogo" className="nav-link">Catálogo</Link>
          <Link to="/carrito" className="nav-link cart-link">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <Link to="/wishlist" className="nav-link wishlist-link">
            <Heart size={20} />
            {wishlistItems.length > 0 && <span className="wishlist-badge">{wishlistItems.length}</span>}
          </Link>
          {user ? (
            <div className="user-menu">
              <span className="user-greeting">Hola, {user.name}</span>
              <Link to="/mi-cuenta" className="nav-link account-link">
                <User size={20} />
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="nav-link admin-link">Admin</Link>
              )}
              <button onClick={logout} className="logout-btn">Salir</button>
            </div>
          ) : (
            <Link to="/login" className="nav-link login-link">
              <User size={20} />
              Iniciar Sesión
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
            Catálogo
          </Link>
          <Link to="/carrito" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            Carrito ({cartCount})
          </Link>
          <Link to="/wishlist" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
            Lista de Deseos ({wishlistItems.length})
          </Link>
          {user ? (
            <>
              <span className="mobile-user">Hola, {user.name}</span>
              <Link to="/mi-cuenta" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
                Mi Cuenta
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
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-link" onClick={() => setIsMenuOpen(false)}>
              Iniciar Sesión
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}