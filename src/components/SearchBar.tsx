import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import '../styles/components/SearchBar.css';

interface SearchBarProps {
  placeholder?: string;
}

export function SearchBar({ placeholder = "Buscar libros..." }: SearchBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('search') || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Sync internal state if URL changes externally
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    if (urlQuery !== query && urlQuery !== debouncedQuery) {
        setQuery(urlQuery);
    }
  }, [searchParams]);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Update URL when debounced query changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedQuery !== currentSearch) {
        if (debouncedQuery.trim()) {
            searchParams.set('search', debouncedQuery);
        } else {
            searchParams.delete('search');
        }
        // Preserve other filters if they exist? Usually search resets strict filters, but let's keep them if compatible.
        // But Catalog logic might reset page to 1 on search change which is good.
        setSearchParams(searchParams);
    }
  }, [debouncedQuery, searchParams, setSearchParams]);


  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery(''); // Immediate clear
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query); // Force update immediately on enter
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-bar">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
    </div>
  );
}