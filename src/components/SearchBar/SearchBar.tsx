import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Book } from '../../types';
import './SearchBar.css';

interface SearchBarProps {
  books: Book[];
  onSearchResults: (results: Book[]) => void;
  placeholder?: string;
}

export function SearchBar({ books, onSearchResults, placeholder = "Buscar libros..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      const normalizedQuery = query.toLowerCase();
      const normalizedISBN = query.replace(/[-\s]/g, ''); // Remove hyphens and spaces for ISBN comparison
      
      const filtered = books.filter(book =>
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase()) ||
        book.category.toLowerCase().includes(query.toLowerCase()) ||
        book.isbn.toLowerCase().includes(normalizedQuery) ||
        book.isbn.replace(/[-\s]/g, '').toLowerCase().includes(normalizedISBN)
      ).slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, books]);

  const handleSearch = (searchQuery: string) => {
    const normalizedQuery = searchQuery.toLowerCase();
    const normalizedISBN = searchQuery.replace(/[-\s]/g, ''); // Remove hyphens and spaces for ISBN comparison
    
    const results = books.filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn.toLowerCase().includes(normalizedQuery) ||
      book.isbn.replace(/[-\s]/g, '').toLowerCase().includes(normalizedISBN)
    );
    onSearchResults(results);
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (book: Book) => {
    setQuery(book.title);
    handleSearch(book.title);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearchResults(books);
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
          onFocus={() => query.trim() && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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

      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(book => (
            <div
              key={book.id}
              className="suggestion-item"
              onMouseDown={() => handleSuggestionClick(book)}
            >
              <img src={book.coverImage} alt={book.title} className="suggestion-image" />
              <div className="suggestion-info">
                <span className="suggestion-title">{book.title}</span>
                <span className="suggestion-author">{book.author}</span>
              </div>
              <span className="suggestion-price">${book.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}