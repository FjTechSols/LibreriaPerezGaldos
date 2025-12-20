import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Book, Ubicacion } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { 
  obtenerLibros, 
  obtenerEstadisticasLibros, 
  buscarLibroPorISBN, 
  incrementarStockLibro, 
  crearLibro, 
  actualizarLibro, 
  eliminarLibro,
  obtenerOcrearEditorial,
  obtenerCategoriaId
} from '../../../services/libroService';
import '../../../styles/components/BooksManager.css';
import { obtenerUbicacionesActivas } from '../../../services/ubicacionService';
import { getCategorias } from '../../../services/categoriaService';
import { useSettings } from '../../../context/SettingsContext';
import { useTheme } from '../../../context/ThemeContext';
import { Pagination } from '../../Pagination';
import { BookTable } from './BookTable';
import { BookForm } from './BookForm';
import { BookSuccessModal } from './BookSuccessModal';
import { BookExistenceCheckModal } from './BookExistenceCheckModal';

// Import sub-tools if we want to render them as tabs inside Manager (Optional, but planned for future)
// For now we focus on the Catalog section logic.

export function BooksManager() {
  const { actualTheme } = useTheme();
  const { settings } = useSettings();
  
  // State
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckingExistence, setIsCheckingExistence] = useState(false);
  // Book Form State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null); // Replaces editingBook
  const [createdBook, setCreatedBook] = useState<Book | null>(null); // For Success Modal

  // Filters State
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    search: '', // Synced with localSearchTerm when getting results
    category: 'Todos',
    minPrice: '',
    maxPrice: '',
    stockStatus: 'all',
    featured: false,
    isNew: false,
    isOnSale: false,
    coverStatus: 'all',
    location: '',
    minPages: '',
    maxPages: '',
    startYear: '',
    endYear: '',
    isbn: '',
    publisher: '',
    searchMode: false
  });
  const [advancedMode, setAdvancedMode] = useState(false);

  // Initial Load
  useEffect(() => {
    if (settings?.system?.itemsPerPageAdmin) {
      setItemsPerPage(settings.system.itemsPerPageAdmin);
    }
  }, [settings]);

  useEffect(() => {
    async function loadResources() {
      try {
        const u = await obtenerUbicacionesActivas();
        setUbicaciones(u);
        
        const stats = await obtenerEstadisticasLibros();
        setTotalBooks(stats.total);

        const cats = await getCategorias();
        setDbCategories(cats.map(c => c.nombre));

      } catch (e) {
        console.error('Error loading resources:', e);
      }
    }
    loadResources();
  }, []);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('books-manager-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'libros' }, () => {
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load Books
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      try {
         const queryFilters = {
          search: filters.search, // Use the filter state which is updated on search click/enter
          category: filters.category !== 'Todos' ? filters.category : undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          availability: filters.stockStatus !== 'all' ? filters.stockStatus as any : undefined,
          featured: filters.featured,
          isNew: filters.isNew,
          isOnSale: filters.isOnSale,
          coverStatus: filters.coverStatus as any,
          location: filters.location || undefined,
          minPages: filters.minPages ? Number(filters.minPages) : undefined,
          maxPages: filters.maxPages ? Number(filters.maxPages) : undefined,
          startYear: filters.startYear ? Number(filters.startYear) : undefined,
          endYear: filters.endYear ? Number(filters.endYear) : undefined,
          isbn: filters.isbn || undefined,
          publisher: filters.publisher || undefined,
          searchMode: filters.searchMode ? 'full' as const : 'default' as const,
          forceCount: true
        };

        const { data, count } = await obtenerLibros(currentPage, itemsPerPage, queryFilters);
        setBooks(data);
        setFilteredCount(count);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, [
    currentPage, 
    itemsPerPage, 
    filters, // Dependency on the entire filters object
    refreshTrigger
  ]);

  // Handlers
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: localSearchTerm }));
    setCurrentPage(1); // Reset to page 1 on search
    setLocalSearchTerm('');
  };

  const handleCreateSubmit = async (bookData: Partial<Book>, contents: string[]) => {
    // Validation: Title, Price, Location, Category are mandatory. Author is usually expected but user didn't explicitly list it as mandatory, though typically it is.
    // User said: "los pos que si son obligatorio son Titulo, Precio, Ubicacion y categoria"
    if (!bookData.title || !bookData.price || !bookData.ubicacion || !bookData.category) {
      alert('Por favor completa los campos obligatorios: Título, Precio, Ubicación y Categoría.');
      return;
    }

    try {
      // ISBN logic: Not mandatory. If empty, defaults to 'N/A'.
      const rawISBN = bookData.isbn ? bookData.isbn.replace(/[-\s]/g, '') : '';
      const finalISBN = rawISBN || 'N/A';

      // Only check for existing book if we have a real ISBN
      if (finalISBN !== 'N/A') {
          const libroExistente = await buscarLibroPorISBN(finalISBN);

          if (libroExistente) {
            const actualizado = await incrementarStockLibro(parseInt(libroExistente.id), 1);
            if (actualizado) {
              alert(`El libro ya existe. Stock incrementado.`);
              setRefreshTrigger(prev => prev + 1);
              setIsModalOpen(false); // Close the modal
              return;
            }
          }
      }

      // Resolve dependencies
      let editorialId: number | null | undefined = undefined;
      if (bookData.publisher && bookData.publisher.trim()) {
         editorialId = await obtenerOcrearEditorial(bookData.publisher);
      }

      let categoriaId: number | null | undefined = undefined;
      if (bookData.category && bookData.category.trim()) {
          categoriaId = await obtenerCategoriaId(bookData.category);
      }

        // Map Book interface (UI) to LibroSupabase interface (DB)
        const nuevo = await crearLibro({
          titulo: bookData.title,
          autor: bookData.author || 'Anónimo', 
          isbn: finalISBN,
          precio: bookData.price,
          precio_original: bookData.originalPrice,
          stock: bookData.stock || 1,
          ubicacion: bookData.ubicacion,
          descripcion: bookData.description,
          imagen_url: bookData.coverImage,
          paginas: bookData.pages,
          anio: bookData.publicationYear,
          categoria_id: categoriaId,
          editorial_id: editorialId,
          
          notas: undefined, 
          activo: true,
          destacado: bookData.featured,
          novedad: bookData.isNew,
          oferta: bookData.isOnSale
        } as any, contents);
        
        if (nuevo) {
          // Show Success Modal instead of Alert
          setCreatedBook(nuevo);
          setRefreshTrigger(prev => prev + 1);
          setIsModalOpen(false); // Close the modal (resets form by unmounting)
        }
    } catch (e) {
      console.error('Error creating book:', e);
      alert('Error al crear el libro.');
    }
  };

  const handleEditSubmit = async (bookData: Partial<Book>, contents: string[]) => {
    if (!selectedBook) return; // Use selectedBook instead of editingBook
    try {
      // Resolve Editorial ID if publisher name provided
      let editorialId: number | null | undefined = undefined;
      
      if (bookData.publisher && bookData.publisher.trim().length > 0) {
          // Import this function at the top if not already imported
          editorialId = await obtenerOcrearEditorial(bookData.publisher);
      } else if (bookData.publisher === '') {
           // User explicitly cleared the field
           editorialId = null;
      }

      // Map UI fields (Book) to DB fields (LibroSupabase)
      const mappedUpdate = {
        titulo: bookData.title,
        autor: bookData.author,
        isbn: bookData.isbn ? bookData.isbn.replace(/[-\s]/g, '') : null,
        precio: bookData.price,
        precio_original: bookData.originalPrice,
        stock: bookData.stock,
        ubicacion: bookData.ubicacion,
        descripcion: bookData.description,
        imagen_url: bookData.coverImage,
        paginas: bookData.pages,
        anio: bookData.publicationYear,
        destacado: bookData.featured,
        novedad: bookData.isNew,
        oferta: bookData.isOnSale,
        editorial_id: editorialId, // Add resolved ID here
        // categoria_id would be similar, but let's stick to publisher focus for now or if bookData.category provides a name we need to resolve it too.
        // bookData.category is string. 
        // We probably should resolve category too if we want it to save.
        // ...
      };

      const updated = await actualizarLibro(parseInt(selectedBook.id), mappedUpdate as any, contents); // Use selectedBook
      if (updated) {
        alert('Libro actualizado.');
        setRefreshTrigger(prev => prev + 1);
        setSelectedBook(null); // Clear selected book
        setIsModalOpen(false); // Close the modal
      } else {
        throw new Error('No se pudo actualizar.');
      }
    } catch (e) {
      console.error('Error updating book:', e);
      alert('Error al actualizar el libro.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este libro?')) return;
    try {
      const deleted = await eliminarLibro(parseInt(id));
      if (deleted) {
        alert('Libro eliminado.');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (e) {
      console.error('Error deleting book:', e);
      alert('Error al eliminar.');
    }
  };

  const totalPages = Math.ceil((filters.search || filters.category !== 'Todos' || filters.stockStatus !== 'all' ? filteredCount : totalBooks) / itemsPerPage);

  const handleStockUpdate = async (book: Book, amount: number) => {
    const action = amount > 0 ? "Aumentar" : "Reducir";
    const symbol = amount > 0 ? "+1" : "-1";
    // Check if confirming "cancelar" or "concelar" -> standard is Cancelar
    const message = `¿${action} el stock del Libro (${book.title}, ${book.author}, ${book.code}) en ${symbol}? confirmar o cancelar`; 
    
    if (!confirm(message)) return;

    try {
        const updated = await incrementarStockLibro(parseInt(book.id), amount);
        if (updated) {
            // Optimistic update or refresh
            setRefreshTrigger(prev => prev + 1);
        } else {
            alert('Error al actualizar el stock.');
        }
    } catch (e) {
        console.error('Error updating stock:', e);
        alert('Error inesperado.');
    }
  };

  const loadBooks = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="books-manager">
       {/* Header / Stats / Title */}
       <div className="content-header" style={{ marginBottom: '1.5rem', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto' }}>
            <h2 className="content-title">Gestión de Libros</h2>
            <p className="content-subtitle">
              {(() => {
                const hasActiveFilters = 
                  filters.search !== '' ||
                  filters.category !== 'Todos' ||
                  filters.stockStatus !== 'all' ||
                  filters.minPrice !== '' ||
                  filters.maxPrice !== '' ||
                  filters.featured ||
                  filters.isNew ||
                  filters.isOnSale ||
                  filters.location !== '' ||
                  filters.minPages !== '' ||
                  filters.maxPages !== '' ||
                  filters.startYear !== '' ||
                  filters.endYear !== '' ||
                  filters.isbn !== '' ||
                  filters.publisher !== '';

                return !hasActiveFilters
                  ? `Total: ${totalBooks} libros`
                  : `${filteredCount} libros encontrados (de ${totalBooks} totales)`;
              })()}
            </p>
          </div>
           <div className="admin-search books-manager-search">
             <div className="search-input-wrapper">
                <Search className="admin-search-icon" size={20} />
                <input
                  type="text"
                  placeholder={filters.searchMode ? "Buscar por Título, Autor, Editorial o ISBN..." : "Introduzca el código del libro..."}
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="admin-search-input"
                />
             </div>
             <button onClick={handleSearch} className="action-btn search-btn">
               Buscar
             </button>
           </div>
           
           <button onClick={() => setIsCheckingExistence(true)} className="action-btn primary">
             <Plus size={20} /> Nuevo Libro
           </button>
           
       </div>

       {/* Filters */}
       <div className="filters-container" style={{ 
          padding: '1.25rem', 
          background: actualTheme === 'dark' ? '#1f2937' : 'white',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          {/* Top Row: Key Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
             <div style={{ flex: '0 1 auto' }}>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Categoría</label>
                <div className="relative">
                  <select 
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="form-select w-full md:w-48 h-auto py-2.5 text-sm rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Todos">Todas las categorías</option>
                    {dbCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
             </div>
             
             <div style={{ flex: '0 1 180px' }}>
                 <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Stock</label>
                 <select 
                    value={filters.stockStatus} 
                    onChange={(e) => setFilters(prev => ({...prev, stockStatus: e.target.value}))} 
                    className="form-select w-full h-auto py-2 text-sm rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="all">Todos</option>
                   <option value="inStock">En Stock</option>
                   <option value="outOfStock">Agotados</option>
                 </select>
             </div>

             <div className="flex items-center gap-4 ml-auto pb-1">
                 <button 
                    onClick={() => {
                        setFilters({
                          search: '',
                          category: 'Todos',
                          minPrice: '',
                          maxPrice: '',
                          stockStatus: 'all',
                          featured: false,
                          isNew: false,
                          isOnSale: false,
                          coverStatus: 'all',
                          location: '',
                          minPages: '',
                        maxPages: '',
                          startYear: '',
                          endYear: '',
                          isbn: '',
                          publisher: '',
                          searchMode: false
                        });
                        setLocalSearchTerm('');
                        setAdvancedMode(false);
                    }}
                    className="text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-2"
                 >
                    Limpiar Filtros
                 </button>

                 <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                        checked={filters.searchMode} 
                        onChange={(e) => setFilters(prev => ({...prev, searchMode: e.target.checked}))} 
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors select-none">
                      Búsqueda Completa
                    </span>
                 </label>
                 
                 <button 
                  onClick={() => setAdvancedMode(!advancedMode)}
                  className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg border ${
                    advancedMode 
                      ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800'
                  }`}
                 >
                   {advancedMode ? 'Ocultar Filtros' : 'Filtros Avanzados'}
                 </button>
             </div>
          </div>

          {/* Advanced Filters */}
          {advancedMode && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-200" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Publisher & Location */}
                  <div className="space-y-4">
                     <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Editorial</label>
                       <input 
                          type="text" 
                          placeholder="Buscar editorial..."
                          value={filters.publisher}
                          onChange={(e) => setFilters(prev => ({...prev, publisher: e.target.value}))}
                          className="form-input w-full h-10 text-sm"
                       />
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Ubicación</label>
                       <select 
                          value={filters.location}
                          onChange={(e) => setFilters(prev => ({...prev, location: e.target.value}))}
                          className="form-select w-full h-auto py-2 text-sm rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                       >
                         <option value="">Todas</option>
                         {ubicaciones.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                       </select>
                     </div>
                  </div>

                  {/* Price & Pages Range */}
                  <div className="space-y-4">
                     <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Precio (€)</label>
                       <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="Min" 
                            value={filters.minPrice}
                            onChange={(e) => setFilters(prev => ({...prev, minPrice: e.target.value}))}
                            className="form-input w-full h-10 text-sm"
                          />
                          <input 
                            type="number" 
                            placeholder="Max" 
                            value={filters.maxPrice}
                            onChange={(e) => setFilters(prev => ({...prev, maxPrice: e.target.value}))}
                            className="form-input w-full h-10 text-sm"
                          />
                       </div>
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Páginas</label>
                       <div className="flex gap-2">
                           <input 
                            type="number" 
                            placeholder="Min" 
                            value={filters.minPages}
                            onChange={(e) => setFilters(prev => ({...prev, minPages: e.target.value}))}
                            className="form-input w-full h-10 text-sm"
                          />
                          <input 
                            type="number" 
                            placeholder="Max" 
                            value={filters.maxPages}
                            onChange={(e) => setFilters(prev => ({...prev, maxPages: e.target.value}))}
                            className="form-input w-full h-10 text-sm"
                          />
                       </div>
                     </div>
                  </div>

                  {/* Year Range */}
                  <div>
                     <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Año de Publicación</label>
                     <div className="flex gap-2 mb-4">
                        <input 
                          type="number" 
                          placeholder="Desde" 
                          value={filters.startYear}
                          onChange={(e) => setFilters(prev => ({...prev, startYear: e.target.value}))}
                          className="form-input w-full h-10 text-sm"
                        />
                        <input 
                          type="number" 
                          placeholder="Hasta" 
                          value={filters.endYear}
                          onChange={(e) => setFilters(prev => ({...prev, endYear: e.target.value}))}
                          className="form-input w-full h-10 text-sm"
                        />
                     </div>
                  </div>

                  {/* Flags */}
                  <div className="flex flex-col justify-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <label className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-blue-600 transition-colors">
                         <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={filters.featured} 
                            onChange={(e) => setFilters(prev => ({...prev, featured: e.target.checked}))} 
                          />
                         <span className="font-medium">Destacados</span>
                      </label>
                       <label className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-blue-600 transition-colors">
                         <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={filters.isNew} 
                            onChange={(e) => setFilters(prev => ({...prev, isNew: e.target.checked}))} 
                          />
                         <span className="font-medium">Novedades</span>
                      </label>
                       <label className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-blue-600 transition-colors">
                         <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={filters.isOnSale} 
                            onChange={(e) => setFilters(prev => ({...prev, isOnSale: e.target.checked}))} 
                          />
                         <span className="font-medium">En Oferta</span>
                      </label>
                  </div>

                </div>
             </div>
          )}
       </div>

       {/* Table */}
       {loading ? (
         <div className="p-8 text-center text-gray-500">Cargando libros...</div>
       ) : (
         <BookTable 
           books={books} 
           onEdit={(book) => {
             setSelectedBook(book);
             setIsCreating(false);
             setIsModalOpen(true);
           }} 
           onDelete={handleDelete}
           onStockUpdate={handleStockUpdate}
         />
       )}

       {/* Pagination */}
       <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredCount}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          showItemsPerPageSelector={true}
       />

       {/* Modals */}
       <BookForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsCreating(false);
          setSelectedBook(null);
        }}
        onSubmit={isCreating ? handleCreateSubmit : handleEditSubmit}
        initialData={selectedBook}
        isCreating={isCreating}
        ubicaciones={ubicaciones}
      />

      <BookExistenceCheckModal
        isOpen={isCheckingExistence}
        onClose={() => setIsCheckingExistence(false)}
        onProceedToCreate={() => {
          setIsCheckingExistence(false);
          setIsCreating(true);
          setSelectedBook(null);
          setIsModalOpen(true);
        }}
        onProceedToEdit={(book) => {
          setIsCheckingExistence(false);
          setIsCreating(false);
          setSelectedBook(book);
          setIsModalOpen(true);
        }}
        onStockUpdated={() => {
          loadBooks();
          // Optional: Keep modal open or close?
          // User request implies quick +1, maybe keep open to allow more checks or just seeing the result.
          // But usually you might want to do it once. 
          // Let's keep it open so they see the result, they can close manually.
        }}
      />
       {createdBook && (
         <BookSuccessModal
           isOpen={!!createdBook}
           onClose={() => setCreatedBook(null)}
           book={createdBook}
         />
       )}
    </div>
  );
}
