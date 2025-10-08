import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Sparkles, Tag } from 'lucide-react';
import { BookCard } from '../components/BookCard';
import { mockBooks } from '../data/mockBooks';
import { useLanguage } from '../context/LanguageContext';
import '../styles/pages/Home.css';

export function Home() {
  const { t } = useLanguage();
  const featuredBooks = mockBooks.filter(book => book.featured);
  const newBooks = mockBooks.filter(book => book.isNew);
  const saleBooks = mockBooks.filter(book => book.isOnSale);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              {t('heroTitle')}
              <span className="hero-highlight"> {t('heroHighlight')}</span>
            </h1>
            <p className="hero-subtitle">
              {t('heroSubtitle')}
            </p>
            <div className="hero-actions">
              <Link to="/catalogo" className="hero-btn primary">
                {t('exploreCatalog')}
                <ArrowRight size={20} />
              </Link>
              <Link to="/catalogo?featured=true" className="hero-btn secondary">
                {t('viewFeatured')}
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img 
              src="https://lh3.googleusercontent.com/gps-cs-s/AC9h4nqlMhjjZBuPwDEYpS20tNOXU1UnOKwetbRkAFCo5sWJCjGblUqfCCvE7a1LmaOLP4Hj4j2QDqZZgMEJh6UpLmfrNslvNkzjtmB3SYCNfcowL4EKC2XzgmA8mFUUZYsk6upINu4mpB60-QA=s1360-w1360-h1020-rw" 
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
              <h2 className="section-title">{t('featuredBooks')}</h2>
            </div>
            <Link to="/catalogo?featured=true" className="section-link">
              {t('viewAll')} <ArrowRight size={16} />
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
              <h2 className="section-title">{t('latestReleases')}</h2>
            </div>
            <Link to="/catalogo?new=true" className="section-link">
              {t('viewAllReleases')} <ArrowRight size={16} />
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
              <h2 className="section-title">{t('specialOffers')}</h2>
            </div>
            <Link to="/catalogo?sale=true" className="section-link">
              {t('viewOffers')} <ArrowRight size={16} />
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
            <h2 className="cta-title">{t('newToLibrary')}</h2>
            <p className="cta-subtitle">
              {t('joinCommunity')}
            </p>
            <Link to="/register" className="cta-btn">
              {t('registerFree')}
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}