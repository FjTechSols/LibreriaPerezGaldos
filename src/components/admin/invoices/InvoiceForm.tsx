import React, { useState, useEffect, useRef } from 'react';
import { InvoiceFormData, InvoiceItem } from '../../../types';
import { obtenerLibros, buscarLibros } from '../../../services/libroService';
import { Plus, Trash2, FileText, Search, User, Building2, School, X } from 'lucide-react'; // Added icons
import { getClientes, crearCliente } from '../../../services/clienteService';
import { MessageModal } from '../../MessageModal'; // Import MessageModal
import type { Cliente, Book } from '../../../types';
import '../../../styles/components/InvoiceForm.css';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TAX_RATES = [
  { value: 0, label: '0% (Exento)' },
  { value: 4, label: '4% (Super reducido - Libros)' },
  { value: 10, label: '10% (Reducido)' },
  { value: 21, label: '21% (General)' }
];

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_name: '',
    customer_address: '',
    customer_nif: '',
    tax_rate: 4,
    payment_method: '',
    order_id: '',
    items: [],
    shipping_cost: 0,
    language: 'es'
  });

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedBookId, setSelectedBookId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientes, setClientes] = useState<Cliente[]>([]);
  /* Removed selectedClienteId state - using only formData */
  /* Removed isManualEntry state */
  /* Removed isManualEntry state */
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  /* Removed loadingBooks state */
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Cargar libros
      try {
        const response = await obtenerLibros();
        setBooks(response.data);
        setFilteredBooks(response.data);
      } catch (error) {
        console.error('Error loading books:', error);
      }

      // Cargar clientes
      try{
        const response = await getClientes();
        setClientes(response.data.filter(c => c.activo));
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    fetchData();
  }, []);

  /* Client Autocomplete State */
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const clientAutocompleteRef = useRef<HTMLDivElement>(null);

  /* Client Creation Modal State */
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteModalData, setClienteModalData] = useState({
      nombre: '',
      apellidos: '',
      email: '',
      nif: '',
      tipo: 'particular' as 'particular' | 'empresa' | 'institucion',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigo_postal: '',
      provincia: '',
      pais: 'España',
      notas: '',
      activo: true,
      persona_contacto: '',
      cargo: '',
      web: ''
  });

  /* Message Modal State */
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success'; // removed warning to match typical usage or keep it if needed
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  /* Filter Clientes Effect */
  useEffect(() => {
    if (clienteSearch.trim()) {
      const filtered = clientes
        .filter((cliente) => {
          const fullName = `${cliente.nombre || ''} ${cliente.apellidos || ''}`.toLowerCase();
          const search = clienteSearch.toLowerCase();
          return (
            fullName.includes(search) ||
            cliente.email?.toLowerCase().includes(search) ||
            cliente.nif?.toLowerCase().includes(search)
          );
        })
        .filter((c) => c.activo);
      setFilteredClientes(filtered);
    } else {
      setFilteredClientes(clientes.filter((c) => c.activo));
    }
  }, [clienteSearch, clientes]);

  /* Click Outside Effect for Client Suggestions */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clientAutocompleteRef.current &&
        !clientAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowClienteSuggestions(false);
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Handlers */
  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSearch(`${cliente.nombre} ${cliente.apellidos}`);
    setFormData(prev => ({
        ...prev,
        customer_name: `${cliente.nombre} ${cliente.apellidos}`,
        customer_nif: cliente.nif || '',
        customer_address: cliente.direccion || ''
    }));
    setShowClienteSuggestions(false);
  };

  const handleOpenClienteModal = () => {
    setClienteModalData({
      nombre: '',
      apellidos: '',
      email: '',
      nif: '',
      tipo: 'particular',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigo_postal: '',
      provincia: '',
      pais: 'España',
      notas: '',
      activo: true,
      persona_contacto: '',
      cargo: '',
      web: ''
    });
    setShowClienteModal(true);
  };

  const handleCloseClienteModal = () => {
    setShowClienteModal(false);
  };

  const handleSubmitClienteModal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteModalData.nombre.trim()) {
      showModal('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    if (clienteModalData.tipo === 'particular' && !clienteModalData.apellidos.trim()) {
      showModal('Error', 'Los apellidos son obligatorios para particulares', 'error');
      return;
    }

    // setLoadingClientes(true); // Optional: show loading state
    try {
      const nuevoCliente = await crearCliente(clienteModalData);
      
      if (!nuevoCliente) {
        showModal('Error', 'Error al crear cliente', 'error');
        return;
      }
      
      // Update local clients list
      setClientes(prev => [...prev, nuevoCliente]);

      // Auto-select
      handleSelectCliente(nuevoCliente);
      
      handleCloseClienteModal();
      showModal('Éxito', 'Cliente creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creating client:', error);
      showModal('Error', 'Error al crear cliente', 'error');
    }
  };

  // ... (keeping other effects) ...
  /* Removed client-side filtering effect */
  /* Removed client-side filtering effect */
  const [advancedSearch, setAdvancedSearch] = useState(false);

  const handleSearch = async () => {
      if (!searchTerm.trim()) {
          setFilteredBooks(books);
          return;
      }
      
      try {
          const results = await buscarLibros(searchTerm, { searchFields: advancedSearch ? 'all' : 'code' });
          setFilteredBooks(results);
          setShowSuggestions(true);
      } catch (error) {
          console.error('Error searching books:', error);
          setFilteredBooks([]);
      }
  };

  useEffect(() => {
    // Initial load? No, wait for user search. 
    // Just keep books array for fallback? 
    // Actually we might not need to load ALL books initially if we rely on search.
    // typically invoices need search. 
    // Existing code loaded all books to `books` and `filteredBooks`. 
    // We can keep that or optimization later.
  }, []);

  // Removed debounce effect.

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBook = (bookId: string) => {
    const book = filteredBooks.find(b => b.id === bookId);
    if (book) {
      setSelectedBookId(bookId);
      setSearchTerm(book.title);
      setUnitPrice(book.price);
      setShowSuggestions(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedBookId) {
      setErrors({ ...errors, item: 'Debe seleccionar un libro de la lista' });
      return;
    }

    const book = filteredBooks.find(b => b.id === selectedBookId);
    if (!book) return;

    const lineTotal = quantity * unitPrice;
    const newItem: InvoiceItem = {
      book_id: selectedBookId,
      book_title: book.title,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });

    setSearchTerm('');
    setSelectedBookId('');
    setQuantity(1);
    setUnitPrice(0);
    setErrors({ ...errors, item: '' });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateItemsGross = () => {
    return formData.items.reduce((sum, item) => sum + item.line_total, 0);
  };

  const calculateSubtotal = () => {
    // This is effectively the Base Imponible (Net Amount)
    const itemsGross = calculateItemsGross();
    return itemsGross / (1 + formData.tax_rate / 100);
  };

  const calculateTax = () => {
    const itemsGross = calculateItemsGross();
    return itemsGross - calculateSubtotal();
  };

  const calculateTotal = () => {
    // Total is Gross Items + Shipping
    // Note: This assumes Shipping is added AFTER tax or is inherently gross/exempt in this simple logic, matching backend.
    return calculateItemsGross() + (formData.shipping_cost || 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'El nombre / razón social es obligatorio';
    }

    if (!formData.customer_address.trim()) {
      newErrors.customer_address = 'La dirección es obligatoria';
    }

    if (!formData.customer_nif.trim()) {
       newErrors.customer_nif = 'El NIF/CIF/DNI es obligatorio';
    } else if (!/^[A-Z0-9]{9}$/.test(formData.customer_nif.toUpperCase())) {
      // Basic format check, can be relaxed if needed
      newErrors.customer_nif = 'El NIF/CIF debe tener 9 caracteres alfanuméricos';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debe agregar al menos un libro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Datos del cliente</h3>
        
        <div className="form-group" style={{ position: 'relative' }}>
             <label className="flex justify-between items-center">
                <span>Seleccionar cliente</span>
                <button
                    type="button"
                    onClick={handleOpenClienteModal}
                    className="btn-link text-sm flex items-center gap-1 p-0"
                >
                    <Plus size={14} />
                    Nuevo Cliente
                </button>
             </label>
             <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" size={18} />
                 <input
                    type="text"
                    placeholder="Buscar cliente por nombre, NIF o email..."
                    value={clienteSearch}
                    onChange={(e) => {
                        setClienteSearch(e.target.value);
                        if (!e.target.value) {
                             setFormData(prev => ({ ...prev, customer_name: '', customer_nif: '', customer_address: '' }));
                        }
                    }}
                    onFocus={() => {
                        if (filteredClientes.length > 0) setShowClienteSuggestions(true);
                    }}
                    className="form-input pl-10"
                    autoComplete="off"
                 />
             </div>

             {showClienteSuggestions && filteredClientes.length > 0 && (
                <div className="autocomplete-suggestions" ref={clientAutocompleteRef}>
                    {filteredClientes.map(cliente => (
                        <div 
                            key={cliente.id} 
                            className="suggestion-item"
                            onClick={() => handleSelectCliente(cliente)}
                        >
                            <div className="font-bold text-[var(--text-main)]">{cliente.nombre} {cliente.apellidos}</div>
                            <div className="text-xs text-[var(--text-dim)]">
                                {cliente.nif || 'Sin NIF'} • {cliente.email || 'Sin email'}
                            </div>
                        </div>
                    ))}
                </div>
             )}
             
              {showClienteSuggestions && clienteSearch && filteredClientes.length === 0 && (
                 <div className="autocomplete-suggestions p-3 text-sm text-[var(--text-muted)]">
                     No se encontraron clientes. 
                     <button type="button" onClick={handleOpenClienteModal} className="btn-link ml-2">Crear nuevo</button>
                 </div>
             )}
        </div>

        <div className="form-grid">
           <div className="form-group full-width">
                 <label>Nombre / Razón Social *</label>
                 <input
                   type="text"
                   value={formData.customer_name}
                   onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                   className={errors.customer_name ? 'error' : ''}
                 />
                 {errors.customer_name && <span className="error-message">{errors.customer_name}</span>}
           </div>

           <div className="form-group">
             <label>NIF / CIF / DNI *</label>
             <input
               type="text"
               value={formData.customer_nif}
               onChange={(e) => setFormData({ ...formData, customer_nif: e.target.value.toUpperCase() })}
               maxLength={9}
               className={errors.customer_nif ? 'error' : ''}
             />
             {errors.customer_nif && <span className="error-message">{errors.customer_nif}</span>}
           </div>

           <div className="form-group full-width">
             <label>Dirección *</label>
             <input
               type="text"
               value={formData.customer_address}
               onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
               className={errors.customer_address ? 'error' : ''}
             />
             {errors.customer_address && <span className="error-message">{errors.customer_address}</span>}
           </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Agregar libros a la factura</h3>
        <p className="helper-text mb-4">
          Escriba el título, autor o ISBN del libro. Seleccione de las sugerencias, ajuste cantidad y precio, luego haga clic en "Agregar a la lista".
        </p>
        
        <div className="add-item-form">
          <div className="form-grid">
            <div className="form-group" ref={autocompleteRef} style={{ position: 'relative', flex: '1 1 300px' }}>
              <label>Buscar libro *</label>
              <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearch();
                          }
                      }}
                      onFocus={() => {
                        if (filteredBooks.length > 0) setShowSuggestions(true);
                      }}
                      placeholder={advancedSearch ? "Título, Autor, ISBN, Código..." : "Introduzca el código del libro..."}
                       className="form-input pl-10"
                       autoComplete="off"
                    />
                 </div>
                  <button 
                   type="button" 
                   onClick={handleSearch}
                   className="btn-submit h-[42px] px-4 font-bold"
                  >
                    Buscar
                  </button>
             </div>

             <div className="mt-2">
               <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="w-auto m-0"
                     checked={advancedSearch} 
                     onChange={(e) => setAdvancedSearch(e.target.checked)}
                   />
                   <span className="text-sm text-[var(--text-muted)]">Búsqueda avanzada (Título, Autor, ISBN)</span>
               </label>
             </div>
              
             {showSuggestions && filteredBooks.length > 0 && (
                <div className="autocomplete-suggestions">
                  {filteredBooks.length > 0 ? (
                    filteredBooks.slice(0, 10).map(book => (
                       <div
                        key={book.id}
                        className="suggestion-item"
                        onClick={() => handleSelectBook(book.id)}
                      >
                        <div className="suggestion-title font-bold text-[var(--text-main)]">{book.title}</div>
                        <div className="suggestion-subtitle text-xs mt-0.5 text-[var(--text-dim)]">
                          {book.author} • Code: {book.code} • ISBN: {book.isbn} • {formatCurrency(book.price)}
                        </div>
                      </div>
                    ))
                   ) : (
                    <div className="no-results-text p-3 text-sm text-[var(--text-dim)]">
                      No se encontraron libros
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="form-group">
              <label>Precio unitario *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>&nbsp;</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-add-item"
                disabled={!selectedBookId}
              >
                <Plus size={18} />
                Agregar a la lista
              </button>
            </div>
          </div>
          {errors.item && <span className="error-message">{errors.item}</span>}
        </div>

         {formData.items.length > 0 && (
          <div className="items-list mt-6">
            <div className="items-list-header mb-3 font-bold text-[var(--text-main)]">
              Libros agregados ({formData.items.length})
            </div>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Libro</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.book_title}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.line_total)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="btn-remove"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {errors.items && <span className="error-message">{errors.items}</span>}
      </div>

      <div className="form-section">
        <h3>Configuración adicional</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>IVA</label>
            <select
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
              className="form-select"
            >
              {TAX_RATES.map(rate => (
                <option key={rate.value} value={rate.value}>
                  {rate.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Método de pago (opcional)</label>
            <select
              value={formData.payment_method || ''}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="form-select"
            >
              <option value="">Seleccionar...</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="paypal">PayPal</option>
              <option value="transferencia">Transferencia</option>
              <option value="reembolso">Reembolso</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>

          <div className="form-group">
            <label>Gastos de envío</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.shipping_cost || 0}
              onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="invoice-summary">
        <div className="summary-row">
          <span>Base Imponible:</span>
          <span className="summary-amount">{formatCurrency(calculateSubtotal())}</span>
        </div>
        {(formData.shipping_cost || 0) > 0 && (
          <div className="summary-row">
            <span>Gastos de envío:</span>
            <span className="summary-amount">{formatCurrency(formData.shipping_cost || 0)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>IVA ({formData.tax_rate}%):</span>
          <span className="summary-amount">{formatCurrency(calculateTax())}</span>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <span className="summary-amount">{formatCurrency(calculateTotal())}</span>
        </div>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="language-selector">
          <label>Idioma de emisión:</label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value as 'es' | 'en' })}
          >
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇬🇧 Inglés</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onCancel} className="btn-cancel" disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            <FileText size={18} />
            {loading ? 'Creando factura...' : 'Crear factura'}
          </button>
        </div>
      </div>

       {/* Client Creation Modal */}
      {showClienteModal && (
        <div className="modal-overlay" onClick={handleCloseClienteModal}>
          <div className="modal-content max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold">Crear Nuevo Cliente</h2>
              <button 
                type="button"
                onClick={handleCloseClienteModal} 
                className="modal-close-btn"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
                {/* Client Type Tabs */}
                <div className="flex gap-2 mb-6 border-b border-[var(--border-subtle)]">
                  {(['particular', 'empresa', 'institucion'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setClienteModalData({...clienteModalData, tipo: t})}
                      className={`px-6 py-3 font-bold transition-all rounded-t-lg border-b-2 ${
                        clienteModalData.tipo === t 
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' 
                          : 'bg-transparent text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)]'
                      }`}
                    >
                      {t === 'particular' && <User size={16} className="inline mr-2" />}
                      {t === 'empresa' && <Building2 size={16} className="inline mr-2" />}
                      {t === 'institucion' && <School size={16} className="inline mr-2" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>{clienteModalData.tipo === 'particular' ? 'Nombre *' : (clienteModalData.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Institución *')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.nombre}
                      onChange={(e) => setClienteModalData({...clienteModalData, nombre: e.target.value})}
                      required 
                    />
                  </div>
                  
                  {clienteModalData.tipo === 'particular' && (
                    <div className="form-group full-width">
                      <label>Apellidos *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={clienteModalData.apellidos}
                        onChange={(e) => setClienteModalData({...clienteModalData, apellidos: e.target.value})}
                        required 
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={clienteModalData.email}
                      onChange={(e) => setClienteModalData({...clienteModalData, email: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>{clienteModalData.tipo === 'particular' ? 'NIF/DNI' : 'CIF'}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.nif}
                      onChange={(e) => setClienteModalData({...clienteModalData, nif: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Teléfono</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={clienteModalData.telefono}
                      onChange={(e) => setClienteModalData({...clienteModalData, telefono: e.target.value})}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Dirección</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.direccion}
                      onChange={(e) => setClienteModalData({...clienteModalData, direccion: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Ciudad</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.ciudad}
                      onChange={(e) => setClienteModalData({...clienteModalData, ciudad: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Código Postal</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.codigo_postal}
                      onChange={(e) => setClienteModalData({...clienteModalData, codigo_postal: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Provincia</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.provincia}
                      onChange={(e) => setClienteModalData({...clienteModalData, provincia: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>País</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.pais}
                      onChange={(e) => setClienteModalData({...clienteModalData, pais: e.target.value})}
                    />
                  </div>
                </div>
            </div>

            <div className="modal-footer flex justify-end gap-3 p-6 border-t border-[var(--border-subtle)]">
                <button type="button" onClick={handleCloseClienteModal} className="btn-cancel">
                  Cancelar
                </button>
                <button type="button" onClick={handleSubmitClienteModal} className="btn-submit">
                  Crear Cliente
                </button>
            </div>
          </div>
        </div>
      )}

      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type}
      />
    </form>
  );
};

export default InvoiceForm;
