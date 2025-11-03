import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, Save, X, BarChart3, Book, FileText, ShoppingBag, Home, Search, DollarSign, Users as UsersIcon, Package, Calendar, Phone, Mail, MapPin, Globe, Building } from 'lucide-react';
import { Book as BookType, Invoice, Order, InvoiceFormData, Factura, Pedido } from '../types';
import { mockBooks, categories } from '../data/mockBooks';
import { useAuth } from '../context/AuthContext';
import { useInvoice } from '../context/InvoiceContext';
import { useSettings } from '../context/SettingsContext';
import InvoiceTable from '../components/InvoiceTable';
import InvoiceModal from '../components/InvoiceModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import FacturaList from '../components/FacturaList';
import GenerarFacturaModal from '../components/GenerarFacturaDesdeped';
import PedidosList from '../components/PedidosList';
import PedidoDetalle from '../components/PedidoDetalle';
import CrearPedido from '../components/CrearPedido';
import { GestionClientes } from '../components/GestionClientes';
import { Pagination } from '../components/Pagination';
import '../styles/pages/AdminDashboard.css';

type AdminSection = 'dashboard' | 'books' | 'invoices' | 'orders' | 'clients';

export function AdminDashboard() {
  const { user } = useAuth();
  const { invoices, loading, createInvoice, updateInvoiceStatus } = useInvoice();
  const { formatPrice, settings } = useSettings();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [books, setBooks] = useState<BookType[]>(mockBooks);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState('');
  const [invoiceFilterCustomer, setInvoiceFilterCustomer] = useState('');
  const [invoiceFilterDateFrom, setInvoiceFilterDateFrom] = useState('');
  const [invoiceFilterDateTo, setInvoiceFilterDateTo] = useState('');
  const [isGenerarFacturaModalOpen, setIsGenerarFacturaModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [refreshFacturas, setRefreshFacturas] = useState(0);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isPedidoDetalleOpen, setIsPedidoDetalleOpen] = useState(false);
  const [isCrearPedidoOpen, setIsCrearPedidoOpen] = useState(false);
  const [refreshPedidos, setRefreshPedidos] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (settings?.system?.itemsPerPageAdmin) {
      setItemsPerPage(settings.system.itemsPerPageAdmin);
    }
  }, [settings]);

  const [newBook, setNewBook] = useState<Partial<BookType>>({
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
    category: categories[1],
    description: '',
    coverImage: '',
    rating: 0,
    reviews: [],
    featured: false,
    isNew: false,
    isOnSale: false
  });

  if (user?.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="access-denied">
            <h1>Acceso Denegado</h1>
            <p>No tienes permisos para acceder a esta página</p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateBook = () => {
    if (newBook.title && newBook.author && newBook.publisher && newBook.isbn && newBook.price) {
      const bookId = Date.now().toString();
      const autoCode = newBook.code || `LIB${bookId.slice(-6)}`;

      const bookToAdd: BookType = {
        id: bookId,
        code: autoCode,
        title: newBook.title,
        author: newBook.author,
        publisher: newBook.publisher,
        pages: newBook.pages || 0,
        publicationYear: newBook.publicationYear || new Date().getFullYear(),
        isbn: newBook.isbn,
        price: newBook.price,
        originalPrice: newBook.isOnSale ? newBook.originalPrice : undefined,
        stock: newBook.stock || 0,
        category: newBook.category || categories[1],
        description: newBook.description || '',
        coverImage: newBook.coverImage || 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: newBook.rating || 0,
        reviews: [],
        featured: newBook.featured || false,
        isNew: newBook.isNew || false,
        isOnSale: newBook.isOnSale || false
      };

      setBooks(prev => [...prev, bookToAdd]);
      setNewBook({
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
        category: categories[1],
        description: '',
        coverImage: '',
        rating: 0,
        reviews: [],
        featured: false,
        isNew: false,
        isOnSale: false
      });
      setIsCreating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditBook = (book: BookType) => {
    setEditingBook({ ...book });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEdit = () => {
    if (editingBook) {
      setBooks(prev => prev.map(book => 
        book.id === editingBook.id ? editingBook : book
      ));
      setEditingBook(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteBook = (bookId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este libro?')) {
      setBooks(prev => prev.filter(book => book.id !== bookId));
    }
  };

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter data based on search query
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleCreateInvoice = async (formData: InvoiceFormData) => {
    const result = await createInvoice(formData);
    if (result) {
      setIsInvoiceModalOpen(false);
    }
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalOpen(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text('FACTURA', 105, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.text(settings.company.name, 20, 40);
      doc.text(settings.company.address, 20, 45);
      doc.text(`NIF: ${settings.company.taxId}`, 20, 50);
      doc.text(`Tel: ${settings.company.phone}`, 20, 55);
      doc.text(`Email: ${settings.company.email}`, 20, 60);

      doc.setFontSize(12);
      doc.text(`N° ${invoice.invoice_number}`, 150, 40);
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date(invoice.issue_date).toLocaleDateString('es-ES')}`, 150, 45);
      doc.text(`Estado: ${invoice.status}`, 150, 50);

      doc.text('FACTURAR A:', 20, 75);
      doc.text(invoice.customer_name, 20, 80);
      doc.text(invoice.customer_address, 20, 85);
      doc.text(`NIF: ${invoice.customer_nif}`, 20, 90);

      let y = 105;
      doc.setFontSize(10);
      doc.text('Descripción', 20, y);
      doc.text('Cant.', 100, y);
      doc.text('Precio Unit.', 125, y);
      doc.text('Total', 170, y);
      doc.line(20, y + 2, 190, y + 2);

      y += 8;
      if (invoice.items) {
        invoice.items.forEach(item => {
          doc.text(item.book_title, 20, y);
          doc.text(item.quantity.toString(), 100, y);
          doc.text(`${item.unit_price.toFixed(2)} €`, 125, y);
          doc.text(`${item.line_total.toFixed(2)} €`, 170, y);
          y += 7;
        });
      }

      y += 10;
      doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)} €`, 150, y);
      y += 7;
      doc.text(`IVA (${invoice.tax_rate}%): ${invoice.tax_amount.toFixed(2)} €`, 150, y);
      y += 7;
      doc.setFontSize(12);
      doc.text(`TOTAL: ${invoice.total.toFixed(2)} €`, 150, y);

      doc.save(`Factura-${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handleChangeInvoiceStatus = async (id: string, status: Invoice['status']) => {
    await updateInvoiceStatus(id, status);
  };

  const stats = {
    totalBooks: books.length,
    totalInvoices: invoices.length,
    totalOrders: 0,
    totalRevenue: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    inStock: books.filter(book => book.stock > 0).length,
    outOfStock: books.filter(book => book.stock === 0).length,
    pendingInvoices: invoices.filter(invoice => invoice.status === 'Pendiente').length,
    processingOrders: 0
  };

  console.log('📊 Estadísticas Dashboard:', {
    invoices: invoices.length,
    totalRevenue: stats.totalRevenue,
    pendingInvoices: stats.pendingInvoices,
    loading: loading
  });

  const renderDashboard = () => (
    <div className="stats-section">
      {loading && (
        <div style={{
          padding: '1rem',
          background: '#eff6ff',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center',
          color: '#1e40af'
        }}>
          ⏳ Cargando estadísticas...
        </div>
      )}

      {!loading && invoices.length === 0 && (
        <div style={{
          padding: '1.5rem',
          background: '#fef3c7',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center',
          color: '#92400e',
          border: '2px solid #fbbf24'
        }}>
          <strong>ℹ️ No hay facturas todavía</strong>
          <br />
          <span style={{ fontSize: '0.875rem' }}>
            Ve a la sección "Facturas" y crea tu primera factura para ver las estadísticas aquí.
          </span>
        </div>
      )}

      {!loading && invoices.length > 0 && (
        <div style={{
          padding: '1rem',
          background: '#d1fae5',
          borderRadius: '8px',
          marginBottom: '1rem',
          textAlign: 'center',
          color: '#065f46',
          border: '2px solid #10b981'
        }}>
          ✅ Tienes {invoices.length} {invoices.length === 1 ? 'factura' : 'facturas'} con ingresos de {formatPrice(stats.totalRevenue)}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon books">
            <Book size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalBooks}</span>
            <span className="stat-label">Total Libros</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon invoices">
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: stats.totalInvoices === 0 ? '#94a3b8' : 'inherit' }}>
              {stats.totalInvoices}
            </span>
            <span className="stat-label">Facturas</span>
            {stats.totalInvoices === 0 && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Sin facturas aún
              </span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orders">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalOrders}</span>
            <span className="stat-label">Pedidos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" style={{ color: stats.totalRevenue === 0 ? '#94a3b8' : 'inherit' }}>
              {formatPrice(stats.totalRevenue)}
            </span>
            <span className="stat-label">Ingresos</span>
            {stats.totalRevenue === 0 && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Sin ingresos aún
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="company-info">
        <div className="company-header">
          <div className="company-logo">
            <img src={settings.company.logo} alt={settings.company.name} />
          </div>
          <div className="company-details">
            <h3 className="company-name">{settings.company.name}</h3>
            <p className="company-tagline">Librería Online Especializada</p>
          </div>
        </div>

        <div className="company-info-grid">
          <div className="info-item">
            <span className="info-label">Dirección:</span>
            <span className="info-value">{settings.company.address}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Teléfono:</span>
            <span className="info-value">{settings.company.phone}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span className="info-value">{settings.company.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Sitio Web:</span>
            <span className="info-value">{settings.company.website}</span>
          </div>
          <div className="info-item">
            <span className="info-label">NIF:</span>
            <span className="info-value">{settings.company.taxId}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Libros en Stock:</span>
            <span className="info-value">{stats.inStock}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBooks = () => (
    <div>
      <div className="data-table books-table">
        <div className="table-header">
          <span>Código</span>
          <span>Portada</span>
          <span>Título</span>
          <span>Autor</span>
          <span>Editorial</span>
          <span>Categoría</span>
          <span>Páginas</span>
          <span>Precio</span>
          <span>Stock</span>
          <span>Acciones</span>
        </div>

        {currentBooks.map(book => (
          <div key={book.id} className="table-row">
            <span className="book-code-cell">{book.code}</span>
            <div className="book-cover">
              <img src={book.coverImage} alt={book.title} />
              {(book.featured || book.isNew || book.isOnSale) && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                  {book.featured && <span title="Destacado">📌</span>}
                  {book.isNew && <span title="Nuevo">✨</span>}
                  {book.isOnSale && <span title="En Oferta">🏷️</span>}
                </div>
              )}
            </div>
            <span className="book-title-cell">
              {book.title}
              {(book.featured || book.isNew || book.isOnSale) && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                  {book.featured && <span style={{ color: '#f59e0b' }} title="Destacado">📌</span>}
                  {book.isNew && <span style={{ color: '#10b981' }} title="Nuevo">✨</span>}
                  {book.isOnSale && <span style={{ color: '#ef4444' }} title="En Oferta">🏷️</span>}
                </div>
              )}
            </span>
            <span className="book-author-cell">{book.author}</span>
            <span className="book-publisher-cell">{book.publisher}</span>
            <span className="book-category-cell">{book.category}</span>
            <span className="book-pages-cell">{book.pages}</span>
            <span className="book-price-cell">
              ${book.price}
              {book.isOnSale && book.originalPrice && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', textDecoration: 'line-through', marginTop: '0.25rem' }}>
                  ${book.originalPrice}
                </span>
              )}
            </span>
            <span className={`book-stock-cell ${book.stock === 0 ? 'out-of-stock' : ''}`}>
              {book.stock}
            </span>
            <div className="book-actions">
              <button 
                onClick={() => handleEditBook(book)}
                className="edit-btn"
                aria-label="Editar libro"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={() => handleDeleteBook(book.id)}
                className="delete-btn"
                aria-label="Eliminar libro"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredBooks.length}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        showItemsPerPageSelector={true}
        itemsPerPageOptions={[10, 20, 50]}
      />
    </div>
  );

  const renderInvoices = () => (
    <div className="invoices-section">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <h2>Gestión de Facturas</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setIsGenerarFacturaModalOpen(true)}
            className="action-btn primary"
          >
            <Plus size={20} />
            Nueva Factura
          </button>
        </div>
      </div>

      <InvoiceTable
        invoices={invoices}
        loading={loading}
        onViewDetails={handleViewInvoiceDetails}
        onDownloadPDF={handleDownloadPDF}
        onChangeStatus={handleChangeInvoiceStatus}
        searchTerm={invoiceSearchTerm}
        filterStatus={invoiceFilterStatus}
        filterCustomer={invoiceFilterCustomer}
        filterDateFrom={invoiceFilterDateFrom}
        filterDateTo={invoiceFilterDateTo}
      />
    </div>
  );

  const renderOrders = () => (
    <div className="pedidos-section">
      <PedidosList
        key={refreshPedidos}
        onVerDetalle={(pedido) => {
          setSelectedPedido(pedido);
          setIsPedidoDetalleOpen(true);
        }}
        refreshTrigger={refreshPedidos}
      />
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Panel de Administrador</h1>
          <p className="dashboard-subtitle">Gestión completa de la librería</p>
        </div>

        <div className="dashboard-layout">
          <div className="dashboard-sidebar">
            <nav className="sidebar-nav">
              <button
                onClick={() => handleSectionChange('dashboard')}
                className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              >
                <Home size={20} />
                Inicio
              </button>
              <button
                onClick={() => handleSectionChange('books')}
                className={`nav-item ${activeSection === 'books' ? 'active' : ''}`}
              >
                <Book size={20} />
                Catálogo
              </button>
              <button
                onClick={() => handleSectionChange('invoices')}
                className={`nav-item ${activeSection === 'invoices' ? 'active' : ''}`}
              >
                <FileText size={20} />
                Facturas
              </button>
              <button
                onClick={() => handleSectionChange('orders')}
                className={`nav-item ${activeSection === 'orders' ? 'active' : ''}`}
              >
                <ShoppingBag size={20} />
                Pedidos
              </button>
              <button
                onClick={() => handleSectionChange('clients')}
                className={`nav-item ${activeSection === 'clients' ? 'active' : ''}`}
              >
                <UsersIcon size={20} />
                Clientes
              </button>
            </nav>
          </div>

          <div className="dashboard-content">
            {activeSection !== 'clients' && (
              <div className="content-header">
                <div>
                  <h2 className="content-title">
                    {activeSection === 'dashboard' ? 'Panel Principal' :
                     activeSection === 'books' ? 'Gestión de Libros' :
                     activeSection === 'invoices' ? 'Gestión de Facturas' :
                     'Gestión de Pedidos'}
                  </h2>
                  <p className="content-subtitle">
                    {activeSection === 'dashboard' ? 'Resumen general y estadísticas' :
                     activeSection === 'books' ? `${filteredBooks.length} libros encontrados` :
                     activeSection === 'invoices' ? 'Gestión de facturas desde Supabase' :
                     'Gestión de pedidos desde Supabase'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
                  {activeSection !== 'dashboard' && (
                    <div className="admin-search">
                      <Search className="admin-search-icon" size={20} />
                      <input
                        type="text"
                        placeholder={
                          activeSection === 'books' ? 'Buscar por código, título, autor, editorial o ISBN...' :
                          activeSection === 'invoices' ? 'Buscar facturas...' :
                          'Buscar pedidos...'
                        }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="admin-search-input"
                    />
                  </div>
                )}

                {activeSection === 'books' && (
                  <button
                    onClick={() => {
                      setIsCreating(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="action-btn primary"
                  >
                    <Plus size={20} />
                    Nuevo Libro
                  </button>
                )}


                {activeSection === 'orders' && (
                  <button
                    onClick={() => setIsCrearPedidoOpen(true)}
                    className="action-btn primary"
                  >
                    <Plus size={20} />
                    Nuevo Pedido
                  </button>
                )}
              </div>
            </div>
            )}

            {activeSection === 'dashboard' && renderDashboard()}
            {activeSection === 'books' && renderBooks()}
            {activeSection === 'invoices' && renderInvoices()}
            {activeSection === 'orders' && renderOrders()}
            {activeSection === 'clients' && <GestionClientes />}
          </div>
        </div>

        {/* Book Form Modal */}
        {(isCreating || editingBook) && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">{isCreating ? 'Crear Nuevo Libro' : 'Editar Libro'}</h3>
                <button 
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBook(null);
                  }}
                  className="close-btn"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Código Interno <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 400 }}>(Opcional)</span></label>
                  <input
                    type="text"
                    value={isCreating ? newBook.code : editingBook?.code}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, code: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, code: e.target.value } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="Se generará automáticamente si se deja vacío"
                  />
                  <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Si no se proporciona, se generará automáticamente (ej: LIB000123)
                  </small>
                </div>

                <div className="form-group">
                  <label>Título</label>
                  <input
                    type="text"
                    value={isCreating ? newBook.title : editingBook?.title}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, title: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, title: e.target.value } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="Título del libro"
                  />
                </div>

                <div className="form-group">
                  <label>Autor</label>
                  <input
                    type="text"
                    value={isCreating ? newBook.author : editingBook?.author}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, author: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, author: e.target.value } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="Autor del libro"
                  />
                </div>

                <div className="form-group">
                  <label>Editorial</label>
                  <input
                    type="text"
                    value={isCreating ? newBook.publisher : editingBook?.publisher}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, publisher: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, publisher: e.target.value } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="Editorial del libro"
                  />
                </div>

                <div className="form-group">
                  <label>Páginas</label>
                  <input
                    type="number"
                    value={isCreating ? newBook.pages : editingBook?.pages}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, pages: Number(e.target.value) }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, pages: Number(e.target.value) } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Año de Publicación</label>
                  <input
                    type="number"
                    value={isCreating ? newBook.publicationYear : editingBook?.publicationYear}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, publicationYear: Number(e.target.value) }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, publicationYear: Number(e.target.value) } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="2024"
                  />
                </div>

                <div className="form-group">
                  <label>ISBN</label>
                  <input
                    type="text"
                    value={isCreating ? newBook.isbn : editingBook?.isbn}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, isbn: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, isbn: e.target.value } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="ISBN del libro"
                  />
                </div>

                <div className="form-group">
                  <label>Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={isCreating ? newBook.price : editingBook?.price}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, price: Number(e.target.value) }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, price: Number(e.target.value) } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    value={isCreating ? newBook.stock : editingBook?.stock}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, stock: Number(e.target.value) }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, stock: Number(e.target.value) } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={isCreating ? newBook.category : editingBook?.category}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, category: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, category: e.target.value } : null);
                      }
                    }}
                    className="form-select"
                  >
                    {categories.slice(1).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>URL de Portada</label>
                  <input
                    type="url"
                    value={isCreating ? newBook.coverImage : editingBook?.coverImage}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, coverImage: e.target.value }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, coverImage: e.target.value } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label style={{ marginBottom: '1rem', display: 'block', fontWeight: 600 }}>Opciones Especiales</label>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={isCreating ? newBook.featured : editingBook?.featured}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewBook(prev => ({ ...prev, featured: e.target.checked }));
                        } else {
                          setEditingBook(prev => prev ? { ...prev, featured: e.target.checked } : null);
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>📌 Libro Destacado</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={isCreating ? newBook.isNew : editingBook?.isNew}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewBook(prev => ({ ...prev, isNew: e.target.checked }));
                        } else {
                          setEditingBook(prev => prev ? { ...prev, isNew: e.target.checked } : null);
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>✨ Libro Nuevo</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={isCreating ? newBook.isOnSale : editingBook?.isOnSale}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewBook(prev => ({ ...prev, isOnSale: e.target.checked }));
                        } else {
                          setEditingBook(prev => prev ? { ...prev, isOnSale: e.target.checked } : null);
                        }
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>🏷️ En Oferta</span>
                  </label>
                </div>
              </div>

              {(isCreating ? newBook.isOnSale : editingBook?.isOnSale) && (
                <div className="form-group full-width">
                  <label>Precio Original (antes de la oferta)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={isCreating ? newBook.originalPrice || '' : editingBook?.originalPrice || ''}
                    onChange={(e) => {
                      if (isCreating) {
                        setNewBook(prev => ({ ...prev, originalPrice: Number(e.target.value) }));
                      } else {
                        setEditingBook(prev => prev ? { ...prev, originalPrice: Number(e.target.value) } : null);
                      }
                    }}
                    className="form-input"
                    placeholder="0.00"
                    style={{ maxWidth: '250px' }}
                  />
                  <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    El precio actual se mostrará como rebajado. Ej: Si precio actual es $15 y original $25, se mostrará con 40% de descuento
                  </small>
                </div>
              )}

              <div className="form-group full-width">
                <label>Descripción</label>
                <textarea
                  value={isCreating ? newBook.description : editingBook?.description}
                  onChange={(e) => {
                    if (isCreating) {
                      setNewBook(prev => ({ ...prev, description: e.target.value }));
                    } else {
                      setEditingBook(prev => prev ? { ...prev, description: e.target.value } : null);
                    }
                  }}
                  className="form-textarea"
                  placeholder="Descripción del libro..."
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button 
                  onClick={isCreating ? handleCreateBook : handleSaveEdit}
                  className="save-btn"
                >
                  <Save size={16} />
                  {isCreating ? 'Crear Libro' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSubmit={handleCreateInvoice}
          loading={loading}
        />

        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedInvoice(null);
          }}
          onDownloadPDF={handleDownloadPDF}
        />

        <GenerarFacturaModal
          isOpen={isGenerarFacturaModalOpen}
          onClose={() => setIsGenerarFacturaModalOpen(false)}
          onSuccess={() => {
            setRefreshFacturas(prev => prev + 1);
            setIsGenerarFacturaModalOpen(false);
          }}
        />

        <PedidoDetalle
          pedido={selectedPedido}
          isOpen={isPedidoDetalleOpen}
          onClose={() => {
            setIsPedidoDetalleOpen(false);
            setSelectedPedido(null);
          }}
          onRefresh={() => {
            setRefreshPedidos(prev => prev + 1);
            setIsPedidoDetalleOpen(false);
            setSelectedPedido(null);
          }}
        />

        <CrearPedido
          isOpen={isCrearPedidoOpen}
          onClose={() => setIsCrearPedidoOpen(false)}
          onSuccess={() => {
            setRefreshPedidos(prev => prev + 1);
            setIsCrearPedidoOpen(false);
          }}
        />
      </div>
    </div>
  );
}