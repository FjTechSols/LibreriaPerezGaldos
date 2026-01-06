import { useState, useEffect, useRef } from 'react';
import { Search, Check, AlertCircle, Loader, BookOpen, RefreshCw, Square } from 'lucide-react';
import { Book } from '../../../types';
import { obtenerLibrosSinISBN, actualizarISBN } from '../../../services/libroService';
import { buscarLibroPorTituloAutor } from '../../../services/isbnService';
import '../../../styles/components/GestionISBN.css';
import { MessageModal } from '../../MessageModal'; // Import MessageModal

export function GestionISBN() {
  const [librosSinISBN, setLibrosSinISBN] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [isbnResults, setIsbnResults] = useState<Map<string, string>>(new Map());
  const [manualISBN, setManualISBN] = useState<Map<string, string>>(new Map());
  const [buscandoTodos, setBuscandoTodos] = useState(false);
  const stopSearchRef = useRef(false);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  useEffect(() => {
    cargarLibrosSinISBN();
  }, []);

  const cargarLibrosSinISBN = async () => {
    setLoading(true);
    try {
      const libros = await obtenerLibrosSinISBN();
      setLibrosSinISBN(libros);
    } catch (error) {
      console.error('Error al cargar libros sin ISBN:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarISBNAutomatico = async (libro: Book) => {
    setProcessingIds(prev => new Set(prev).add(libro.id));
    setErrorIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(libro.id);
      return newSet;
    });

    try {
      const resultado = await buscarLibroPorTituloAutor(libro.title, libro.author, libro.publicationYear, libro.publisher);

      if (resultado && resultado.isbn) {
        setIsbnResults(prev => new Map(prev).set(libro.id, resultado.isbn));
        setSuccessIds(prev => new Set(prev).add(libro.id));
      } else {
        setErrorIds(prev => new Set(prev).add(libro.id));
      }
    } catch (error) {
      console.error('Error al buscar ISBN:', error);
      setErrorIds(prev => new Set(prev).add(libro.id));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(libro.id);
        return newSet;
      });
    }
  };

  const guardarISBN = async (libro: Book) => {
    const isbnToSave = isbnResults.get(libro.id) || manualISBN.get(libro.id);

    if (!isbnToSave) {
      showModal('Aviso', 'No hay ISBN para guardar', 'error');
      return;
    }

    setProcessingIds(prev => new Set(prev).add(libro.id));

    try {
      const result = await actualizarISBN(parseInt(libro.id), isbnToSave);

      if (result.success) {
        setLibrosSinISBN(prev => prev.filter(l => l.id !== libro.id));
        setIsbnResults(prev => {
          const newMap = new Map(prev);
          newMap.delete(libro.id);
          return newMap;
        });
        setManualISBN(prev => {
          const newMap = new Map(prev);
          newMap.delete(libro.id);
          return newMap;
        });
        setSuccessIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(libro.id);
          return newSet;
        });
      } else {
        showModal('Error', result.error || 'Error al guardar el ISBN', 'error');
      }
    } catch (error) {
      console.error('Error al guardar ISBN:', error);
      showModal('Error', 'Error inesperado al guardar el ISBN', 'error');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(libro.id);
        return newSet;
      });
    }
  };

  const detenerBusqueda = () => {
    stopSearchRef.current = true;
  };

  const buscarTodosISBNs = async () => {
    stopSearchRef.current = false;
    setBuscandoTodos(true);
    const BATCH_SIZE = 30;
    let totalProcessed = 0;
    let totalFound = 0;
    let totalSaved = 0;
    let totalNotFound = 0;
    let rateLimitHit = false;
    let stoppedByUser = false;
    
    for (let batchStart = 0; batchStart < librosSinISBN.length; batchStart += BATCH_SIZE) {
      if (stopSearchRef.current) {
        stoppedByUser = true;
        break;
      }

      const batch = librosSinISBN.slice(batchStart, batchStart + BATCH_SIZE);
      
      for (const libro of batch) {
        if (stopSearchRef.current) {
          stoppedByUser = true;
          break;
        }

        if (successIds.has(libro.id) || errorIds.has(libro.id)) continue;
        
        try {
          setProcessingIds(prev => new Set(prev).add(libro.id));
          
          const isbn = await buscarLibroPorTituloAutor(libro.title, libro.author || '');
          totalProcessed++;

          // Clear processing status immediately after getting result
          setProcessingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(libro.id);
            return newSet;
          });

          if (isbn) {
            // Extract ISBN string from result
            const isbnString = typeof isbn === 'string' ? isbn : isbn.isbn;
            if (isbnString) {
              totalFound++;
              // Auto-save the ISBN
              try {
                const result = await actualizarISBN(parseInt(libro.id), isbnString);
                if (result.success) {
                  totalSaved++;
                  setSuccessIds(prev => new Set(prev).add(libro.id));
                  // Wait 1 second to show success state
                  await new Promise(r => setTimeout(r, 1000));
                  // Remove from list
                  setLibrosSinISBN(prev => prev.filter(l => l.id !== libro.id));
                } else {
                  setErrorIds(prev => new Set(prev).add(libro.id));
                  // Wait 1 second to show error state
                  await new Promise(r => setTimeout(r, 1000));
                }
              } catch (saveError) {
                console.error('Error saving ISBN:', saveError);
                setErrorIds(prev => new Set(prev).add(libro.id));
                // Wait 1 second to show error state
                await new Promise(r => setTimeout(r, 1000));
              }
            } else {
              totalNotFound++;
              setErrorIds(prev => new Set(prev).add(libro.id));
              // Wait 1 second to show error state
              await new Promise(r => setTimeout(r, 1000));
              // Remove books without ISBN from list
              setLibrosSinISBN(prev => prev.filter(l => l.id !== libro.id));
            }
          } else {
            totalNotFound++;
            setErrorIds(prev => new Set(prev).add(libro.id));
            // Wait 1 second to show error state
            await new Promise(r => setTimeout(r, 1000));
            // Remove books without ISBN from list
            setLibrosSinISBN(prev => prev.filter(l => l.id !== libro.id));
          }
          
          // Delay between requests to avoid rate limiting
          await new Promise(r => setTimeout(r, 1500));
          
        } catch (error: any) {
          // Check for rate limit error
          if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
            rateLimitHit = true;
            console.warn('Rate limit hit, stopping ISBN search');
            break;
          }
          
          setProcessingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(libro.id);
            return newSet;
          });
        }
      }
      
      // Stop if rate limit hit
      if (rateLimitHit) break;
      if (stoppedByUser) break;
      
      // Pause between batches
      if (batchStart + BATCH_SIZE < librosSinISBN.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    setBuscandoTodos(false);
    
    // Show summary
    if (rateLimitHit) {
      showModal(
        'Búsqueda Detenida - Límite Alcanzado',
        `Procesados: ${totalProcessed} libros\n✅ ISBNs encontrados y guardados: ${totalSaved}\n❌ Sin ISBN: ${totalNotFound}\n⚠️ Límite de API alcanzado. Espera unos minutos y vuelve a buscar.`,
        'error'
      );
    } else if (stoppedByUser) {
      showModal(
        'Búsqueda Detenida por Usuario',
        `Procesados: ${totalProcessed} libros\n✅ ISBNs guardados: ${totalSaved}\n❌ Sin ISBN (removidos): ${totalNotFound}`,
        'info'
      );
    } else {
      showModal(
        'Búsqueda Completada',
        `✅ Procesados: ${totalProcessed} libros\n✅ ISBNs guardados: ${totalSaved}\n❌ Sin ISBN (removidos): ${totalNotFound}`,
        'info'
      );
    }
  };

  if (loading) {
    return (
      <div className="gestion-isbn-container">
        <div className="loading-state">
          <Loader className="spin" size={40} />
          <p>Cargando libros sin ISBN...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gestion-isbn-container">
      <div className="isbn-header">
        <div>
          <h2 className="isbn-title">Gestión de ISBNs</h2>
          <p className="isbn-subtitle">
            {librosSinISBN.length} {librosSinISBN.length === 1 ? 'libro' : 'libros'} sin ISBN
          </p>
        </div>
        <div className="isbn-actions">
          {buscandoTodos ? (
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
              <button
                onClick={cargarLibrosSinISBN}
                className="btn-secondary"
                disabled={loading}
              >
                <RefreshCw size={18} />
                Recargar
              </button>
              {librosSinISBN.length > 0 && (
                <button
                  onClick={buscarTodosISBNs}
                  className="btn-primary"
                  disabled={processingIds.size > 0}
                >
                  <Search size={18} />
                  Buscar y Guardar Todos
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {librosSinISBN.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>Todos los libros tienen ISBN</h3>
          <p>No hay libros pendientes de completar ISBN en este momento</p>
        </div>
      ) : (
        <div className="isbn-list">
          {librosSinISBN.map(libro => {
            const isProcessing = processingIds.has(libro.id);
            const hasSuccess = successIds.has(libro.id);
            const hasError = errorIds.has(libro.id);
            const foundISBN = isbnResults.get(libro.id);
            const manual = manualISBN.get(libro.id);

            return (
              <div key={libro.id} className={`isbn-card ${hasSuccess ? 'success' : ''} ${hasError ? 'error' : ''}`}>
                <div className="isbn-card-header">
                  <div className="book-info">
                    <div className="book-thumbnail-wrapper" style={{position: 'relative', width: '60px', height: '90px', marginRight: '16px'}}>
                      {isProcessing && (
                        <div style={{
                          position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                          borderRadius: '4px'
                        }}>
                          <Loader className="spin text-blue-600" size={24} />
                        </div>
                      )}
                      <img
                        src={libro.coverImage}
                        alt={libro.title}
                        className="book-thumbnail"
                        style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px'}}
                      />
                    </div>
                    <div className="book-details">
                      <h4 className="book-title">{libro.title}</h4>
                      <p className="book-author">{libro.author}</p>
                      <p className="book-publisher">{libro.publisher}</p>
                      <p className="book-code">Año: {libro.publicationYear || 'N/A'} | Código: {libro.code}</p>
                    </div>
                  </div>
                  <div className="isbn-status">
                    {isProcessing && (
                      <div className="status-badge processing">
                        <Loader className="spin" size={16} />
                        <span>Buscando...</span>
                      </div>
                    )}
                    {hasSuccess && !isProcessing && (
                      <div className="status-badge success">
                        <Check size={16} />
                        <span>ISBN encontrado</span>
                      </div>
                    )}
                    {hasError && !isProcessing && (
                      <div className="status-badge error">
                        <AlertCircle size={16} />
                        <span>No encontrado</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="isbn-card-body">
                  {foundISBN && (
                    <div className="isbn-result">
                      <label>ISBN encontrado:</label>
                      <div className="isbn-display">{foundISBN}</div>
                    </div>
                  )}

                  <div className="isbn-input-group">
                    <label>ISBN Manual:</label>
                    <input
                      type="text"
                      value={manual || ''}
                      onChange={(e) => {
                        setManualISBN(prev => {
                          const newMap = new Map(prev);
                          newMap.set(libro.id, e.target.value);
                          return newMap;
                        });
                      }}
                      placeholder="Ingresa ISBN manualmente"
                      className="isbn-input"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="isbn-card-actions">
                    <button
                      onClick={() => buscarISBNAutomatico(libro)}
                      className="btn-search"
                      disabled={isProcessing}
                    >
                      <Search size={16} />
                      {isProcessing ? 'Buscando...' : 'Buscar ISBN'}
                    </button>

                    {(foundISBN || manual) && (
                      <button
                        onClick={() => guardarISBN(libro)}
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
        type={messageModalConfig.type}
      />
    </div>
  );
}
