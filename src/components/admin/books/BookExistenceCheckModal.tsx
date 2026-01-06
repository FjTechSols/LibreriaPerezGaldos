import { useState, useEffect } from 'react';
import { Search, X, Plus, BookOpen, User, Barcode, Hash, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { Book } from '../../../types';
import { incrementarStockLibro, verificarExistenciaLibro } from '../../../services/libroService';
import { MessageModal } from '../../MessageModal'; // Import MessageModal

interface BookExistenceCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCreate: (data?: { title: string; author: string; isbn: string }) => void;
  onProceedToEdit: (book: Book) => void;
  onStockUpdated: () => void;
}

export function BookExistenceCheckModal({
  isOpen,
  onClose,
  onProceedToCreate,
  onProceedToEdit,
  onStockUpdated
}: BookExistenceCheckModalProps) {
  const [searchParams, setSearchParams] = useState({
    code: '',
    isbn: '',
    title: '',
    author: ''
  });
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Pagination State
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  // if (!isOpen) return null; // MOVED to return statement to fix Hook rules
  // Do NOT return here.

  const handleSearch = async (isLoadMore = false) => {
    // Basic validation: need at least one field
    if (!Object.values(searchParams).some(val => val.trim() !== '')) {
      setError('Por favor ingresa al menos un criterio de búsqueda');
      return;
    }

    setLoading(true);
    setError('');
    
    // If new search, reset everything
    if (!isLoadMore) {
        setHasSearched(false);
        setResults([]);
        setOffset(0);
        setHasMore(true);
    }
    
    try {
      // Calculate current offset based on mode
      const currentOffset = isLoadMore ? offset : 0;

      const foundBooks = await searchForExistence(searchParams, limit, currentOffset);
      
      if (isLoadMore) {
          setResults(prev => [...prev, ...foundBooks]);
      } else {
          setResults(foundBooks);
      }

      // Update offset for next load
      if (foundBooks.length < limit) {
          setHasMore(false);
      } else {
          setOffset(currentOffset + limit);
          setHasMore(true);
      }
      
      if (!isLoadMore) setHasSearched(true);
      
    } catch (e) {
      console.error('Error searching:', e);
      setError('Error al buscar libros. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Temporary local helper until I add it to service
  const searchForExistence = async (params: typeof searchParams, limit: number, offset: number) => {
      // Use the dedicated service function
      const data = await verificarExistenciaLibro({
          code: params.code || undefined,
          isbn: params.isbn || undefined,
          title: params.title || undefined,
          author: params.author || undefined,
          limit,
          offset
      });
      return data;
  };

  useEffect(() => {
    if (isOpen) {
        setSearchParams({ code: '', isbn: '', title: '', author: '' });
        setResults([]);
        setHasSearched(false);
        setError('');
    }
  }, [isOpen]);

  const handleStockIncrement = async (book: Book) => {
    setUpdatingStockId(book.id);
    try {
      const success = await incrementarStockLibro(parseInt(book.id), 1);
      if (success) {
        // Clear results and params as requested: "se cree un nuevo libro ... los campos del dormulario se deben limpiar"
        // Also for stock increment: "cuando se alada +1 al stock... los campos del dormulario se deben limpiar"
        setResults([]);
        setSearchParams({ code: '', isbn: '', title: '', author: '' });
        setHasSearched(false);
        
        onStockUpdated(); // Notify parent
        // Optional: show a mini success toast or message?
        // User didn't ask explicitly but cleaning form implies 'done'.
        // User didn't ask explicitly but cleaning form implies 'done'.
        showModal('Éxito', 'Stock actualizado +1', 'success');
      } else {
        showModal('Error', 'Error al actualizar el stock', 'error');
      }
    } catch (e) {
      console.error(e);
      showModal('Error', 'Error inesperado', 'error');
    } finally {
        setUpdatingStockId(null);
    }
  };

  // Move early return logic here
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verificar existencia</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Busca si el libro ya existe antes de crearlo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto">
           {/* Search Form */}
           <div className="space-y-6 mb-8">
                {/* Row 1: Identifiers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Código</label>
                        <div className="relative group">
                            <Hash className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej. 021005"
                                value={searchParams.code}
                                onChange={e => setSearchParams({...searchParams, code: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">ISBN</label>
                        <div className="relative group">
                            <Barcode className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Ej. 978..."
                                value={searchParams.isbn}
                                onChange={e => setSearchParams({...searchParams, isbn: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                </div>

                {/* Row 2: Title (Full Width) */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Título</label>
                    <div className="relative group">
                        <BookOpen className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                            placeholder="Título completo del libro..."
                            value={searchParams.title}
                            onChange={e => setSearchParams({...searchParams, title: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>

                {/* Row 3: Author (Full Width) */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Autor</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Nombre del autor..."
                            value={searchParams.author}
                            onChange={e => setSearchParams({...searchParams, author: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
           </div>

           <div className="flex justify-end mb-6">
                <button 
                    onClick={() => handleSearch(false)}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin text-white" size={18} /> : <Search size={18} />}
                    Buscar en Base de Datos
                </button>
           </div>

           {/* Results Area */}
           <div className="space-y-4">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {!hasSearched && !loading && (
                    <div className="text-center py-8 text-gray-400">
                        <Search size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Ingresa datos para verificar si el libro ya existe</p>
                    </div>
                )}

                {hasSearched && results.length === 0 && !loading && (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No se encontraron coincidencias</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                            Parece que este libro no está en la base de datos.
                        </p>
                        <button 
                            onClick={() => onProceedToCreate({
                                title: searchParams.title,
                                author: searchParams.author,
                                isbn: searchParams.isbn
                            })}
                            className="bg-green-600 hover:bg-green-700 text-white dark:text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow active:scale-95"
                        >
                            Crear Nuevo Libro
                        </button>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultados ({results.length})</h3>
                        {results.map(book => (
                            <div key={book.id} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors">
                                <div className="h-16 w-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                     <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{book.title}</h4>
                                    <p className="text-sm text-gray-500 truncate">{book.author}</p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {book.publisher} • {book.publicationYear} • {book.pages} págs.
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                        <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                            {book.code}
                                        </span>
                                        {book.isbn && <span>ISBN: {book.isbn}</span>}
                                        <span className={`font-medium ${book.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            Stock: {book.stock}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    <button 
                                        onClick={() => onProceedToEdit(book)}
                                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 rounded-lg transition-colors"
                                        title="Editar libro"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleStockIncrement(book)}
                                        disabled={!!updatingStockId}
                                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {updatingStockId === book.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
                                        Stock +1
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {hasSearched && hasMore && results.length > 0 && (
                    <div className="flex justify-center pt-2 pb-4">
                        <button
                            onClick={() => handleSearch(true)}
                            disabled={loading}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Cargar más resultados
                        </button>
                    </div>
                )}
           </div>
        </div>
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
