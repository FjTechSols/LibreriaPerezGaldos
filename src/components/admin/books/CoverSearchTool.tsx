import { useState, useEffect } from 'react';
import { Search, Check, Loader, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Book } from '../../../types';
import { obtenerLibrosSinPortada, actualizarLibro } from '../../../services/libroService';
import { searchBookCover } from '../../../services/coverService';
import '../../../styles/components/GestionISBN.css'; // Reusing styles from GestionISBN as structure is identical

export function CoverSearchTool() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const [results, setResults] = useState<Map<string, string>>(new Map()); // bookId -> url
  
  // Search inputs state
  const [searchInputs, setSearchInputs] = useState<Map<string, {
    isbn: string;
    title: string;
    author: string;
    year: string;
  }>>(new Map());

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await obtenerLibrosSinPortada();
      setBooks(data);
      
      // Initialize inputs
      const initialInputs = new Map();
      data.forEach(book => {
        initialInputs.set(book.id, {
          isbn: book.isbn || '',
          title: book.title || '',
          author: book.author || '',
          year: book.publicationYear?.toString() || ''
        });
      });
      setSearchInputs(initialInputs);
      
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (bookId: string, field: string, value: string) => {
    setSearchInputs(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(bookId) || { isbn: '', title: '', author: '', year: '' };
      newMap.set(bookId, { ...current, [field]: value });
      return newMap;
    });
  };

  const searchCover = async (bookId: string) => {
    setProcessingIds(prev => new Set(prev).add(bookId));
    
    try {
      const inputs = searchInputs.get(bookId);
      if (!inputs) return;

      const url = await searchBookCover({
        isbn: inputs.isbn,
        title: inputs.title,
        author: inputs.author,
        year: inputs.year
      });

      if (url) {
        setResults(prev => new Map(prev).set(bookId, url));

      } else {
        // Clear result if exists to show error/empty
        setResults(prev => {
            const m = new Map(prev);
            m.delete(bookId);
            return m;
        });

      }
    } catch (error) {
      console.error('Error searching cover:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  const saveCover = async (bookId: string) => {
    const url = results.get(bookId);
    if (!url) return;

    setProcessingIds(prev => new Set(prev).add(bookId));
    
    try {
      // We pass only the field we want to update
      // But actualizarLibro expects Partial<LibroSupabase> logic inside service (which calls update).
      // Our util mapLibroToBook is from DB -> Frontend. 
      // The update function takes an object compatible with DB columns mapping.
      // Let's check updateLibro signature. It takes `libro: Partial<LibroSupabase>`.
      // `imagen_url` is the field.
      
      const result = await actualizarLibro(parseInt(bookId), { imagen_url: url });
      
      if (result) {
        setBooks(prev => prev.filter(b => b.id !== bookId));
        setResults(prev => {
          const m = new Map(prev);
          m.delete(bookId);
          return m;
        });
      }
    } catch (error) {
      console.error('Error saving cover:', error);
      alert('Error al guardar la portada');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  const searchAll = async () => {
    for (const book of books) {
      if (!results.has(book.id)) {
        await searchCover(book.id);
        await new Promise(r => setTimeout(r, 500)); // Rate limit
      }
    }
  };

  if (loading) {
    return (
      <div className="gestion-isbn-container">
        <div className="loading-state">
          <Loader className="spin" size={40} />
          <p>Cargando libros sin portada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-isbn-container">
      <div className="isbn-header">
        <div>
          <h2 className="isbn-title">Buscador de Portadas</h2>
          <p className="isbn-subtitle">
            {books.length} libros pendientes de imagen
          </p>
        </div>
        <div className="isbn-actions">
          <button onClick={loadBooks} className="btn-secondary" disabled={loading}>
            <RefreshCw size={18} /> Recargar
          </button>
          {books.length > 0 && (
            <button onClick={searchAll} className="btn-primary" disabled={processingIds.size > 0}>
              <Search size={18} /> Buscar Auto
            </button>
          )}
        </div>
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <ImageIcon size={48} />
          <h3>Todo listo</h3>
          <p>No hay libros sin portada en la lista (limitado a 50).</p>
        </div>
      ) : (
        <div className="isbn-list">
          {books.map(book => {
            const inputs = searchInputs.get(book.id) || { isbn: '', title: '', author: '', year: '' };
            const resultUrl = results.get(book.id);
            const isProcessing = processingIds.has(book.id);

            return (
              <div key={book.id} className="isbn-card">
                <div className="isbn-card-header">
                  <div className="book-info" style={{alignItems: 'flex-start'}}>
                    {/* Preview of found image or placeholder */}
                    <div style={{
                        width: '60px', height: '90px', 
                        backgroundColor: '#eee', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '4px', overflow: 'hidden'
                    }}>
                        {resultUrl ? (
                            <img src={resultUrl} alt="Cover" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        ) : (
                            <ImageIcon size={24} color="#999" />
                        )}
                    </div>
                    
                    <div className="book-details">
                      <h4 className="book-title">{book.title}</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                         <input 
                           className="isbn-input" 
                           placeholder="ISBN"
                           value={inputs.isbn}
                           onChange={e => handleInputChange(book.id, 'isbn', e.target.value)}
                         />
                         <input 
                           className="isbn-input" 
                           placeholder="Año"
                           value={inputs.year}
                           onChange={e => handleInputChange(book.id, 'year', e.target.value)}
                         />
                         <input 
                           className="isbn-input" 
                           placeholder="Título"
                           style={{gridColumn: 'span 2'}}
                           value={inputs.title}
                           onChange={e => handleInputChange(book.id, 'title', e.target.value)}
                         />
                         <input 
                           className="isbn-input" 
                           placeholder="Autor"
                           style={{gridColumn: 'span 2'}}
                           value={inputs.author}
                           onChange={e => handleInputChange(book.id, 'author', e.target.value)}
                         />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="isbn-card-body">
                  <div className="isbn-card-actions">
                    <button 
                        onClick={() => searchCover(book.id)} 
                        className="btn-search" 
                        disabled={isProcessing}
                    >
                      <Search size={16} />
                      Buscar
                    </button>
                    
                    {resultUrl && (
                        <button 
                            onClick={() => saveCover(book.id)} 
                            className="btn-save"
                            disabled={isProcessing}
                        >
                            <Check size={16} />
                            Guardar
                        </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
