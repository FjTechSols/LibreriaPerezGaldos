import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Sparkles, Tag, MessageCircle } from 'lucide-react';
import { BookCard } from '../components/BookCard';
import { BookCardSkeleton } from '../components/BookCardSkeleton';
import { useLanguage } from '../context/LanguageContext';
import { obtenerLibros } from '../services/libroService';
import { MarketingPopup } from '../components/marketing/MarketingPopup';
import '../styles/pages/Home.css';

export function Home() {
  const { t } = useLanguage();
  const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);
  const [newBooks, setNewBooks] = useState<any[]>([]);
  const [saleBooks, setSaleBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        // Cargar secciones específicas desde la base de datos
        // 10 libros, solo en stock, ordenados por actualización (para reflejar cambios de curation)
        const commonFilters = { 
          availability: 'inStock' as const, 
          sortBy: 'updated' as const, 
          sortOrder: 'desc' as const 
        };

        const [featured, newRelease, sale] = await Promise.all([
          obtenerLibros(1, 30, { ...commonFilters, featured: true }),
          obtenerLibros(1, 30, { ...commonFilters, isNew: true }),
          obtenerLibros(1, 30, { ...commonFilters, isOnSale: true })
        ]);

        // Helper function to deduplicate by title
        const getUniqueBooks = (books: any[], limit: number) => {
          const seen = new Set();
          const unique = [];
          
          for (const book of books) {
            // Normalize title to ignore case and minor spacing differences
            const normalizedTitle = book.title.toLowerCase().trim();
            
            if (!seen.has(normalizedTitle)) {
              seen.add(normalizedTitle);
              unique.push(book);
              
              if (unique.length >= limit) break;
            }
          }
          return unique;
        };

        setFeaturedBooks(getUniqueBooks(featured.data, 10));
        setNewBooks(getUniqueBooks(newRelease.data, 10));
        setSaleBooks(getUniqueBooks(sale.data, 10));
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBooks();
  }, []);

  return (
    <div className="home">
      <MarketingPopup />
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
            <img src="https://estaticos.esmadrid.com/cdn/farfuture/AZP1rWLWrwssQvRGRV5dqaObIyWEN3Lazwu5vH8TyjE/mtime:1646732851/sites/default/files/styles/content_type_full/public/recursosturisticos/compras/perez_galdos.jpg?itok=ZR2_WSL4" 
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
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))
            ) : featuredBooks.length > 0 ? (
              featuredBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))
            ) : (
              <p>No hay libros destacados disponibles.</p>
            )}
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
            <Link to="/catalogo?isNew=true" className="section-link">
              {t('viewAllReleases')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="books-grid">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))
            ) : newBooks.length > 0 ? (
              newBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))
            ) : (
              <p>No hay novedades disponibles.</p>
            )}
          </div>
        </div>
      </section>

      <section className="request-book-section">
        <div className="section-container request-book-container">
          <div className="request-book-content">
            <h3>{t('cantFindBook')}</h3>
            <p>{t('contactUsHelper')}</p>
          </div>
          <Link to="/contacto" className="request-book-btn">
            {t('contactBtn')} <MessageCircle size={20} />
          </Link>
        </div>
      </section>

      <section className="sale-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-title-group">
              <Tag className="section-icon" size={24} />
              <h2 className="section-title">{t('specialOffers')}</h2>
            </div>
            <Link to="/catalogo?onSale=true" className="section-link">
              {t('viewOffers')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="books-grid">
            {loading ? (
              <p>Cargando libros...</p>
            ) : saleBooks.length > 0 ? (
              saleBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon">
                  <Tag size={40} />
                </div>
                <h3>{t('noOffersTitle') || 'No hay ofertas activas por el momento'}</h3>
                <p>{t('noOffersDesc') || 'Estamos seleccionando las mejores promociones para ti. Mientras tanto, explora nuestra colección completa.'}</p>
                <Link to="/catalogo" className="state-btn">
                  {t('exploreCatalog')} <ArrowRight size={16} />
                </Link>
              </div>
            )}
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
