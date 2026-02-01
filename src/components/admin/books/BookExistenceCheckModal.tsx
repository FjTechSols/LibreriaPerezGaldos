import { useState, useEffect } from 'react';
import { Search, X, Plus, BookOpen, User, Barcode, Hash, Loader2, AlertCircle, Pencil, Copy } from 'lucide-react';
import { Book } from '../../../types';
import { incrementarStockLibro, verificarExistenciaLibro } from '../../../services/libroService';
import { MessageModal } from '../../MessageModal'; // Import MessageModal

interface BookExistenceCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCreate: (data?: { title: string; author: string; isbn: string }) => void;
  onProceedToEdit: (book: Book) => void;
  onProceedToClone: (book: Book) => void;
  onStockUpdated: () => void;
  viewMode?: 'grid' | 'table';
}

export function BookExistenceCheckModal({
  // Modal for checking book existence - Updated with description and price fields
  isOpen,
  onClose,
  onProceedToCreate,
  onProceedToEdit,
  onProceedToClone,
  onStockUpdated,
  viewMode = 'grid'
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

  // State for Code Projection
  const [hoveredCode, setHoveredCode] = useState<{ code: string; top: number; left: number } | null>(null);

  // Move early return logic here
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--border-subtle)]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-page)]/50">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-main)]">Verificar existencia</h2>
            <p className="text-sm text-[var(--text-muted)]">Busca si el libro ya existe antes de crearlo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
            <X size={24} className="text-[var(--text-dim)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto">
           {/* Search Form */}
           {viewMode === 'table' ? (
               // Legacy Compact View
               <div className="mb-6 bg-[var(--bg-page)] p-4 rounded-lg border border-[var(--border-subtle)]">
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                       <div className="col-span-1 md:col-span-2">
                           <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">CÓDIGO</label>
                           <input 
                               type="text" 
                               className="w-full px-2 py-1.5 text-sm rounded border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                               placeholder="Ej. 021005"
                               value={searchParams.code}
                               onChange={e => setSearchParams({...searchParams, code: e.target.value})}
                               onKeyDown={e => e.key === 'Enter' && handleSearch()}
                           />
                       </div>
                       <div className="col-span-1 md:col-span-3">
                           <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">ISBN</label>
                           <input 
                               type="text" 
                               className="w-full px-2 py-1.5 text-sm rounded border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                               placeholder="Ej. 978..."
                               value={searchParams.isbn}
                               onChange={e => setSearchParams({...searchParams, isbn: e.target.value})}
                               onKeyDown={e => e.key === 'Enter' && handleSearch()}
                           />
                       </div>
                       <div className="col-span-1 md:col-span-4">
                           <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">TÍTULO</label>
                           <input 
                               type="text" 
                               className="w-full px-2 py-1.5 text-sm rounded border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--accent)] outline-none font-medium"
                               placeholder="Título..."
                               value={searchParams.title}
                               onChange={e => setSearchParams({...searchParams, title: e.target.value})}
                               onKeyDown={e => e.key === 'Enter' && handleSearch()}
                           />
                       </div>
                       <div className="col-span-1 md:col-span-3">
                           <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">AUTOR</label>
                           <div className="flex gap-2">
                               <input 
                                   type="text" 
                                   className="w-full px-2 py-1.5 text-sm rounded border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                                   placeholder="Autor..."
                                   value={searchParams.author}
                                   onChange={e => setSearchParams({...searchParams, author: e.target.value})}
                                   onKeyDown={e => e.key === 'Enter' && handleSearch()}
                               />
                               <button 
                                   onClick={() => handleSearch(false)}
                                   disabled={loading}
                                   className="px-3 py-1.5 bg-[var(--accent)] hover:opacity-90 text-white rounded text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center min-w-[40px]"
                                   title="Buscar"
                               >
                                   {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                               </button>
                           </div>
                       </div>
                   </div>
               </div>
           ) : (
               // Modern View
               <div className="space-y-6 mb-8">
                    {/* Row 1: Identifiers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Código</label>
                            <div className="relative group">
                                <Hash className="absolute left-4 top-3.5 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] text-lg placeholder-[var(--text-dim)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                    placeholder="Ej. 021005"
                                    value={searchParams.code}
                                    onChange={e => setSearchParams({...searchParams, code: e.target.value})}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">ISBN</label>
                            <div className="relative group">
                                <Barcode className="absolute left-4 top-3.5 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] text-lg placeholder-[var(--text-dim)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
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
                        <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Título</label>
                        <div className="relative group">
                            <BookOpen className="absolute left-4 top-3.5 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] text-lg placeholder-[var(--text-dim)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all font-medium"
                                placeholder="Título completo del libro..."
                                value={searchParams.title}
                                onChange={e => setSearchParams({...searchParams, title: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                    {/* Row 3: Author (Full Width) */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Autor</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors" size={20} />
                            <input 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-main)] text-lg placeholder-[var(--text-dim)] focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all"
                                placeholder="Nombre del autor..."
                                value={searchParams.author}
                                onChange={e => setSearchParams({...searchParams, author: e.target.value})}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                   <div className="flex justify-end mb-6">
                        <button 
                            onClick={() => handleSearch(false)}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] hover:opacity-90 text-[var(--text-inverse)] rounded-lg font-bold transition-all disabled:opacity-50 shadow-md"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                            Buscar en Base de Datos
                        </button>
                   </div>
               </div>
           )}

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
                    <div className="text-center py-10 bg-[var(--bg-page)] rounded-xl border border-dashed border-[var(--border-subtle)]">
                        <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">No se encontraron coincidencias</h3>
                        <p className="text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                            Parece que este libro no está en la base de datos.
                        </p>
                        <button 
                            onClick={() => onProceedToCreate({
                                title: searchParams.title,
                                author: searchParams.author,
                                isbn: searchParams.isbn
                            })}
                            className="bg-[var(--success)] hover:opacity-90 text-[var(--text-inverse)] px-8 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95"
                        >
                            Crear Nuevo Libro
                        </button>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Resultados ({results.length})</h3>
                        
                        {viewMode === 'table' ? (
                            /* Legacy Table View for Results */
                            <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--bg-page)]">
                                        <tr>
                                            <th className="px-3 py-2 text-[var(--text-main)] w-1/3">Título / Autor / Descripción</th>
                                            <th className="px-3 py-2 text-[var(--text-main)]">ISBN / Código</th>
                                            <th className="px-3 py-2 text-[var(--text-main)]">Detalles</th>
                                            <th className="px-3 py-2 text-[var(--text-main)] text-right">Precio</th>
                                            <th className="px-3 py-2 text-[var(--text-main)] text-center">Stock</th>
                                            <th className="px-3 py-2 text-[var(--text-main)] text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)]">
                                        {results.map(book => (
                                            <tr key={book.id} className="hover:bg-[var(--bg-hover)]">
                                                <td className="px-3 py-2">
                                                    <div className="font-bold text-[var(--text-main)] line-clamp-2">{book.title}</div>
                                                    <div className="text-[var(--text-muted)] text-xs mt-0.5 font-medium">{book.author}</div>
                                                    {book.description && (
                                                        <div className="text-[var(--text-dim)] text-[11px] mt-1 line-clamp-2 leading-tight">
                                                            {book.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    <div 
                                                        className="text-[var(--text-main)] font-mono text-xs cursor-help border-b border-dotted border-[var(--text-dim)] w-fit"
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setHoveredCode({ code: book.code || 'S/C', top: rect.top, left: rect.left });
                                                        }}
                                                        onMouseLeave={() => setHoveredCode(null)}
                                                    >
                                                        {book.code || 'S/C'}
                                                    </div>
                                                    <div className="text-[var(--text-dim)] text-xs mt-0.5">{book.isbn}</div>
                                                </td>
                                                <td className="px-3 py-2 text-xs text-[var(--text-dim)] align-top">
                                                    <div><span className="font-semibold text-[var(--text-muted)]">Ed:</span> {book.publisher}</div>
                                                    <div><span className="font-semibold text-[var(--text-muted)]">Año:</span> {book.publicationYear}</div>
                                                    {book.pages > 0 && <div><span className="font-semibold text-[var(--text-muted)]">Págs:</span> {book.pages}</div>}
                                                    {book.category && <div><span className="font-semibold text-[var(--text-muted)]">Cat:</span> {book.category}</div>}
                                                    {book.language && <div><span className="font-semibold text-[var(--text-muted)]">Idioma:</span> {book.language}</div>}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-[var(--text-main)] align-top">
                                                    {typeof book.price === 'number' ? book.price.toFixed(2) : book.price}€
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold align-top">
                                                    <span className={book.stock > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{book.stock}</span>
                                                </td>
                                                <td className="px-3 py-2 text-right align-top">
                                                    <div className="flex justify-end gap-1">
                                                        <button 
                                                            onClick={() => onProceedToClone(book)}
                                                            className="p-1.5 hover:bg-[var(--bg-hover)] text-[var(--accent)] rounded transition-colors"
                                                            title="Clonar"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => onProceedToEdit(book)}
                                                            className="p-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] rounded transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStockIncrement(book)}
                                                            disabled={!!updatingStockId}
                                                            className="px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 text-xs font-bold rounded hover:bg-[var(--accent)]/20 transition-colors"
                                                        >
                                                            {updatingStockId === book.id ? '...' : '+1'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* Grid/Card View (Original) */
                             results.map(book => (
                            <div key={book.id} className="flex items-center gap-4 p-3 bg-[var(--bg-page)] rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors">
                                <div className="h-16 w-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                     <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                                </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-[var(--text-main)] truncate">{book.title}</h4>
                                    <p className="text-sm text-[var(--text-muted)] truncate">{book.author}</p>
                                    <p className="text-xs text-[var(--text-dim)] truncate">
                                        {book.publisher} • {book.publicationYear} • {book.pages} págs.
                                    </p>
                                    {book.description && book.description !== 'Sin descripción disponible' && (
                                        <p className="text-xs text-[var(--text-dim)] line-clamp-2 my-1">
                                            {book.description}
                                        </p>
                                    )}
                                     <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-dim)]">
                                        <span className="bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[var(--text-main)]">
                                            {book.code}
                                        </span>
                                        {book.isbn && <span>ISBN: {book.isbn}</span>}
                                        <span className="font-bold text-[var(--text-main)]">
                                            {typeof book.price === 'number' ? book.price.toFixed(2) : book.price}€
                                        </span>
                                        <span className={`font-bold ${book.stock > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                            Stock: {book.stock}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    <button 
                                        onClick={() => onProceedToClone(book)}
                                        className="p-2 bg-[var(--bg-hover)] hover:opacity-80 text-[var(--accent)] rounded-lg transition-colors"
                                        title="Clonar / Crear copia"
                                    >
                                        <Copy size={18} />
                                    </button>
                                     <button 
                                        onClick={() => onProceedToEdit(book)}
                                        className="p-2 bg-[var(--bg-hover)] hover:opacity-80 text-[var(--text-main)] rounded-lg transition-colors"
                                        title="Editar libro"
                                     >
                                        <Pencil size={18} />
                                     </button>
                                     <button 
                                         onClick={() => handleStockIncrement(book)}
                                         disabled={!!updatingStockId}
                                         className="flex items-center gap-1.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                     >
                                         {updatingStockId === book.id && (
                                             <Loader2 size={16} className="animate-spin" />
                                         )}
                                         +1
                                     </button>
                                 </div>
                             </div>
                        ))
                    )}
                    </div>
                )}
                
                {hasSearched && hasMore && results.length > 0 && (
                    <div className="flex justify-center pt-2 pb-4">
                        <button
                            onClick={() => handleSearch(true)}
                            disabled={loading}
                            className="text-sm font-bold text-[var(--accent)] hover:opacity-80 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
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

      {/* Fixed Code Projection Overlay */}
      {hoveredCode && (
        <div 
            className="fixed z-[9999] bg-[var(--bg-surface)] border-2 border-[var(--accent)] shadow-2xl rounded-2xl p-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200 pb-8 pr-12 min-w-[max-content]"
            style={{ 
                top: hoveredCode.top - 10, // Slight offset to cover original partially or float above
                left: hoveredCode.left,
            }}
        >
            <span className="text-xs text-[var(--accent)] font-bold uppercase tracking-widest mb-1.5 block">Código Legacy</span>
            <span className="text-6xl font-black text-[var(--text-main)] tracking-widest font-mono leading-none block">
                {hoveredCode.code}
            </span>
        </div>
      )}
    </div>
  );
}
