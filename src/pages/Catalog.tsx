import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookCard } from '../components/BookCard';
import { SearchBar } from '../components/SearchBar';
import { BookFilter } from '../components/BookFilter';
import { Pagination } from '../components/Pagination';
import { Book, FilterState } from '../types';
import { obtenerLibros } from '../services/libroService';
import { useSettings } from '../context/SettingsContext';
import '../styles/pages/Catalog.css';

export function Catalog() {
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(settings.system.itemsPerPageCatalog);
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || 'Todos',
    priceRange: [0, 1000],
    availability: 'all',
    sortBy: 'title',
    sortOrder: 'asc'
  });

  // Cargar libros desde la base de datos (sin límite para catálogo completo)
  useEffect(() => {
    const loadBooks = async () => {
      try {
        // Cargar todos los libros para el catálogo
        const libros = await obtenerLibros();
        setBooks(libros);
        setFilteredBooks(libros);
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBooks();
  }, []);

  useEffect(() => {
    let filtered = [...books];

    // Apply search query from URL
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase();
      const normalizedISBN = searchQuery.replace(/[-\s]/g, ''); // Remove hyphens and spaces for ISBN comparison
      
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.toLowerCase().includes(normalizedQuery) ||
        book.isbn.replace(/[-\s]/g, '').toLowerCase().includes(normalizedISBN)
      );
    }

    // Apply filters
    if (filters.category !== 'Todos') {
      filtered = filtered.filter(book => book.category === filters.category);
    }

    if (filters.availability === 'inStock') {
      filtered = filtered.filter(book => book.stock > 0);
    } else if (filters.availability === 'outOfStock') {
      filtered = filtered.filter(book => book.stock === 0);
    }

    filtered = filtered.filter(book => 
      book.price >= filters.priceRange[0] && book.price <= filters.priceRange[1]
    );

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'newest':
          aValue = a.isNew ? 1 : 0;
          bValue = b.isNew ? 1 : 0;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (filters.sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    setFilteredBooks(filtered);
    setCurrentPage(1);
  }, [books, filters, searchParams]);

  const handleSearchResults = (results: Book[]) => {
    setBooks(results);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    setTimeout(() => {
      const resultsElement = document.querySelector('.catalog-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  return (
    <div className="catalog">
      <div className="catalog-container">
        <div className="catalog-header">
          <h1 className="catalog-title">Catálogo de Libros</h1>
          <p className="catalog-subtitle">
            Descubre nuestra amplia colección de {books.length} libros
          </p>
        </div>

        <div className="search-section">
          <SearchBar 
            books={books} 
            onSearchResults={handleSearchResults}
            placeholder="Buscar por título, autor, categoría o ISBN..."
          />
        </div>

        <BookFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="catalog-results">
          <div className="results-header">
            <span className="results-count">
              {filteredBooks.length} libro{filteredBooks.length !== 1 ? 's' : ''} encontrado{filteredBooks.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className={`books-container ${viewMode}`}>
            {currentBooks.map(book => (
              <BookCard key={book.id} book={book} viewMode={viewMode} />
            ))}
          </div>

          {filteredBooks.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredBooks.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              showItemsPerPageSelector={true}
              itemsPerPageOptions={[10, 25, 50]}
            />
          )}

          {filteredBooks.length === 0 && (
            <div className="no-results">
              <div className="no-results-content">
                <h3>No se encontraron libros</h3>
                <p>Intenta ajustar tus filtros o términos de búsqueda</p>
                <button 
                  onClick={() => {
                    setFilters({
                      category: 'Todos',
                      priceRange: [0, 1000],
                      availability: 'all',
                      sortBy: 'title',
                      sortOrder: 'asc'
                    });
                    // Reset filtros
                  }}
                  className="reset-btn"
                >
                  Mostrar todos los libros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}