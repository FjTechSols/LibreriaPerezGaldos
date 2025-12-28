import { useState } from 'react';
import { Search, RefreshCw, Check, Save, X, Sparkles } from 'lucide-react';
import { Book } from '../../../types';
import { actualizarLibro, buscarLibros } from '../../../services/libroService';
import { buscarLibroPorISBN, buscarLibroPorTituloAutor } from '../../../services/isbnService';
import '../../../styles/components/GestionISBN.css'; // Reusing similar styles
import { MessageModal } from '../../MessageModal';

export function TitleFixer() {
  const [candidates, setCandidates] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [proposedTitles, setProposedTitles] = useState<Map<string, string>>(new Map());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixProgress, setAutoFixProgress] = useState('');
  const [stopRequested, setStopRequested] = useState(false);

  // MessageModal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  const scanForBadTitles = async () => {
    setLoading(true);
    setCandidates([]);
    setProposedTitles(new Map());
    setSuccessIds(new Set());
    try {
      // Search for common patterns of corruption
      // "__" often indicates encoding errors or placeholders
      const booksWithUnderscores = await buscarLibros('__');
      
      // We can also search for "???" or generic bad patterns if needed, 
      // but let's start with what the user reported.
      
      // Filter strictly client side to ensure we target the right ones
      const badBooks = booksWithUnderscores.filter(b => 
        b.title.includes('__') || 
        b.title.includes('??') ||
        b.title.match(/^[^\w\s]/) // Starts with non-word character (like - or _)
      );

      setCandidates(badBooks);
    } catch (error) {
      console.error('Error scanning titles:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeBook = async (book: Book) => {
    setAnalyzing(prev => new Set(prev).add(book.id));
    try {
      let result = null;
      
      // 1. Try ISBN first if available
      if (book.isbn && book.isbn.length > 5) {
        result = await buscarLibroPorISBN(book.isbn);
      }

      // 2. Fallback to Title + Author search if no ISBN or ISBN search failed
      if ((!result || !result.title) && book.title && book.author) {
        // Clean title for search (remove weird chars)
        const cleanTitle = book.title.replace(/[^\w\sñÑáéíóúÁÉÍÓÚ]/g, ' ').trim();
        const cleanAuthor = book.author.replace(/[^\w\sñÑáéíóúÁÉÍÓÚ]/g, ' ').trim();
        
        if (cleanTitle.length > 3) {
           result = await buscarLibroPorTituloAutor(cleanTitle, cleanAuthor);
        }
      }

      if (result && result.title) {
        setProposedTitles(prev => new Map(prev).set(book.id, result.title));
      } else {
        // Allow manual entry if everything fails
        setProposedTitles(prev => new Map(prev).set(book.id, book.title)); // Pre-fill with current
        showModal('Información', 'No se encontró información automática. Puedes editar el título manualmente.', 'info');
      }
    } catch (error) {
      console.error('Error analyzing book:', error);
      setProposedTitles(prev => new Map(prev).set(book.id, book.title)); // Fallback to manual
    } finally {
      setAnalyzing(prev => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
    }
  };

  const applyFix = async (book: Book) => {
    const newTitle = proposedTitles.get(book.id);
    if (!newTitle) return;

    setAnalyzing(prev => new Set(prev).add(book.id));
    try {
      const result = await actualizarLibro(parseInt(book.id), {
        titulo: newTitle
      });

      if (result) {
        setSuccessIds(prev => new Set(prev).add(book.id));
        // Remove from candidates after short delay? Or just show success state
        setTimeout(() => {
          setCandidates(prev => prev.filter(b => b.id !== book.id));
        }, 2000);
      }
    } catch (error) {
      console.error('Error applying fix:', error);
      showModal('Error', 'Error al actualizar el título', 'error');
    } finally {
      setAnalyzing(prev => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
    }
  };

  const startAutoFix = async () => {
    if (candidates.length === 0) return;
    
    setIsAutoFixing(true);
    setStopRequested(false);
    setAutoFixProgress('Iniciando corrección automática...');
    
    let processed = 0;
    let fixed = 0;
    let skipped = 0;

    for (const book of candidates) {
      if (stopRequested) break;
      
      // Skip already successful ones just in case
      if (successIds.has(book.id)) continue;

      setAutoFixProgress(`Procesando ${processed + 1} de ${candidates.length} (${fixed} corregidos)...`);
      
      try {
        setAnalyzing(prev => new Set(prev).add(book.id));
        
        // Only auto-fix high confidence (ISBN)
        if (book.isbn && book.isbn.length > 5) {
          const result = await buscarLibroPorISBN(book.isbn);
          
          if (result && result.title && result.title.length > 3) {
             // Verify it's actually different/better? 
             // Ideally yes, but let's assume the online source is correct if we found it by ISBN.
             
             // Apply update
            const updateResult = await actualizarLibro(parseInt(book.id), {
                titulo: result.title
            });

            if (updateResult) {
                setSuccessIds(prev => new Set(prev).add(book.id));
                setProposedTitles(prev => new Map(prev).set(book.id, result.title));
                fixed++;
            } else {
                skipped++;
            }
          } else {
              skipped++; // ISBN found but no title?
          }
        } else {
            skipped++; // No ISBN, skip for manual review
        }
      } catch (e) {
          console.error(`Error auto-fixing book ${book.id}`, e);
          skipped++;
      } finally {
        setAnalyzing(prev => {
            const next = new Set(prev);
            next.delete(book.id);
            return next;
        });
        processed++;
      }
      
      // Small delay to prevent rate limiting and allow UI updates
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsAutoFixing(false);
    setAutoFixProgress(`Completado: ${fixed} corregidos, ${skipped} omitidos.`);
    
    // Clear success items after a moment
    setTimeout(() => {
        setCandidates(prev => prev.filter(b => !successIds.has(b.id)));
        setSuccessIds(new Set());
        setAutoFixProgress('');
    }, 3000);
  };


  return (
    <div className="gestion-isbn-container">
      <div className="isbn-header">
        <div>
          <h2 className="isbn-title">Corrector de Títulos</h2>
          <p className="isbn-subtitle">
            Escanea y repara títulos mal formados usando el ISBN
          </p>
        </div>
        <button
          onClick={scanForBadTitles}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? <RefreshCw className="spin" size={18} /> : <Search size={18} />}
          Escanear Títulos Dañados
        </button>
        
        {candidates.length > 0 && (
             <button
              onClick={isAutoFixing ? () => setStopRequested(true) : startAutoFix}
              className={`btn-primary ${isAutoFixing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={loading && !isAutoFixing}
            >
              {isAutoFixing ? <X size={18} /> : <Sparkles size={18} />}
              {isAutoFixing ? 'Detener' : 'Reparar Todo (Automático)'}
            </button>
        )}
      </div>

      {isAutoFixing && (
        <div className="w-full bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 border border-blue-200 flex items-center gap-3">
            <RefreshCw className="spin" size={20} />
            <span className="font-medium">{autoFixProgress}</span>
        </div>
      )}
      
      {!isAutoFixing && autoFixProgress && (
           <div className="w-full bg-green-50 text-green-700 p-3 rounded-lg mb-4 border border-green-200 flex items-center gap-3">
            <Check size={20} />
            <span className="font-medium">{autoFixProgress}</span>
        </div>
      )}


      {candidates.length === 0 && !loading && (
        <div className="empty-state">
          <Check size={48} className="text-green-500" />
          <h3>Todo parece correcto</h3>
          <p>No se encontraron libros con títulos sospechosos (que contengan "__" o "??")</p>
        </div>
      )}

      <div className="isbn-list">
        {candidates.map(book => {
          const proposed = proposedTitles.get(book.id);
          const isWorking = analyzing.has(book.id);
          const isSuccess = successIds.has(book.id);

          if (isSuccess) return null; // Hide finished ones

          return (
            <div key={book.id} className="isbn-card">
              <div className="isbn-card-header">
                <div className="book-info">
                  {book.coverImage && (
                    <img src={book.coverImage} alt="" className="book-thumbnail" />
                  )}
                  <div className="book-details">
                    <h4 className="text-red-500 font-medium line-through decoration-red-500 decoration-2">
                       {book.title}
                    </h4>
                    <p className="book-author">{book.author}</p>
                    <p className="book-code text-xs text-gray-400">ISBN: {book.isbn || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="isbn-card-body">
                {proposed ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                        Propuesta (Editable)
                      </span>
                    </div>
                    <textarea
                      value={proposed}
                      onChange={(e) => setProposedTitles(prev => new Map(prev).set(book.id, e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-green-500 outline-none"
                      rows={2}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic mb-3">
                    Analiza el libro para buscar el título correcto...
                  </div>
                )}

                <div className="isbn-card-actions">
                  {!proposed ? (
                    <button
                      onClick={() => analyzeBook(book)}
                      disabled={isWorking}
                      className="btn-secondary w-full"
                    >
                      {isWorking ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                      Buscar Título Correcto
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                       <button
                        onClick={() => setProposedTitles(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(book.id);
                            return newMap;
                        })}
                        className="btn-secondary"
                        disabled={isWorking}
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={() => applyFix(book)}
                        disabled={isWorking}
                        className="btn-save flex-1"
                      >
                        {isWorking ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                        Aplicar Corrección
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type as any}
      />
    </div>
  );
}
