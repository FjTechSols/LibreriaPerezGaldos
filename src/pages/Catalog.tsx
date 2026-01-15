import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookCard } from '../components/BookCard';
import { SearchBar } from '../components/SearchBar';
import { BookFilter } from '../components/BookFilter';
import { Pagination } from '../components/Pagination';
import { Book, FilterState } from '../types';
import { obtenerLibros, obtenerTotalLibros, obtenerSugerenciaOrtografica } from '../services/libroService'; // Import added
import { useSettings } from '../context/SettingsContext';
import { BookCardSkeleton } from '../components/BookCardSkeleton';
import '../styles/pages/Catalog.css';

export function Catalog() {
  const [searchParams] = useSearchParams(); // Removed unused setSearchParams
  const { settings } = useSettings();
  const [books, setBooks] = useState<Book[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null); // State for modification
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(settings?.system?.itemsPerPageCatalog || 12);
  
  // Update itemsPerPage if settings load later
  useEffect(() => {
    if (settings?.system?.itemsPerPageCatalog) {
      setItemsPerPage(settings.system.itemsPerPageCatalog);
    }
  }, [settings]);
  
  // Counts
  const [totalFilteredBooks, setTotalFilteredBooks] = useState(0);
  const [totalDatabaseBooks, setTotalDatabaseBooks] = useState(0);

  // Helper to parse legacy category params as flags
  const categoryParam = searchParams.get('category');
  const isOfertas = categoryParam === 'Ofertas';
  const isNovedades = categoryParam === 'Novedades';
  const initialCategory = (isOfertas || isNovedades) ? 'Todos' : (categoryParam || 'Todos');

  const [filters, setFilters] = useState<FilterState>({
    category: initialCategory,
    priceRange: [0, 1000],
    availability: 'inStock', /* Default: Hide Out of Stock */
    sortBy: 'default',
    sortOrder: 'asc',
    featured: searchParams.get('featured') === 'true',
    onSale: searchParams.get('onSale') === 'true' || isOfertas,
    isNew: searchParams.get('isNew') === 'true' || isNovedades
  });

  // Load Total Database Count Once
  useEffect(() => {
     const loadTotalCount = async () => {
         try {
             // Try to fetch total count. If 0 (error), fallback to 0.
             const count = await obtenerTotalLibros();
             setTotalDatabaseBooks(count);
         } catch (e) { console.error('Error loading total count:', e); }
     };
     loadTotalCount();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchBooks = async () => {
      setLoading(true);
      setSuggestion(null); // Reset suggestion on new fetch
      try {
        // ... (filters setup)
        const serviceFilters = {
            search: searchParams.get('search') || undefined,
            // ... (other filters)
            category: filters.category,
            minPrice: filters.priceRange[0],
            maxPrice: filters.priceRange[1],
            availability: filters.availability,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            featured: filters.featured,
            isOnSale: filters.onSale, 
            isNew: filters.isNew
        };

        const { data, count } = await obtenerLibros(currentPage, itemsPerPage, serviceFilters);
        
        if (!controller.signal.aborted) {
            setBooks(data);
            
            // Check for spelling suggestion if ZERO results and SEARCH term exists
            if (data.length === 0 && serviceFilters.search) {
                 // Only verify if we are on page 1, otherwise it might just be end of pagination
                 if (currentPage === 1) {
                     const spelling = await obtenerSugerenciaOrtografica(serviceFilters.search);
                     console.log('Spelling suggestion result:', spelling); // DEBUG LOG
                     if (spelling && !controller.signal.aborted) {
                         setSuggestion(spelling);
                     }
                 }
            }

            // ... (rest of logic for counts)
             const isDefaultView = !filters.category || filters.category === 'Todos';
            const searchTerm = searchParams.get('search');
            const isTrulyDefault = isDefaultView && !searchTerm && (!filters.priceRange || (filters.priceRange[0] === 0 && filters.priceRange[1] === 1000)) && !filters.featured && !filters.isNew && !filters.onSale;
            
            if (isTrulyDefault) {
                if (totalDatabaseBooks > 0) {
                     setTotalFilteredBooks(totalDatabaseBooks);
                } 
            } else {
                 setTotalFilteredBooks(count);
            }
        }
        
      } catch (error) {
         // ... error handling
         if (!controller.signal.aborted) {
            console.error('Error loading books:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
            setLoading(false);
        }
      }
    };

    fetchBooks();
    
    // ... cleanup
    return () => {
        controller.abort();
    };
  }, [currentPage, itemsPerPage, filters, searchParams, totalDatabaseBooks]);




  // Sync total filtered with total database when default view is active and DB count updates
  // This handles the case where books load faster than the total count, or vice versa.
  useEffect(() => {
     const isDefaultView = !filters.category || filters.category === 'Todos';
     const searchTerm = searchParams.get('search');
     const isTrulyDefault = isDefaultView && !searchTerm && (!filters.priceRange || (filters.priceRange[0] === 0 && filters.priceRange[1] === 1000)) && !filters.featured && !filters.isNew && !filters.onSale;

     if (isTrulyDefault && totalDatabaseBooks > 0) {
         setTotalFilteredBooks(totalDatabaseBooks);
     }
  }, [totalDatabaseBooks, filters, searchParams]);

  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // derived state for pagination... calculated from totalFilteredBooks
  const totalPages = Math.ceil(totalFilteredBooks / itemsPerPage);

  return (
    <div className="catalog">
      <div className="catalog-container">
        <div className="catalog-header">
          <h1 className="catalog-title">Catálogo de Libros</h1>
          <p className="catalog-subtitle">
            Descubre nuestra amplia colección de {totalDatabaseBooks} libros
          </p>
        </div>

        <div className="search-section">
           <SearchBar 
            placeholder="Buscar por título, autor, categoría, ISBN o código..."
          />
        </div>

        {suggestion && (
            <div className="suggestion-box">
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <p>
                    No encontramos "{searchParams.get('search')}". ¿Quizás quisiste decir: 
                    <button 
                        className="suggestion-button"
                        onClick={() => {
                            const params = new URLSearchParams(searchParams);
                            params.set('search', suggestion);
                            window.location.search = params.toString();
                        }}
                    >
                        {suggestion}
                    </button>
                    ?
                </p>
            </div>
        )}

        <BookFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="catalog-results">
          <div className="results-header">
            <span className="results-count">
              {totalFilteredBooks} libros encontrados
            </span>
          </div>

          {loading ? (
             <div className={`books-container ${viewMode}`}>
                {Array.from({ length: itemsPerPage }).map((_, i) => (
                    <BookCardSkeleton key={i} />
                ))}
             </div>
          ) : (
            <>
              <div className={`books-container ${viewMode}`}>
                {books.map(book => (
                  <BookCard key={book.id} book={book} viewMode={viewMode} />
                ))}
              </div>

              {books.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalFilteredBooks}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  showItemsPerPageSelector={true}
                  itemsPerPageOptions={[10, 25, 50]}
                />
              )}

              {books.length === 0 && (
                <div className="no-results">
                  <div className="no-results-content">
                    <h3>No se encontraron libros</h3>
                    <p>Intenta ajustar tus filtros o términos de búsqueda</p>
                    <button 
                      onClick={() => {
                        setFilters({
                          category: 'Todos',
                          priceRange: [0, 1000],
                          availability: 'inStock',
                          sortBy: 'default',
                          sortOrder: 'asc',
                          featured: false,
                          onSale: false,
                          isNew: false
                        });
                        // Clear search too
                        const url = new URL(window.location.href);
                        url.searchParams.delete('search');
                        window.history.pushState({}, '', url);
                        window.location.href = '/catalogo';
                      }}
                      className="reset-btn"
                    >
                        Limpiar filtros y búsqueda
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}