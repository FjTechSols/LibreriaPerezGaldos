import { useState, useEffect } from 'react';
import { Search, Check, X, AlertCircle, Loader, BookOpen, RefreshCw } from 'lucide-react';
import { Book } from '../types';
import { obtenerLibrosSinISBN, actualizarISBN } from '../services/libroService';
import { buscarLibroPorTituloAutor } from '../services/isbnService';
import '../styles/components/GestionISBN.css';

export function GestionISBN() {
  const [librosSinISBN, setLibrosSinISBN] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [isbnResults, setIsbnResults] = useState<Map<string, string>>(new Map());
  const [manualISBN, setManualISBN] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    cargarLibrosSinISBN();
  }, []);

  const cargarLibrosSinISBN = async () => {
    setLoading(true);
    try {
      const libros = await obtenerLibrosSinISBN(100);
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
      alert('No hay ISBN para guardar');
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
        alert(result.error || 'Error al guardar el ISBN');
      }
    } catch (error) {
      console.error('Error al guardar ISBN:', error);
      alert('Error inesperado al guardar el ISBN');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(libro.id);
        return newSet;
      });
    }
  };

  const buscarTodosISBNs = async () => {
    for (const libro of librosSinISBN) {
      if (!successIds.has(libro.id) && !errorIds.has(libro.id)) {
        await buscarISBNAutomatico(libro);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
              Buscar Todos
            </button>
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
              <div key={libro.id} className="isbn-card">
                <div className="isbn-card-header">
                  <div className="book-info">
                    <img
                      src={libro.coverImage}
                      alt={libro.title}
                      className="book-thumbnail"
                    />
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
    </div>
  );
}
