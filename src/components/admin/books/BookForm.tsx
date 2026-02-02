import { useState, useEffect, useRef } from 'react';
import { X, Search, Trash2, Plus, Save, Camera, ScanLine } from 'lucide-react';
import { Book, Ubicacion } from '../../../types';
// import { categories } from '../../../data/categories'; // Still used for fallback or type checking?
import { buscarLibroPorISBNMultiple } from '../../../services/isbnService';
import { supabase } from '../../../lib/supabase'; // Import supabase
import { obtenerUbicacionPorCodigo } from '../../../utils/codigoHelper';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { MessageModal } from '../../MessageModal'; // Import MessageModal
import { buscarEditoriales } from '../../../services/libroService';
import { BookFormLegacy } from './BookFormLegacy'; // Import Legacy Form

interface BookFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookData: Partial<Book>, contents: string[], publishToAbebooks?: boolean) => Promise<void>;
  initialData?: Book | null;
  isCreating: boolean;
  ubicaciones: Ubicacion[];
  viewMode?: 'grid' | 'table';
  onStockUpdate?: (book: Book, amount: number) => void;
  onExpressOrder?: (book: Book) => void;
  onClone?: (book: Book) => void;
}

export function BookForm({ isOpen, onClose, onSubmit, initialData, isCreating, ubicaciones, viewMode = 'grid' }: BookFormProps) {
  const [formData, setFormData] = useState<Partial<Book>>({
    code: '',
    title: '',
    author: '',
    publisher: '',
    pages: 0,
    publicationYear: new Date().getFullYear(),
    isbn: '',
    price: 0,
    originalPrice: undefined,
    stock: 1,
    ubicacion: 'Almacén',
    category: '', // Changed to empty string initially
    description: '',
    coverImage: '',
    featured: false,
    isNew: false,
    isOnSale: false,
    isOutOfPrint: false,
    condition: 'leido',
    language: 'Español'
  });

  const [bookContents, setBookContents] = useState<string[]>([]);
  const [showContentInput, setShowContentInput] = useState(false);
  const [searchingISBN, setSearchingISBN] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dynamic categories
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
        buttonText: onConfirm ? 'Sí, Crear' : 'Aceptar'
    });
    setShowMessageModal(true);
  };


  const LANGUAGES = [
      'Español', 'Inglés', 'Francés', 'Alemán', 'Italiano', 'Portugués', 
      'Catalán', 'Euskera', 'Gallego', 'Japonés', 'Chino', 'Ruso', 
      'Holandés', 'Polaco', 'Latín', 'Griego'
  ];

  // State for Editorial Autocomplete
  const [editorialSuggestions, setEditorialSuggestions] = useState<string[]>([]);
  const [showEditorialSuggestions, setShowEditorialSuggestions] = useState(false);

  // State for Language Autocomplete
  const [languageSuggestions, setLanguageSuggestions] = useState<string[]>(LANGUAGES);
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
  
  // AbeBooks State
  const [publishToAbebooks, setPublishToAbebooks] = useState(false);

  // Auto-toggle AbeBooks based on Price Rule (>= 12€)
  useEffect(() => {
     if (isCreating) {
        const currentPrice = formData.isOnSale ? formData.originalPrice : formData.price;
        const shouldPublish = (currentPrice || 0) >= 12;
        setPublishToAbebooks(shouldPublish);
     }
  }, [formData.price, formData.originalPrice, formData.isOnSale, isCreating]);

  const handleEditorialChange = async (val: string) => {
      setFormData({...formData, publisher: val});
      if (val.length >= 2) {
          try {
             const sugs = await buscarEditoriales(val);
             setEditorialSuggestions(sugs.map((s: any) => s.nombre));
             setShowEditorialSuggestions(true);
          } catch(e) {
             console.error(e);
          }
      } else {
          setEditorialSuggestions([]);
          setShowEditorialSuggestions(false);
      }
  };

  const handleLanguageChange = (val: string) => {
      setFormData({...formData, language: val});
      const filtered = LANGUAGES.filter(l => l.toLowerCase().includes(val.toLowerCase()));
      setLanguageSuggestions(filtered);
      setShowLanguageSuggestions(true);
  };


  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const isbnInputRef = useRef<HTMLInputElement>(null);

  const handleScanSuccess = (decodedText: string) => {
    // EAN-13 sometimes needs cleaning or checking
    // But usually it's just the number.
    setFormData(prev => ({ ...prev, isbn: decodedText }));
    // Automatically trigger search
    // We can't call handleISBNSearch directly because it relies on state that might not be updated yet
    // So we pass the text directly to a wrapper or effect.
    // However, handleISBNSearch reads from formData.isbn.
    // The safest way is to update state AND call a search function that accepts an argument.
    
    // Let's modify handleISBNSearch to accept optional argument or use a timeout effect.
    // Or just create a specific function for this.
    handleExplicitISBNSearch(decodedText);
  };

  const handleExplicitISBNSearch = async (isbn: string) => {
      // Re-use logic from handleISBNSearch but with explicit value
      setSearchingISBN(true);
      try {
        const bookData = await buscarLibroPorISBNMultiple(isbn);
        if (bookData) {
            setFormData(prev => ({
                ...prev,
                code: '',
                title: bookData.title,
                author: bookData.authors.join(', '),
                publisher: bookData.publisher,
                pages: bookData.pageCount,
                publicationYear: bookData.publishedDate ? parseInt(bookData.publishedDate.substring(0, 4)) : new Date().getFullYear(),
                isbn: bookData.isbn,
                category: bookData.categories[0] || (dbCategories.length > 0 ? dbCategories[0] : ''),
                description: bookData.description,
                coverImage: bookData.imageUrl,
            }));
             // Handle "Obra Completa"
            if (bookData.title && /obra\s*completa|colecci[oó]n|estuche|pack|set/i.test(bookData.title)) {
                setShowContentInput(true);
                setBookContents(['']);
            }

            showModal('Éxito', 'Información encontrada!', 'success');
        } else {
            showModal('Información', 'No se encontró información. Puedes ingresarla manualmente.', 'info');
        }
      } catch (e) {
        console.error(e);
        showModal('Error', 'Error al buscar.', 'error');
      } finally {
        setSearchingISBN(false);
      }
  };

  const handleUSBScanFocus = () => {
      // Just focus the input and select text
      if (isbnInputRef.current) {
          isbnInputRef.current.focus();
          isbnInputRef.current.select();
      }

      showModal(
        'Escanear con USB', 
        "Listo para escanear con USB. \n\n1. El cursor está en el campo ISBN.\n2. Dispara el lector.\n3. El formulario se rellenará automáticamente.",
        'info'
      );
  };

  // Fetch categories from DB
  useEffect(() => {
    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categorias')
                .select('nombre')
                .order('nombre');
            
            if (error) throw error;
            
            if (data) {
                const catNames = data.map(c => c.nombre);
                setDbCategories(catNames);
                
                // If creating and no category selected, default to first or specific one
                if (isCreating && !formData.category && catNames.length > 0) {
                     // Maybe 'Literatura' or just the first one? Let's leave it empty or first.
                     // The user previously defaulted to categories[1].
                     const defaultCat = catNames.find(c => c === 'Literatura') || catNames[0];
                     setFormData(prev => ({ ...prev, category: defaultCat }));
                }
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoadingCategories(false);
        }
    };
    
    if (isOpen) {
        fetchCategories();
    }
  }, [isOpen]); // Re-fetch when modal opens? Or just once on mount? Ideally once.
  // Actually, isOpen is fine to ensure it's fresh.

  useEffect(() => {
    if (initialData && !isCreating) {
      // Logic to autofill location from code if not already set or if explicitly requested
      let derivedUbicacion = initialData.ubicacion;
      if (!derivedUbicacion && initialData.code) {
          const ubi = obtenerUbicacionPorCodigo(initialData.code);
          if (ubi) derivedUbicacion = ubi;
      }

      setFormData({
          ...initialData,
          ubicacion: derivedUbicacion || initialData.ubicacion, // fallback to existing if null
      });
      setBookContents(initialData.contents || []);
      setShowContentInput(!!initialData.contents && initialData.contents.length > 0);
    } else if (isCreating && isOpen) {
      setFormData({
        code: '', // Always reset code for new books
        title: initialData?.title || '',
        author: initialData?.author || '',
        publisher: initialData?.publisher || '',
        pages: initialData?.pages || 0,
        publicationYear: initialData?.publicationYear || new Date().getFullYear(),
        isbn: initialData?.isbn || '',
        price: initialData?.price || 0,
        originalPrice: initialData?.originalPrice || undefined,
        stock: initialData?.stock ?? 1, // Start with 1 if not specified
        ubicacion: initialData?.ubicacion || 'Almacén',
        category: initialData?.category || '', 
        description: initialData?.description || '',
        coverImage: initialData?.coverImage || '',
        featured: initialData?.featured || false,
        isNew: initialData?.isNew || false,
        isOnSale: initialData?.isOnSale || false,
        isOutOfPrint: initialData?.isOutOfPrint || false,
        condition: initialData?.condition || 'leido',
        language: initialData?.language || 'Español'
      });
      setBookContents([]);
      setShowContentInput(false);

      // Si se importó un ISBN válido desde el modal de chequeo, disparamos la búsqueda automática
      // PERO SOLO si no es una copia/clon (si no tiene datos completos como editorial o páginas)
      const hasFullData = initialData?.publisher || (initialData?.pages && initialData.pages > 0);
      
      if (initialData?.isbn && initialData.isbn.trim().length >= 10 && !hasFullData) {
        handleExplicitISBNSearch(initialData.isbn.trim());
      }
    }
  }, [initialData, isCreating, isOpen]);

  // ... (handleISBNSearch and other handlers remain the same) ...
  // Need to update handleISBNSearch to use dbCategories or handled logic.
  
  // Update render:
  /*
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Categoría</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="form-select"
                      style={{ width: '100%' }}
                      disabled={loadingCategories}
                    >
                      {loadingCategories ? (
                        <option>Cargando...</option>
                      ) : (
                        <>
                            <option value="">Seleccionar</option>
                            {dbCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </>
                      )}
                    </select>
                </div>
  */


  const handleISBNSearch = async () => {
    const query = formData.isbn || '';
    
    if (!query || query.trim().length < 10) {

    }

    setSearchingISBN(true);

    try {
      const bookData = await buscarLibroPorISBNMultiple(query);

      if (bookData) {
        setFormData(prev => ({
          ...prev,
          code: '', // Keep empty or generate
          title: bookData.title,
          author: bookData.authors.join(', '),
          publisher: bookData.publisher,
          pages: bookData.pageCount,
          publicationYear: bookData.publishedDate ? parseInt(bookData.publishedDate.substring(0, 4)) : new Date().getFullYear(),
          isbn: bookData.isbn, // Ensure standard format
          price: 0,
          originalPrice: undefined,
          stock: 0,
          ubicacion: '',
          category: bookData.categories[0] || (dbCategories.length > 0 ? dbCategories[0] : ''),
          description: bookData.description,
          coverImage: bookData.imageUrl,
          featured: false,
          isNew: false,
          isOnSale: false
        }));

        // Handle "Obra Completa"
         if (bookData.title && /obra\s*completa|colecci[oó]n|estuche|pack|set/i.test(bookData.title)) {
             setShowContentInput(true);
             if (bookContents.length === 0) setBookContents(['']);
         }

        showModal('Éxito', 'Información del libro encontrada y cargada en el formulario', 'success');
      } else {
        showModal('Información', 'No se encontró información para este ISBN. Puedes continuar ingresando los datos manualmente.', 'info');
      }
    } catch (error) {
      console.error('Error al buscar ISBN:', error);
      showModal('Error', 'Ocurrió un error al buscar el ISBN. Por favor, intenta nuevamente.', 'error');
    } finally {
      setSearchingISBN(false);
    }
  };

  const handleSubmit = async () => {
      setIsSubmitting(true);
      try {
          // Validation: Category is mandatory
          if (!formData.category) {
              showModal('Campo Obligatorio', 'Por favor seleccione una categoría para el libro.', 'error');
              setIsSubmitting(false);
              return;
          }

          // Publisher Verification with Smart Confirmation
          if (formData.publisher && formData.publisher.trim()) {
             const cleanPub = formData.publisher.trim();
             // Check if it exists (robust check for trailing spaces or case)
             // We use a wildcard to find candidates, then match strictly in JS (ignoring whitespace differences)
             const { data: candidates } = await supabase
                .from('editoriales')
                .select('nombre')
                .ilike('nombre', `${cleanPub}%`)
                .limit(10);
             
             // Check if any candidate matches the cleaned name (case insensitive, whitespace insensitive)
             const match = candidates?.some(c => c.nombre.trim().toLowerCase() === cleanPub.toLowerCase());

             if (!match) {
                 // It's a new publisher. Ask for confirmation to prevent typos.
                 setIsSubmitting(false); // Pause submission
                 showModal(
                    'Nueva Editorial', 
                    `La editorial "${cleanPub}" no existe. ¿Desea crearla automáticamente? \n\nSi es un error tipográfico, pulse Cancelar y corríjalo.`, 
                    'warning',
                    () => {
                        // User confirmed. Proceed with submission.
                        setIsSubmitting(true);
                        onSubmit(formData, bookContents).finally(() => setIsSubmitting(false)); 
                        setShowMessageModal(false);
                    }
                 );
                 return; // Stop here, wait for modal callback
             }
          }

          await onSubmit(formData, bookContents, publishToAbebooks);
      } finally {
          setIsSubmitting(false);
      }
  };

  if (!isOpen) return null;

  if (viewMode === 'table') {
      return (
          <div className="modal-overlay">
              <div className="modal create-book-modal" style={{ maxWidth: '800px' }}>
                  <BookFormLegacy 
                      formData={formData}
                      setFormData={setFormData}
                      onSubmit={handleSubmit}
                      isSubmitting={isSubmitting}
                      isCreating={isCreating}
                      onClose={onClose}
                      ubicaciones={ubicaciones}
                      dbCategories={dbCategories}
                      loadingCategories={loadingCategories}
                      handleISBNSearch={handleISBNSearch}
                      searchingISBN={searchingISBN}
                      handleScanSuccess={handleScanSuccess}
                      handleEditorialChange={handleEditorialChange}
                      showEditorialSuggestions={showEditorialSuggestions}
                      editorialSuggestions={editorialSuggestions}
                      setShowEditorialSuggestions={setShowEditorialSuggestions}
                  />
              </div>
          </div>
      );
  }

  return (
    <div className="modal-overlay">
      <div className="modal create-book-modal">
        <div className="modal-header">
          <h3 className="modal-title">{isCreating ? 'Crear Nuevo Libro' : 'Editar Libro'}</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {isCreating && (
          <div className="isbn-search-container">
            {/* Scanner Options Row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)' }}>
                <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem',
                        background: '#2563eb', 
                        color: 'white', 
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                    }}
                >
                    <Camera size={18} />
                    Escanear con Cámara
                </button>
                 <button
                    type="button"
                    onClick={handleUSBScanFocus}
                    style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.5rem',
                        background: '#f1f5f9', 
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '0.9rem'
                    }}
                >
                    <ScanLine size={18} />
                    Escanear con USB
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Gestión de ISBN</h4>
                <button 
                    type="button" 
                    onClick={() => setShowContentInput(!showContentInput)}
                    className={showContentInput ? "active-toggle" : ""}
                    style={{ 
                        fontSize: '0.85rem', 
                        background: showContentInput ? 'var(--primary-color)' : 'transparent', 
                        border: '1px solid var(--primary-color)',
                        color: showContentInput ? '#fff' : 'var(--primary-color)', 
                        cursor: 'pointer', 
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        transition: 'all 0.2s'
                    }}
                >
                    {showContentInput ? '✓ Es Obra Completa' : '+ Es Obra Completa?'}
                </button>
            </div>

            <p>Ingresa el ISBN para buscar datos automáticos. También puedes escribirlo manualmente.</p>
            <div className="search-actions">
              <input
                ref={isbnInputRef}
                type="text"
                className="search-input"
                value={formData.isbn || ''}
                onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, isbn: val });
                    if (/obra\s*completa|colecci[oó]n|estuche|pack|set|tomo|volumen/i.test(val)) {
                        if (!showContentInput) setShowContentInput(true);
                    }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !searchingISBN) handleISBNSearch();
                }}
                placeholder="Ingresa ISBN (ej: 9788420412146)"
                disabled={searchingISBN}
              />
              <button
                onClick={handleISBNSearch}
                disabled={searchingISBN || !formData.isbn}
                className="search-btn"
              >
                <Search size={18} />
                {searchingISBN ? 'Buscando...' : 'Buscar Datos'}
              </button>
            </div>
          </div>
        )}

        <div className="book-form-container" style={{ padding: '0 1rem' }}>
            {/* Form Fields - Hidden Código Interno during creation */}
            {!isCreating && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Código Interno</label>
                    <input
                      type="text"
                      placeholder="Código interno"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                </div>
            )}

            {!isCreating && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>ISBN</label>
                    <input
                      type="text"
                      placeholder="ISBN del libro"
                      value={formData.isbn || ''}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Título *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                />
            </div>

            {/* Obra Completa Fields */}
            {isCreating && showContentInput && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <label style={{ color: '#2563eb', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Contenido / Volúmenes de la Obra</label>
                  {bookContents.map((content, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ alignSelf: 'center', fontWeight: 'bold', color: '#94a3b8', minWidth: '25px' }}>#{idx + 1}</span>
                      <input 
                        type="text" 
                        value={content}
                        onChange={(e) => {
                          const newContents = [...bookContents];
                          newContents[idx] = e.target.value;
                          setBookContents(newContents);
                        }}
                        placeholder={`Título del Volumen ${idx + 1}`}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newContents = bookContents.filter((_, i) => i !== idx);
                          setBookContents(newContents);
                        }}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setBookContents([...bookContents, ''])}
                    style={{ marginTop: '0.5rem', background: 'none', border: '1px dashed #cbd5e1', color: '#2563eb', padding: '0.5rem', width: '100%', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Plus size={16} /> Añadir otro volumen
                  </button>
                </div>
            )}

            <div className="form-row-2">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Autor</label>
                    <input
                      type="text"
                      value={formData.author || ''}
                      onChange={(e) => setFormData({...formData, author: e.target.value})}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Editorial</label>
                    <input
                      type="text"
                      value={formData.publisher || ''}
                      onChange={(e) => handleEditorialChange(e.target.value)}
                      onBlur={() => setTimeout(() => setShowEditorialSuggestions(false), 200)}
                      className="form-input"
                      style={{ width: '100%' }}
                      placeholder="Escribe para buscar..."
                      autoComplete="off"
                    />
                    {/* Editorial Suggestions Dropdown */}
                    {showEditorialSuggestions && editorialSuggestions.length > 0 && (
                        <ul className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                            {editorialSuggestions.map((s, i) => (
                                <li 
                                    key={i}
                                    onClick={() => {
                                        setFormData({...formData, publisher: s});
                                        setEditorialSuggestions([]);
                                        setShowEditorialSuggestions(false);
                                    }}
                                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                                >
                                    {s}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="form-row-3">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Año</label>
                    <input
                      type="number"
                      value={formData.publicationYear || ''}
                      onChange={(e) => setFormData({...formData, publicationYear: parseInt(e.target.value)})}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Páginas</label>
                    <input
                      type="number"
                      value={formData.pages || ''}
                      onChange={(e) => setFormData({...formData, pages: parseInt(e.target.value)})}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      {formData.isOnSale ? 'Precio Original ($) *' : 'Precio ($) *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(formData.isOnSale ? formData.originalPrice : formData.price) || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (formData.isOnSale) setFormData({...formData, originalPrice: val});
                        else setFormData({...formData, price: val});
                      }}
                      className="form-input no-spinner"
                      style={{ width: '100%' }}
                      placeholder="10.00"
                    />
                </div>
            </div>

            <div className="form-row-3">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Ubicación</label>
                    <select
                      value={formData.ubicacion || ''}
                      onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                      className="form-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccionar</option>
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.nombre}>{u.nombre}</option>
                      ))}

                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Categoría</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="form-select"
                      style={{ width: '100%' }}
                      disabled={loadingCategories}
                    >
                      <option value="">Seleccionar</option>
                      {loadingCategories ? (
                        <option value="" disabled>Cargando...</option>
                      ) : (
                        dbCategories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))
                      )}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Stock</label>
                    <input
                      type="number"
                      value={formData.stock || 0}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>URL Portada</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="url"
                      value={formData.coverImage || ''}
                      onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                    {formData.coverImage && (
                        <div style={{ width: '40px', height: '40px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={formData.coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Opciones Especiales</label>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.featured || false}
                    onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                  />
                  Destacado
                </label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isNew || false}
                    onChange={(e) => setFormData({...formData, isNew: e.target.checked})}
                  />
                  Novedad
                </label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isOnSale || false}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setFormData(prev => ({
                          ...prev,
                          isOnSale: isChecked,
                          originalPrice: isChecked ? (prev.price) : prev.originalPrice,
                          price: (!isChecked && prev.originalPrice) ? prev.originalPrice : prev.price
                      }));
                    }}
                  />
                  Oferta
                </label>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#dc2626', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={formData.isOutOfPrint || false}
                    onChange={(e) => setFormData({...formData, isOutOfPrint: e.target.checked})}
                  />
                  Descatalogado
                </label>

                   {/* AbeBooks Checkbox (Sólo al crear) */}
                   {isCreating && (
                       <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}>
                           <input
                               type="checkbox"
                               checked={publishToAbebooks}
                               onChange={(e) => setPublishToAbebooks(e.target.checked)}
                           />
                           Enviar a AbeBooks
                       </label>
                   )}
              </div>
            </div>

            <div style={{ 
                marginTop: '1rem', 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '2rem', 
                alignItems: 'flex-start', 
                borderTop: '1px dashed var(--border-color)', 
                paddingTop: '1rem',
                marginBottom: '1rem' 
            }}>
                  {/* Estado / Condición */}
                  <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Estado Físico</label>
                      <div style={{ display: 'flex', gap: '1rem', height: '38px', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                              <input 
                                  type="radio" 
                                  name="condition" 
                                  value="nuevo"
                                  checked={formData.condition === 'nuevo'}
                                  onChange={() => setFormData({...formData, condition: 'nuevo'})}
                              />
                              Nuevo
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                              <input 
                                  type="radio" 
                                  name="condition" 
                                  value="leido"
                                  checked={!formData.condition || formData.condition === 'leido'}
                                  onChange={() => setFormData({...formData, condition: 'leido'})}
                              />
                              Leído
                          </label>
                      </div>
                  </div>

                  {/* Idioma */}
                  <div style={{ flex: 1, maxWidth: '200px', position: 'relative' }}>
                     <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Idioma</label>
                     <input
                       type="text"
                       value={formData.language || 'Español'}
                       onChange={(e) => handleLanguageChange(e.target.value)}
                       onFocus={() => {
                           // Show all if empty or current value
                           const val = formData.language || '';
                           const filtered = LANGUAGES.filter(l => l.toLowerCase().includes(val.toLowerCase()));
                           setLanguageSuggestions(filtered);
                           setShowLanguageSuggestions(true);
                       }}
                       onBlur={() => setTimeout(() => setShowLanguageSuggestions(false), 200)}
                       className="form-input"
                       style={{ width: '100%' }}
                       autoComplete="off"
                     />
                     {showLanguageSuggestions && languageSuggestions.length > 0 && (
                        <ul className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto" style={{ marginTop: '2px' }}>
                            {languageSuggestions.map((lang, i) => (
                                <li 
                                    key={i}
                                    onClick={() => {
                                        setFormData({...formData, language: lang});
                                        setShowLanguageSuggestions(false);
                                    }}
                                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                                >
                                    {lang}
                                </li>
                            ))}
                        </ul>
                     )}
                  </div>
            </div>

            {formData.isOnSale && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#ef4444' }}>Configuración de Oferta</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Precio Oferta ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input no-spinner"
                      style={{ width: '100%', borderColor: '#ef4444' }}
                      value={formData.price || ''}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div style={{ paddingBottom: '0.6rem', textAlign: 'center' }}>
                     {(() => {
                        const original = formData.originalPrice || 0;
                        const current = formData.price || 0;
                        if (original > 0 && current > 0 && original > current) {
                           const discount = Math.round(((original - current) / original) * 100);
                           return <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>-{discount}%</span>;
                        }
                        return <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>--%</span>;
                     })()}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Descripción</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="form-textarea"
                  style={{ width: '100%', minHeight: '100px', fontFamily: 'inherit' }}
                  rows={4}
                />
            </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
           <button onClick={onClose} className="cancel-btn">Cancelar</button>
           <button 
              onClick={handleSubmit} 
              className="save-btn"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
           >
               <Save size={16} />
               {isSubmitting ? 'Guardando...' : (isCreating ? 'Crear Libro' : 'Guardar Cambios')}
           </button>
        </div>
      </div>
      
      <BarcodeScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess} 
      />
      
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
