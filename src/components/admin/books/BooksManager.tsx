import { useState, useEffect } from 'react';
import { Plus, Search, LayoutList, Grid, X } from 'lucide-react';
import { Book, Ubicacion } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { 
  obtenerLibros, 
  obtenerEstadisticasLibros, 
  incrementarStockLibro, 
  crearLibro, 
  actualizarLibro, 
  eliminarLibro,
  obtenerOcrearEditorial,
  obtenerCategoriaId,
  obtenerSugerencias,
  buscarLibroParaMerge,
  obtenerSugerenciaOrtografica
} from '../../../services/libroService';
import '../../../styles/components/BooksManager.css';
import { obtenerUbicacionesActivas } from '../../../services/ubicacionService';
import { getCategorias } from '../../../services/categoriaService';
import { useSettings } from '../../../context/SettingsContext';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Pagination } from '../../Pagination';
import { BookTable } from './BookTable';
import { BookForm } from './BookForm';
import { BooksTableLegacy } from './BooksTableLegacy';
import { BookSuccessModal } from './BookSuccessModal';
import { BookExistenceCheckModal } from './BookExistenceCheckModal';
import { MessageModal } from '../../MessageModal'; // Import MessageModal
import AdvancedSearchModal from '../../AdvancedSearchModal';
import { AdvancedSearchCriteria } from '../../../types';
import { ExpressOrderModal, ExpressOrderData } from './ExpressOrderModal';

// Import sub-tools if we want to render them as tabs inside Manager (Optional, but planned for future)
// For now we focus on the Catalog section logic.

