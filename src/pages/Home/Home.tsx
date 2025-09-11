import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Sparkles, Tag } from 'lucide-react';
import { BookCard } from '../../components/BookCard/BookCard';
import { mockBooks } from '../../data/mockBooks';
import './Home.css';

export function Home() {
  const featuredBooks = mockBooks.filter(book => book.featured);
  const newBooks = mockBooks.filter(book => book.isNew);
  const saleBooks = mockBooks.filter(book => book.isOnSale);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Descubre tu próxima
              <span className="hero-highlight"> gran lectura</span>
            </h1>
            <p className="hero-subtitle">
              Miles de libros esperándote. Desde clásicos atemporales hasta las últimas novedades.
              Encuentra historias que transformarán tu mundo.
            </p>
            <div className="hero-actions">
              <Link to="/catalogo" className="hero-btn primary">
                Explorar Catálogo
                <ArrowRight size={20} />
              </Link>
              <Link to="/catalogo?featured=true" className="hero-btn secondary">
                Ver Destacados
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img 
              src="https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=600" 
              alt="Biblioteca con libros"
              className="hero-img"
            />
          </div>
        </div>
      </section>

      <section className="featured-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-title-group">
              <Sparkles className="section-icon" size={24} />
              <h2 className="section-title">Libros Destacados</h2>
            </div>
            <Link to="/catalogo?featured=true" className="section-link">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          <div className="books-grid">
            {featuredBooks.slice(0, 4).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      <section className="new-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-title-group">
              <TrendingUp className="section-icon" size={24} />
              <h2 className="section-title">Últimas Novedades</h2>
            </div>
            <Link to="/catalogo?new=true" className="section-link">
              Ver todas <ArrowRight size={16} />
            </Link>
          </div>
          <div className="books-grid">
            {newBooks.slice(0, 4).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      <section className="sale-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-title-group">
              <Tag className="section-icon" size={24} />
              <h2 className="section-title">Ofertas Especiales</h2>
            </div>
            <Link to="/catalogo?sale=true" className="section-link">
              Ver ofertas <ArrowRight size={16} />
            </Link>
          </div>
          <div className="books-grid">
            {saleBooks.slice(0, 4).map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">¿Nuevo en nuestra librería?</h2>
            <p className="cta-subtitle">
              Únete a nuestra comunidad de lectores y disfruta de beneficios exclusivos, 
              descuentos especiales y recomendaciones personalizadas.
            </p>
            <Link to="/register" className="cta-btn">
              Registrarse Gratis
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}