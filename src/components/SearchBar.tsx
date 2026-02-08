import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { buscarLibros } from '../services/libroService';
import { Book } from '../types';
import '../styles/components/SearchBar.css';

interface SearchBarProps {
  placeholder?: string;
  mode?: 'sync' | 'navigate';
  variant?: 'catalog' | 'header';
  showSuggestions?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({ 
  placeholder = "Buscar libros...", 
  mode = 'sync',
  variant = 'catalog',
  showSuggestions = false,
  onSearch,
  className = ''
}: SearchBarProps) {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = mode === 'sync' ? (searchParams.get('search') || '') : '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync internal state if URL changes externally (only for sync mode)
  useEffect(() => {
    if (mode === 'sync') {
      const urlQuery = searchParams.get('search') || '';
      if (urlQuery !== query && urlQuery !== debouncedQuery) {
          setQuery(urlQuery);
      }
    }
  }, [searchParams, mode]);

  // Click outside to hide suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSuggestionsVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // Unified 400ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Handle URL sync (Catalog mode)
  useEffect(() => {
    if (mode !== 'sync') return;

    const currentSearch = searchParams.get('search') || '';
    if (debouncedQuery !== currentSearch) {
        const nextParams = new URLSearchParams(searchParams);
        if (debouncedQuery.trim()) {
            nextParams.set('search', debouncedQuery);
        } else {
            nextParams.delete('search');
        }
        setSearchParams(nextParams);
    }
  }, [debouncedQuery, mode, searchParams, setSearchParams]);

  // Handle Suggestions
  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      setIsSuggestionsVisible(false);
      return;
    }

    if (debouncedQuery.trim().length >= 2) {
      const controller = new AbortController(); // Create abort controller
      const signal = controller.signal;

      const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
          // Note: AbortController support needs to be added to buscarLibros if strictly needed,
          // but for now we simply ignore the result if component unmounted or query changed invalidating the effect cleanup.
          // Since buscarLibros is not taking signal yet, we handle race conditions via effect cleanup flag or by comparing query.
          
          const results = await buscarLibros(debouncedQuery.trim());
          
          if (!signal.aborted) {
             setSuggestions(results.slice(0, 8));
             setIsSuggestionsVisible(results.length > 0);
          }
        } catch (error) {
          if (!signal.aborted) {
             console.error('Error fetching suggestions:', error);
             setSuggestions([]);
          }
        } finally {
          if (!signal.aborted) {
             setLoadingSuggestions(false);
          }
        }
      };

      fetchSuggestions();

      return () => {
        controller.abort(); // Cancel this request if query changes
      };
    } else {
      setSuggestions([]);
      setIsSuggestionsVisible(false);
    }
  }, [debouncedQuery, showSuggestions]);


  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setIsSuggestionsVisible(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalQuery = query.trim();
    if (!finalQuery) return;

    if (onSearch) {
      onSearch(finalQuery);
    }

    if (mode === 'navigate') {
      navigate(`/catalogo?search=${encodeURIComponent(finalQuery)}`);
      setQuery(''); // Reset on navigate (header use case)
    }
    
    setIsSuggestionsVisible(false);
  };

  const handleSuggestionClick = (book: Book) => {
    navigate(`/libro/${book.id}`);
    setQuery('');
    setIsSuggestionsVisible(false);
  };

  return (
    <div className={`search-bar-container variant-${variant} ${className}`} ref={searchRef}>
      <form onSubmit={handleSubmit} className="search-bar" aria-label="Explorar catálogo">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => showSuggestions && query.trim().length >= 2 && setIsSuggestionsVisible(true)}
          placeholder={placeholder}
          className="search-input"
        />
        {query && (
          <button 
            type="button" 
            onClick={clearSearch}
            className="clear-btn"
            aria-label="Limpiar búsqueda"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {showSuggestions && isSuggestionsVisible && (
        <div className="search-suggestions">
          {loadingSuggestions ? (
            <div className="suggestions-loading">{t('searching')}</div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map(book => (
                <div
                  key={book.id}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(book)}
                >
                  <img src={book.coverImage} alt={book.title} className="suggestion-image" />
                  <div className="suggestion-info">
                    <span className="suggestion-title">{book.title}</span>
                    <span className="suggestion-author">{book.author}</span>
                  </div>
                  <span className="suggestion-price">${book.price}</span>
                </div>
              ))}
              <div className="suggestion-footer">
                <button type="submit" onClick={handleSubmit} className="view-all-btn">
                  {t('viewAllResults')} ({suggestions.length}+)
                </button>
              </div>
            </>
          ) : (
            <div className="suggestions-empty">{t('noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
}
