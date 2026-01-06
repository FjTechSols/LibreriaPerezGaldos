import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, ImageIcon, Loader2, Loader, Check, Square } from 'lucide-react';
import { Book } from '../../../types';
import { obtenerLibrosSinPortada, actualizarLibro } from '../../../services/libroService';
import { searchBookCover } from '../../../services/coverService';
import '../../../styles/components/GestionISBN.css'; // Reusing styles from GestionISBN as structure is identical
import { MessageModal } from '../../MessageModal';

export function CoverSearchTool() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const [results, setResults] = useState<Map<string, string>>(new Map()); // bookId -> url
  
  // Search inputs state
  const [searchInputs, setSearchInputs] = useState<Map<string, {
    isbn: string;
    title: string;
    author: string;
    year: string;
  }>>(new Map());

  // MessageModal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    onConfirm?: () => void;
    showCancel?: boolean;
    buttonText?: string;
  }>({ title: '', message: '', type: 'info' });

  // Bulk operations state
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const stopSearchRef = useRef(false);

  const showModal = (
    title: string, 
    message: string, 
    type: 'info' | 'error' | 'success' | 'warning' = 'info',
    onConfirm?: () => void
  ) => {
    setMessageModalConfig({ 
      title, 
      message, 
      type, 
      onConfirm,
      showCancel: !!onConfirm,
      buttonText: onConfirm ? 'Confirmar' : 'Cerrar'
    });
    setShowMessageModal(true);
  };

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const savedResults = localStorage.getItem('coverSearchResults');
    
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        setResults(new Map(Object.entries(parsed)));
      } catch (error) {
        console.error('Error loading saved results:', error);
      }
    }
  }, []);

  // Save results to localStorage whenever they change
  useEffect(() => {
    if (results.size > 0) {
      const resultsObj = Object.fromEntries(results);
      localStorage.setItem('coverSearchResults', JSON.stringify(resultsObj));
    } else {
      localStorage.removeItem('coverSearchResults');
    }
  }, [results]);

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

  const searchCover = async (bookId: string): Promise<string | null> => {
    setProcessingIds(prev => new Set(prev).add(bookId));
    
    try {
      const inputs = searchInputs.get(bookId);
      if (!inputs) return null;

      const url = await searchBookCover({
        isbn: inputs.isbn,
        title: inputs.title,
        author: inputs.author,
        year: inputs.year
      });

      if (url) {
        setResults(prev => new Map(prev).set(bookId, url));
        return url;
      } else {
        // Clear result if exists to show error/empty
        setResults(prev => {
            const m = new Map(prev);
            m.delete(bookId);
            return m;
        });
        return null;
      }
    } catch (error) {
      console.error('Error searching cover:', error);
      throw error; // Re-throw so searchAll can handle it (e.g. rate limit)
    } finally {
      // Logic for cleaning processingIds is handled by searchAll now for better visual feedback control,
      // BUT for individual usage (single button click), we might still want it cleaned here?
      // Actually, searchAll ADDS it again before calling searchCover.
      // To avoid conflict, let's keep cleanup here but be aware searchAll might set it immediately again?
      // No, searchAll logic was updated to set it BEFORE call, and clear it AFTER call.
      // If we clear it here, it might flicker.
      // However, `searchAll` relies on `searchCover` waiting for the promise.
      
      // Let's REMOVE the internal setProcessingIds calls from here entirely if it's only used internally?
      // Wait, is searchCover used by individual buttons? YES.
      // So we need to keep state management here for individual actions.
      
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
      showModal('Error', 'Error al guardar la portada', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookId);
        return newSet;
      });
    }
  };

  const detenerBusqueda = () => {
    stopSearchRef.current = true;
  };

  const searchAll = async () => {
    stopSearchRef.current = false;
    setIsAutoSearching(true);
    const BATCH_SIZE = 30;
    let totalProcessed = 0;
    let totalFound = 0;
    let totalSaved = 0;
    let totalNotFound = 0;
    let rateLimitHit = false;
    let stoppedByUser = false;
    
    // Get books that don't have results yet
    const booksToSearch = books.filter(book => !results.has(book.id));
    
    // Process in batches
    for (let batchStart = 0; batchStart < booksToSearch.length; batchStart += BATCH_SIZE) {
      if (stopSearchRef.current) {
        stoppedByUser = true;
        break;
      }
      
      const batch = booksToSearch.slice(batchStart, batchStart + BATCH_SIZE);
      
      // Search current batch
      for (const book of batch) {
        if (stopSearchRef.current) {
          stoppedByUser = true;
          break;
        }

        try {
          setProcessingIds(prev => new Set(prev).add(book.id));
          
          const foundUrl = await searchCover(book.id);
          totalProcessed++;

          // Clear processing status immediately to allow success/error state to be visible
          setProcessingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(book.id);
            return newSet;
          });
          
          // Check if a result was found
          if (foundUrl) {
            totalFound++;
            // Auto-save the cover
            try {
              const result = await actualizarLibro(parseInt(book.id), { imagen_url: foundUrl });
              if (result) {
                totalSaved++;
                setSuccessIds(prev => new Set(prev).add(book.id));
                // Wait 1 second to show success state
                await new Promise(r => setTimeout(r, 1000));
                // Remove from books list
                setBooks(prev => prev.filter(b => b.id !== book.id));
                // Remove from results
                setResults(prev => {
                  const m = new Map(prev);
                  m.delete(book.id);
                  return m;
                });
              } else {
                setErrorIds(prev => new Set(prev).add(book.id));
                // Wait 1 second to show error state
                await new Promise(r => setTimeout(r, 1000));
              }
            } catch (error) {
              console.error('Error auto-saving cover for book:', book.id, error);
              setErrorIds(prev => new Set(prev).add(book.id));
              // Wait 1 second to show error state
              await new Promise(r => setTimeout(r, 1000));
            }
          } else {
            // No cover found - remove from list
            totalNotFound++;
            setErrorIds(prev => new Set(prev).add(book.id));
            // Wait 1 second to show error state
            await new Promise(r => setTimeout(r, 1000));
            setBooks(prev => prev.filter(b => b.id !== book.id));
          }
          
          // Delay between requests
          await new Promise(r => setTimeout(r, 1500));
        } catch (error: any) {
          // Check if it's a rate limit error
          if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
            rateLimitHit = true;
            console.warn('Rate limit hit, stopping batch search');
            break;
          }
          
          setProcessingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(book.id);
            return newSet;
          });
        }
      }
      
      // Stop if rate limit hit
      if (rateLimitHit) break;
      if (stoppedByUser) break;
      
      // Small pause between batches
      if (batchStart + BATCH_SIZE < booksToSearch.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    setIsAutoSearching(false);
    
    // Clear localStorage since everything was applied
    localStorage.removeItem('coverSearchResults');
    
    // Show final summary
    if (rateLimitHit) {
      showModal(
        'Búsqueda Detenida - Límite Alcanzado',
        `Procesados: ${totalProcessed} libros\n✅ Portadas encontradas y guardadas: ${totalSaved}\n❌ Sin portada: ${totalNotFound}\n⚠️ Límite de API alcanzado. Espera unos minutos y vuelve a buscar para continuar.`,
        'warning'
      );
    } else if (stoppedByUser) {
      showModal(
        'Búsqueda Detenida por Usuario',
        `Procesados: ${totalProcessed} libros\n✅ Portadas guardadas: ${totalSaved}\n❌ Sin portada (removidos): ${totalNotFound}`,
        'info'
      );
    } else {
      showModal(
        'Búsqueda Completada',
        `✅ Procesados: ${totalProcessed} libros\n✅ Portadas guardadas automáticamente: ${totalSaved}\n❌ Sin portada (removidos): ${totalNotFound}`,
        totalSaved > 0 ? 'success' : 'info'
      );
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
          {isAutoSearching ? (
            <button
              onClick={detenerBusqueda}
              className="btn-stop"
              style={{ backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
            >
              <Square size={18} fill="currentColor" />
              Detener
            </button>
          ) : (
            <>
              <button onClick={loadBooks} className="btn-secondary" disabled={loading}>
                <RefreshCw size={18} /> Recargar
              </button>
              {books.length > 0 && (
                <button 
                  onClick={searchAll} 
                  className="btn-primary" 
                >
                  <Search size={18} />
                  Buscar y Aplicar Auto
                </button>
              )}
            </>
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
            const isSuccess = successIds.has(book.id);
            const isError = errorIds.has(book.id);

            return (
              <div key={book.id} className={`isbn-card ${isSuccess ? 'success' : ''} ${isError ? 'error' : ''}`}>
                <div className="isbn-card-header">
                  <div className="book-info" style={{alignItems: 'flex-start'}}>
                    {/* Preview of found image or placeholder */}
                    <div style={{
                        width: '60px', height: '90px', 
                        backgroundColor: '#eee', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '4px', overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {isProcessing && (
                          <div style={{
                            position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                          }}>
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                          </div>
                        )}
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
      
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type as any}
        onConfirm={messageModalConfig.onConfirm}
        showCancel={messageModalConfig.showCancel}
        buttonText={messageModalConfig.buttonText}
      />


    </div>
  );
}
