import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Plus, Save } from 'lucide-react';
import { Book, Ubicacion } from '../../../types';
// import { categories } from '../../../data/categories'; // Still used for fallback or type checking?
import { buscarLibroPorISBNMultiple } from '../../../services/isbnService';
import { supabase } from '../../../lib/supabase'; // Import supabase

interface BookFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bookData: Partial<Book>, contents: string[]) => Promise<void>;
  initialData?: Book | null;
  isCreating: boolean;
  ubicaciones: Ubicacion[];
}

export function BookForm({ isOpen, onClose, onSubmit, initialData, isCreating, ubicaciones }: BookFormProps) {
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
    stock: 0,
    ubicacion: '',
    category: '', // Changed to empty string initially
    description: '',
    coverImage: '',
    featured: false,
    isNew: false,
    isOnSale: false
  });

  const [bookContents, setBookContents] = useState<string[]>([]);
  const [showContentInput, setShowContentInput] = useState(false);
  const [searchingISBN, setSearchingISBN] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dynamic categories
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
      setFormData(initialData);
      setBookContents(initialData.contents || []);
      setShowContentInput(!!initialData.contents && initialData.contents.length > 0);
    } else if (isCreating) {
      // Reset logic
      // We don't reset category here to hardcoded value, we let the fetch effect handle it or keep current
      setFormData(prev => ({
        ...prev,
        code: '',
        title: '',
        author: '',
        publisher: '',
        pages: 0,
        publicationYear: new Date().getFullYear(),
        isbn: '',
        price: 0,
        originalPrice: undefined,
        stock: 0,
        ubicacion: '',
        // category: categories[1], // Don't reset this if we want to keep the fetched default
        description: '',
        coverImage: '',
        featured: false,
        isNew: false,
        isOnSale: false
      }));
      setBookContents([]);
      setShowContentInput(false);
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
      alert('Por favor ingresa un ISBN válido (mínimo 10 caracteres)');
      return;
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

        alert('Información del libro encontrada y cargada en el formulario');
      } else {
        alert('No se encontró información para este ISBN. Puedes continuar ingresando los datos manualmente.');
      }
    } catch (error) {
      console.error('Error al buscar ISBN:', error);
      alert('Ocurrió un error al buscar el ISBN. Por favor, intenta nuevamente.');
    } finally {
      setSearchingISBN(false);
    }
  };

  const handleSubmit = async () => {
      setIsSubmitting(true);
      try {
          await onSubmit(formData, bookContents);
      } finally {
          setIsSubmitting(false);
      }
  };

  if (!isOpen) return null;

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
            {/* Form Fields */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Código Interno <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>(Opcional)</span></label>
                <input
                  type="text"
                  placeholder="Se generará automáticamente si se deja vacío"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                />
            </div>

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
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Editorial</label>
                    <input
                      type="text"
                      value={formData.publisher || ''}
                      onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
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
                      <option value="almacen">Almacén General</option>
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
    </div>
  );
}
