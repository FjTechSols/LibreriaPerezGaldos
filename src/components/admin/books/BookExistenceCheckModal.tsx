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

  const handleSearch = async () => {
    // Basic validation: need at least one field
    if (!Object.values(searchParams).some(val => val.trim() !== '')) {
      setError('Por favor ingresa al menos un criterio de búsqueda');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(false);
    
    try {
      // Mapping params to filter structure
      // Note: 'code' usually maps to legacy_id search (or general search in 'active admin')
      // but here we want specific field matching.
      // obtenerLibros supports 'search' (general) or specific fields if we enhanced it.
      // Our previous enhancement added specific fields to LibroFilters but logic might need verify.
      // Actually, looking at libroService logic:
      // - search: string -> uses legacy_id OR title/author/isbn depending on mode.
      // - We want MULTI-FIELD filtering (AND/OR logic).
      // 'obtenerLibros' applies AND logic for fields like category, publisher... 
      // but doesn't have specific 'title' or 'author' strict filters exposed in the main Query building block 
      // (except deeply nested in 'search' logic which mixes them).
      //
      // Wait, I saw 'filters.isbn' in the previous file view.
      // I saw 'filters.publisher'.
      // I DO NOT see 'filters.title' or 'filters.author' being used as strict filters in the 'filters' object in `obtenerLibros`.
      // The `LibroFilters` interface HAS them (I recall adding them to interface or seeing them?), 
      // let's re-verify libroService implementation in next step. 
      // FOR NOW, I will implement this assuming I might need to make a specific call or update `obtenerLibros` to handle title/author specifically 
      // if passing them in `search` isn't enough.
      //
      // STRATEGY: Use `obtenerLibros` with `forceCount: true`. 
      // Pass `isbn` to `isbn`.
      // For Code/Title/Author, if `obtenerLibros` doesn't strictly checking them as filters, 
      // I might need to abuse the `search` param or fetch and filter, OR use `buscarLibros`?
      // `buscarLibros` does text search.
      
      // Let's try to construct a smart query.
      // If code is present -> Search by 'search' = code (Mode: default/code)
      // If no code, but title -> Search by 'search' = title (Mode: full)
      // This might be insufficient if user fills ALL 4.
      
      // Better approach for strict existence check: 
      // Create a targeted query here using Supabase client directly OR add a dedicated function `checkBookExistence` in service.
      // Adding a dedicated function is cleaner and safer.
      // I'll assume I will create `searchBookForExistence` in service.
      
      // Placeholder for now, calling a new function I will add.
      const foundBooks = await searchForExistence(searchParams);
      setResults(foundBooks);
      setHasSearched(true);
      
    } catch (e) {
      console.error('Error searching:', e);
      setError('Error al buscar libros. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Temporary local helper until I add it to service
  const searchForExistence = async (params: typeof searchParams) => {
      // Use the dedicated service function
      const data = await verificarExistenciaLibro({
          code: params.code || undefined,
          isbn: params.isbn || undefined,
          title: params.title || undefined,
          author: params.author || undefined
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verificar existencia</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Busca si el libro ya existe antes de crearlo</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
           {/* Search Form */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase">Código</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ej. 021005"
                            value={searchParams.code}
                            onChange={e => setSearchParams({...searchParams, code: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase">ISBN</label>
                    <div className="relative">
                        <Barcode className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ej. 978..."
                            value={searchParams.isbn}
                            onChange={e => setSearchParams({...searchParams, isbn: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase">Título</label>
                    <div className="relative">
                        <BookOpen className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Título del libro..."
                            value={searchParams.title}
                            onChange={e => setSearchParams({...searchParams, title: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase">Autor</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Autor del libro..."
                            value={searchParams.author}
                            onChange={e => setSearchParams({...searchParams, author: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
           </div>

           <div className="flex justify-end mb-6">
                <button 
                    onClick={handleSearch}
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