export function BooksManager() {
  const { actualTheme } = useTheme();
  const { settings } = useSettings();
  const { user } = useAuth();
  
  // State
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]); // For Autocomplete
  const [spellCheckSuggestions, setSpellCheckSuggestions] = useState<{field: string; value: string; label: string}[]>([]); // For "Did You Mean"

  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('booksManager_viewMode') as 'grid' | 'table') || 'grid';
  });

  // Persist View Mode
  useEffect(() => {
    localStorage.setItem('booksManager_viewMode', viewMode);
  }, [viewMode]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  
  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    onConfirm?: () => void;
    showCancel?: boolean;
    buttonText?: string;
  }>({ title: '', message: '', type: 'info' });

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

  const [isCheckingExistence, setIsCheckingExistence] = useState(false);
  // Book Form State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null); // Replaces editingBook
  const [createdBook, setCreatedBook] = useState<Book | null>(null); // For Success Modal
  
  // Express Order Modal State
  const [isExpressOrderOpen, setIsExpressOrderOpen] = useState(false);
  const [expressOrderBook, setExpressOrderBook] = useState<Book | null>(null);

  // Filters State
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  // const [suggestions, setSuggestions] = useState<string[]>([]); // Removed duplicate declaration
  const [showSuggestions, setShowSuggestions] = useState(false);
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
    titulo: '',
    autor: '',
    descripcion: '',
    searchMode: false,
    sortBy: 'default', // 'default' allows backend choice (legacy_id)
    sortOrder: 'desc' // Default to descending (Highest code first)
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
          titulo: filters.titulo || undefined,
          autor: filters.autor || undefined,
          descripcion: filters.descripcion || undefined,
          searchMode: filters.searchMode ? 'full' as const : 'title_legacy' as const,
          sortBy: (filters.sortBy as any) || undefined,
          sortOrder: (filters.sortOrder as any) || undefined,
          forceCount: true
        };

        const { data, count } = await obtenerLibros(currentPage, itemsPerPage, queryFilters);

        setBooks(data);
        setFilteredCount(count);

        // Spell check logic
        if (data.length === 0 && currentPage === 1) {
             const newSuggestions: {field: string; value: string; label: string}[] = [];

             // 1. Simple Search Validation
             if (queryFilters.search) {
                 const simpleSuggestion = await obtenerSugerenciaOrtografica(queryFilters.search);
                 if (simpleSuggestion) {
                     newSuggestions.push({ field: 'search', value: simpleSuggestion, label: 'Búsqueda' });
                 }
             }

             // 2. Advanced Fields Validation
             // We only check fields that are actually being used
             const advancedFields = [
                 { key: 'titulo', label: 'Título' },
                 { key: 'autor', label: 'Autor' },
                 { key: 'descripcion', label: 'Descripción' },
                 { key: 'publisher', label: 'Editorial' }
             ];

             for (const field of advancedFields) {
                 // Access the filter value dynamically. Type casting as we know these keys exist in queryFilters (mapped from filters)
                 const val = (queryFilters as any)[field.key];
                 if (val && typeof val === 'string' && val.trim().length > 0) {
                      const correction = await obtenerSugerenciaOrtografica(val);
                      if (correction) {
                          newSuggestions.push({ field: field.key, value: correction, label: field.label });
                      }
                 }
             }

             setSpellCheckSuggestions(newSuggestions);
        } else {
             setSpellCheckSuggestions([]);
        }
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
    setFilters(prev => ({ 
      ...prev, 
      search: localSearchTerm, 
      searchMode: false,
      // Clear advanced text filters to prevent collision
      titulo: '',
      autor: '',
      publisher: '',
      isbn: '',
      descripcion: '',
      legacy_id: ''
    }));
    setCurrentPage(1);
    setLocalSearchTerm(''); 
    setShowSuggestions(false);
  };


  const handleAdvancedSearch = (criteria: AdvancedSearchCriteria) => {
    setFilters(prev => ({
      ...prev,
      search: '', // Clear simple search when doing advanced search
      titulo: criteria.titulo || '',
      autor: criteria.autor || '',
      publisher: criteria.editorial || '', // Map editorial to publisher
      isbn: criteria.isbn || '',
      descripcion: criteria.descripcion || '',
      legacy_id: criteria.legacy_id || '',
      searchMode: false // Keep main search in simple mode
    }));
    setCurrentPage(1);
  };



  // Autocomplete Effect
  useEffect(() => {
     const delayDebounceFn = setTimeout(async () => {
        // Only fetch if "Full Search" mode is active (filters.searchMode)
        if (filters.searchMode && localSearchTerm.trim().length >= 2) {
           const sugs = await obtenerSugerencias(localSearchTerm);
           setSuggestions(sugs);
           // We don't set showSuggestions(true) here blindly, usually controlled by focus too,
           // but if they are typing, they are focused.
           setShowSuggestions(true);
        } else {
           setSuggestions([]);
           setShowSuggestions(false);
        }
     }, 300);

     return () => clearTimeout(delayDebounceFn);
  }, [localSearchTerm, filters.searchMode]); // Add searchMode to dependency

  // ... (handleCreateSubmit, etc stay same)

  // ... In Render ...


  const handleCreateSubmit = async (bookData: Partial<Book>, contents: string[]) => {
    // Validation: Title, Price, Location, Category are mandatory. Author is usually expected but user didn't explicitly list it as mandatory, though typically it is.
    // User said: "los pos que si son obligatorio son Titulo, Precio, Ubicacion y categoria"
    if (!bookData.title || !bookData.price || !bookData.ubicacion || !bookData.category) {
      showModal('Campos incompletos', 'Por favor completa los campos obligatorios: Título, Precio, Ubicación y Categoría.', 'error');
      return;
    }

    try {
      // ISBN logic: Not mandatory. If empty, defaults to 'N/A'.
      const rawISBN = bookData.isbn ? bookData.isbn.replace(/[-\s]/g, '') : '';
      const finalISBN = rawISBN || 'N/A';

      // Only check for existing book if we have a real ISBN
      if (finalISBN !== 'N/A') {
          // STRICT MERGE CHECK: Matches ISBN + Location + Price + Condition + Language
          // This allows users to create "Variants" (e.g. different price) without auto-merging.
          const libroExistente = await buscarLibroParaMerge(
              finalISBN,
              bookData.ubicacion,
              bookData.price,
              bookData.condition || 'leido',
              bookData.language || 'Español'
          );

          if (libroExistente) {
             const actualizado = await incrementarStockLibro(parseInt(libroExistente.id), 1);
             if (actualizado) {
               showModal('Libro Existente', 'Se encontró una copia exacta (mismos datos y ubicación). Stock incrementado.', 'success');
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
          oferta: bookData.isOnSale,
          descatalogado: bookData.isOutOfPrint,
          estado: bookData.condition,
          idioma: bookData.language
        } as any, contents);
        
        if (nuevo) {
          // Map DB response to UI Book object to ensure Modal works
          const mappedBook: Book = {
             id: nuevo.id.toString(),
             code: nuevo.legacy_id || '',
             title: nuevo.titulo,
             author: nuevo.autor,
             publisher: nuevo.editoriales?.nombre || '',
             pages: nuevo.paginas || 0,
             publicationYear: nuevo.anio || 0,
             isbn: nuevo.isbn || '',
             price: nuevo.precio,
             originalPrice: nuevo.precio_original,
             stock: nuevo.stock,
             ubicacion: nuevo.ubicacion, 
             category: '', 
             description: nuevo.descripcion || '',
             coverImage: nuevo.imagen_url || '',
             featured: nuevo.destacado || false,
             isNew: nuevo.novedad || false,
             isOnSale: nuevo.oferta || false,
             isOutOfPrint: nuevo.descatalogado || false,
             condition: nuevo.estado || 'leido',
             language: nuevo.idioma || 'Español',
             rating: 0,
             reviews: []
          };

          // Show Success Modal instead of Alert
          setCreatedBook(mappedBook);
          setRefreshTrigger(prev => prev + 1);
          setIsModalOpen(false); // Close the modal (resets form by unmounting)
        }
    } catch (e) {
      console.error('Error creating book:', e);
      showModal('Error', 'Error al crear el libro.', 'error');
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

      let categoriaId: number | null | undefined = undefined;
      if (bookData.category && bookData.category.trim().length > 0) {
          categoriaId = await obtenerCategoriaId(bookData.category);
      } else if (bookData.category === '') {
          categoriaId = null;
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
        descatalogado: bookData.isOutOfPrint,
        estado: bookData.condition,
        idioma: bookData.language,
        editorial_id: editorialId,
        categoria_id: categoriaId,
      };

      const updated = await actualizarLibro(parseInt(selectedBook.id), mappedUpdate as any, contents); // Use selectedBook
      if (updated) {
        setRefreshTrigger(prev => prev + 1);
        setSelectedBook(null); // Clear selected book
        setIsModalOpen(false); // Close the modal
        
        // Delay success modal to ensure previous modal is fully closed/unmounted
        setTimeout(() => {
            showModal('Éxito', 'Libro actualizado correctamente.', 'success');
        }, 300);
      } else {
        throw new Error('No se pudo actualizar.');
      }
    } catch (e) {
      console.error('Error updating book:', e);
      showModal('Error', 'Error al actualizar el libro.', 'error');
    }
  };

  const handleDelete = (id: string) => {
     showModal(
        'Confirmar Eliminación',
        '¿Estás seguro de que deseas eliminar este libro? Esta acción no se puede deshacer.',
        'warning',
        async () => {
            try {
                // Show loading state or just modify modal?
                // Ideally we would show a loader but simple replacement works for now.
                const deleted = await eliminarLibro(parseInt(id));
                if (deleted) {
                    setRefreshTrigger(prev => prev + 1);
                    setTimeout(() => {
                        showModal('Éxito', 'Libro eliminado correctamente.', 'success');
                    }, 300);
                } else {
                     showModal('Error', 'No se pudo eliminar el libro.', 'error');
                }
            } catch (e) {
                console.error('Error deleting book:', e);
                showModal('Error', 'Error al eliminar el libro.', 'error');
            }
        }
     );
  };

  const totalPages = Math.ceil((filters.search || filters.category !== 'Todos' || filters.stockStatus !== 'all' ? filteredCount : totalBooks) / itemsPerPage);

  const handleStockUpdate = (book: Book, amount: number) => {
    const action = amount > 0 ? "Aumentar" : "Reducir";
    const symbol = amount > 0 ? "+1" : "-1";
    const message = `¿${action} el stock del Libro (${book.title}, ${book.author}, ${book.code}) en ${symbol}?`; 
    
    showModal(
        'Confirmar Cambio de Stock',
        message,
        'warning',
        async () => {
             try {
                const updated = await incrementarStockLibro(parseInt(book.id), amount);
                if (updated) {
                    setRefreshTrigger(prev => prev + 1);
                     showModal('Éxito', `Stock ${action.toLowerCase()} en 1.`, 'success');
                } else {
                    showModal('Error', 'Error al actualizar el stock.', 'error');
                }
            } catch (e) {
                console.error('Error updating stock:', e);
                showModal('Error', 'Error inesperado al actualizar stock.', 'error');
            }
        }
    );
  };

  const handleExpressOrder = (book: Book) => {
    setExpressOrderBook(book);
    setIsExpressOrderOpen(true);
  };

  const handleExpressOrderSubmit = async (data: ExpressOrderData) => {
    if (!expressOrderBook || !user) return;
    
    try {
      const { crearPedidoExpress } = await import('../../../services/pedidoService');
      
      const pedido = await crearPedidoExpress({
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        pickupLocation: data.pickupLocation,
        bookId: parseInt(expressOrderBook.id),
        quantity: data.quantity,
        adminUserId: user.id,
        isDeposit: data.isDeposit,
        depositAmount: data.depositAmount
      });
      
      if (pedido) {
        setIsExpressOrderOpen(false);
        setExpressOrderBook(null);
        setTimeout(() => {
            showModal('¡Pedido Express Creado!', `Pedido #${pedido.id} creado correctamente para ${data.clientName}. Punto de recogida: ${data.pickupLocation}`, 'success');
        }, 300);
      }
    } catch (error) {
      console.error('Error creating express order:', error);
      showModal('Error', 'No se pudo crear el pedido express. Inténtalo de nuevo.', 'error');
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
           
           {/* View Toggle */}
           <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Vista de Cuadrícula"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Vista de Lista (Legacy)"
              >
                <LayoutList size={20} />
              </button>
           </div>

           <div className="admin-search books-manager-search">
             <div className="search-input-wrapper">
                <Search className="admin-search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por Código o Título..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                        handleSearch();
                        setShowSuggestions(false);
                     }
                  }}
                  onFocus={() => {
                     if (filters.searchMode && localSearchTerm.trim().length >= 2) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                     setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className="admin-search-input"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                   <ul className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {suggestions.map((suggestion, index) => (
                         <li 
                           key={index}
                           className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                           onClick={() => {
                              setLocalSearchTerm(suggestion);
                              // Force Full Search Mode when selecting a suggestion (since suggestions are Titles/Authors)
                              setFilters(prev => ({ ...prev, search: suggestion, searchMode: false }));
                              setCurrentPage(1); // Trigger search
                              setSuggestions([]);
                              setShowSuggestions(false);
                           }}
                         >
                            {suggestion}
                         </li>
                      ))}
                   </ul>
                )}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
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
             
             <div style={{ flex: '0 1 140px' }}>
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

              <div style={{ flex: '0 1 180px' }}>
                 <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Orden</label>
                 <select 
                    value={`${filters.sortBy}-${filters.sortOrder}`} 
                    onChange={(e) => {
                       const [sortBy, sortOrder] = e.target.value.split('-');
                       setFilters(prev => ({...prev, sortBy: sortBy as any, sortOrder: sortOrder as any}));
                    }} 
                    className="form-select w-full h-auto py-2 text-sm rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="default-desc">Código (Mayor a Menor)</option>
                   <option value="default-asc">Código (Menor a Mayor)</option>
                   <option value="newest-desc">Creación (Más Recientes)</option>
                   <option value="newest-asc">Creación (Más Antiguos)</option>
                   <option value="title-asc">Título (A-Z)</option>
                   <option value="price-asc">Precio (Menor a Mayor)</option>
                   <option value="price-desc">Precio (Mayor a Menor)</option>
                 </select>
              </div>

             <div className="flex items-center gap-4 ml-auto">
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
                          titulo: '',
                          autor: '',
                          descripcion: '',
                          searchMode: false,
                          sortBy: 'default',
                          sortOrder: 'desc'
                        });
                        setLocalSearchTerm('');
                        setAdvancedMode(false);
                    }}
                    className="text-sm font-medium text-gray-500 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-2"
                 >
                    Limpiar Filtros
                 </button>

                  <button 
                    onClick={() => setIsAdvancedSearchOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 transition-colors"
                  >
                    <Search size={16} />
                    Búsqueda Avanzada
                  </button>
                 
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

       {spellCheckSuggestions.length > 0 && (
            <div className="mb-6 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                {spellCheckSuggestions.map((sug, idx) => (
                    <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                        <span className="text-xl">💡</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            No encontramos resultados en <strong>{sug.label}</strong>. ¿Quizás quisiste decir: 
                            <button 
                                className="ml-1 font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none"
                                onClick={() => {
                                    if (sug.field === 'search') {
                                        setLocalSearchTerm(sug.value); 
                                        setFilters(prev => ({ ...prev, search: sug.value }));
                                    } else {
                                        // Update specific advanced filter
                                        setFilters(prev => ({ ...prev, [sug.field]: sug.value }));
                                        if (!advancedMode && sug.field !== 'search') {
                                            // Optional: setAdvancedMode(true);
                                        }
                                    }
                                    setCurrentPage(1);
                                    // Remove this suggestion from list (optimistic)
                                    setSpellCheckSuggestions(prev => prev.filter(item => item !== sug));
                                }}
                            >
                                {sug.value}
                            </button>
                            ?
                        </p>
                        <button
                            onClick={() => setSpellCheckSuggestions(prev => prev.filter((_, i) => i !== idx))}
                            className="ml-auto text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 transition-colors p-1"
                            title="Descartar sugerencia"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>
       )}

       {/* Table */}
          {/* Conditional View Rendering */}
          {loading ? (
             <div className="flex justify-center items-center py-20">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
             </div>
          ) : books.length > 0 ? (
             viewMode === 'grid' ? (
             /* Grid View (Original) */
             <BookTable 
               books={books} 
               onEdit={(book) => { setSelectedBook(book); setIsCreating(false); setIsModalOpen(true); }}
               onDelete={(id) => handleDelete(id)}
               onStockUpdate={handleStockUpdate}
               onExpressOrder={handleExpressOrder}

             />
          ) : (
             /* Legacy Table View */
             <BooksTableLegacy 
               books={books} 
               onEdit={(book) => { setSelectedBook(book); setIsCreating(false); setIsModalOpen(true); }}
               onDelete={(id) => handleDelete(id)}
               onStockUpdate={handleStockUpdate}
               onExpressOrder={handleExpressOrder}

               loading={loading}
             />
          )) : (
         <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
               <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No se encontraron libros</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
               No hay resultados para los filtros seleccionados. Puede que el libro no esté registrado en la base de datos.
            </p>
            <div className="flex gap-4">
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
                       titulo: '',
                       autor: '',
                       descripcion: '',
                       searchMode: false,
                       sortBy: 'default',
                       sortOrder: 'desc'
                     });
                     setLocalSearchTerm('');
                     setAdvancedMode(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
               >
                  Limpiar Filtros
               </button>
               <button 
                  onClick={() => setIsCheckingExistence(true)}
                  className="action-btn primary"
               >
                  <Plus size={16} />
                  Registrar Nuevo Libro
               </button>
            </div>
         </div>
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
        initialData={selectedBook || undefined}
        isCreating={isCreating}
        ubicaciones={ubicaciones}
        viewMode={viewMode} // Pass viewMode
      />

      <BookExistenceCheckModal
        isOpen={isCheckingExistence}
        onClose={() => setIsCheckingExistence(false)}
        onProceedToCreate={(prefillData) => {
          setIsCheckingExistence(false);
          setIsCreating(true);
          setSelectedBook(prefillData ? { ...prefillData, id: '', price: 0, stock: 1 } as any : null);
          setIsModalOpen(true);
        }}
        onProceedToEdit={(book) => {
          setIsCheckingExistence(false);
          setIsCreating(false);
          setSelectedBook(book);
          setIsModalOpen(true);
        }}
        onProceedToClone={(book) => {
          setIsCheckingExistence(false);
          setIsCreating(true);
          // Create a new book object based on the existing one but clearing unique fields
          // We cast to any to be flexible with the partial match
          const cloneData: any = {
            ...book,
            id: '', // Clear ID to ensure creation
            code: '', // Clear code so a new legacy ID is generated
            stock: 1, // Reset stock for new entry
            isNew: true, // Default to New? Or keep original? Let's default to New for a new entry.
            // Keep other fields: Title, Author, Publisher, etc.
          };
          setSelectedBook(cloneData);
          setIsModalOpen(true);
        }}
        onStockUpdated={() => {
          loadBooks();
          // Optional: Keep modal open or close?
          // User request implies quick +1, maybe keep open to allow more checks or just seeing the result.
          // But usually you might want to do it once. 
          // Let's keep it open so they see the result, they can close manually.
        }}
        viewMode={viewMode}
      />
       {createdBook && (
         <BookSuccessModal
           isOpen={!!createdBook}
           onClose={() => setCreatedBook(null)}
           book={createdBook}
         />
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
        <AdvancedSearchModal 
          isOpen={isAdvancedSearchOpen}
          onClose={() => setIsAdvancedSearchOpen(false)}
          onSearch={handleAdvancedSearch}
        />
        <ExpressOrderModal 
          isOpen={isExpressOrderOpen}
          book={expressOrderBook}
          onClose={() => {
            setIsExpressOrderOpen(false);
            setExpressOrderBook(null);
          }}
          onSubmit={handleExpressOrderSubmit}
        />
     </div>
  );
}
``