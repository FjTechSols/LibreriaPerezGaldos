import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Book, 
  Users as UsersIcon, 
  FileText, 
  LogOut, 
  Plus, 
  CreditCard as Edit, 
  Trash2, 
  Search, 
  Menu, 
  X, 
  ShoppingBag, 
  DollarSign, 
  Barcode, 
  Sparkles,
  ArrowLeft, 
  Moon, 
  Sun, 
  Image as ImageIcon, 
  Home, 
  Save 
} from 'lucide-react';

import type { Book as BookType, Invoice, InvoiceFormData, Factura, Pedido, Ubicacion } from '../types';

import { categories } from '../data/categories';
import { obtenerLibros, obtenerEstadisticasLibros, obtenerTotalUnidadesStock, buscarLibroPorISBN, incrementarStockLibro, crearLibro, actualizarLibro, eliminarLibro } from '../services/libroService';
import { useAuth } from '../context/AuthContext';
import { useInvoice } from '../context/InvoiceContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';


import InvoiceTable from '../components/InvoiceTable';
import InvoiceModal from '../components/InvoiceModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

import GenerarFacturaModal from '../components/GenerarFacturaDesdeped';
import PedidosList from '../components/PedidosList';
import PedidoDetalle from '../components/PedidoDetalle';
import CrearPedido from '../components/CrearPedido';
import { GestionClientes } from '../components/GestionClientes';
import { GestionISBN } from '../components/GestionISBN';
import { TitleFixer } from '../components/TitleFixer';
import { CoverSearchTool } from '../components/CoverSearchTool';
import { Pagination } from '../components/Pagination';
import { obtenerUbicacionesActivas } from '../services/ubicacionService';
import { buscarLibroPorISBNMultiple } from '../services/isbnService';
import '../styles/pages/AdminDashboard.css';

type AdminSection = 'dashboard' | 'books' | 'invoices' | 'orders' | 'clients' | 'isbn' | 'titles' | 'covers';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { invoices, loading, createInvoice, updateInvoiceStatus } = useInvoice();
  const { theme, actualTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { formatPrice, settings } = useSettings();
  
  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark');
  };
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [books, setBooks] = useState<BookType[]>([]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [booksInStock, setBooksInStock] = useState(0);
  const [totalStockUnits, setTotalStockUnits] = useState(0);
  const [booksOutOfStock, setBooksOutOfStock] = useState(0);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);

  const [searchingISBN, setSearchingISBN] = useState(false);
  const [isbnSearchQuery, setIsbnSearchQuery] = useState('');
  const [savingBook, setSavingBook] = useState(false);
  const [deletingBook, setDeletingBook] = useState(false);
  const [bookContents, setBookContents] = useState<string[]>([]);
  const [showContentInput, setShowContentInput] = useState(false);

  useEffect(() => {
    if (settings?.system?.itemsPerPageAdmin) {
      setItemsPerPage(settings.system.itemsPerPageAdmin);
    }
  }, [settings]);

  // Cargar ubicaciones al inicio
  useEffect(() => {
    const cargarUbicaciones = async () => {
      const data = await obtenerUbicacionesActivas();
      setUbicaciones(data);
    };
    cargarUbicaciones();
  }, []);

  // Cargar estadísticas al inicio
  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const stats = await obtenerEstadisticasLibros();
        setTotalBooks(stats.total);
        setBooksInStock(stats.enStock);
        setBooksOutOfStock(stats.sinStock);
        
        // Obtener total de unidades físicas
        const units = await obtenerTotalUnidadesStock();
        setTotalStockUnits(units);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    cargarEstadisticas();
  }, []);

  // Estado de filtros
  const [filters, setFilters] = useState({
    search: '',
    category: 'Todos',
    minPrice: '',
    maxPrice: '',
    stockStatus: 'all', // all, inStock, outOfStock
    featured: false,
    isNew: false,
    isOnSale: false,
    coverStatus: 'all', // all, with_cover, without_cover
    // Advanced
    location: '',
    minPages: '',
    maxPages: '',
    startYear: '',
    endYear: '',
    isbn: '',
    publisher: '' // We'll keep this state even if service doesn't fully use it yet, for future proofing or if we add simple ilike
  });

  const [advancedMode, setAdvancedMode] = useState(false);

  const [loadingBooks, setLoadingBooks] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(filters.search);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  // Realtime Updates Trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to Realtime changes for Books
  useEffect(() => {
    const channel = supabase
      .channel('books-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'libros'
        },
        (payload) => {
          // console.log('Change received!', payload);
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Subscribe to Realtime changes for Pedidos
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos'
        },
        () => {
           setRefreshPedidos(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cargar libros con filtros unificados
  useEffect(() => {
    const cargarLibros = async () => {
      setLoadingBooks(true);
      try {
        const queryFilters = {
          search: searchQuery, // Use debounced value
          category: filters.category !== 'Todos' ? filters.category : undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          availability: filters.stockStatus !== 'all' ? filters.stockStatus as any : undefined,
          featured: filters.featured,
          isNew: filters.isNew,
          isOnSale: filters.isOnSale,
          coverStatus: filters.coverStatus as any,
          // Advanced
          location: filters.location || undefined,
          minPages: filters.minPages ? Number(filters.minPages) : undefined,
          maxPages: filters.maxPages ? Number(filters.maxPages) : undefined,
          startYear: filters.startYear ? Number(filters.startYear) : undefined,
          endYear: filters.endYear ? Number(filters.endYear) : undefined,
          isbn: filters.isbn || undefined,
          publisher: filters.publisher || undefined
        };

        const { data, count } = await obtenerLibros(currentPage, itemsPerPage, queryFilters);
        setBooks(data);
        setFilteredCount(count); 
        
      } catch (error) {
        console.error('Error loading books:', error);
      } finally {
        setLoadingBooks(false);
      }
    };
    cargarLibros();
  }, [currentPage, itemsPerPage, searchQuery, filters.category, filters.minPrice, filters.maxPrice, filters.stockStatus, filters.featured, filters.isNew, filters.isOnSale, filters.coverStatus, filters.location, filters.minPages, filters.maxPages, filters.startYear, filters.endYear, filters.isbn, filters.publisher, refreshTrigger]);

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
    ubicacion: '',
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

  const handleCreateBook = async () => {
    if (!newBook.title || !newBook.author || !newBook.isbn || !newBook.price) {
      alert('Por favor completa todos los campos requeridos: Título, Autor, ISBN y Precio');
      return;
    }

    try {
      const cleanISBN = newBook.isbn.replace(/[-\s]/g, '');

      const libroExistente = await buscarLibroPorISBN(cleanISBN);

      if (libroExistente) {
        const libroActualizado = await incrementarStockLibro(libroExistente.id, 1);

        if (libroActualizado) {
          alert(`El libro "${libroExistente.titulo}" ya existe en el catálogo. Se ha incrementado el stock en 1 unidad.\n\nStock actual: ${libroActualizado.stock}`);

          const stats = await obtenerEstadisticasLibros();
          setTotalBooks(stats.total);
          setBooksInStock(stats.enStock);
          setBooksOutOfStock(stats.sinStock);

          const { data } = await obtenerLibros(currentPage, itemsPerPage);
          setBooks(data);

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
            ubicacion: '',
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
          setIsCreating(false);
          setIsbnSearchQuery('');
          setIsbnSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          alert('Error al incrementar el stock del libro');
        }
      } else {
        const nuevoLibro = await crearLibro({
          titulo: newBook.title,
          autor: newBook.author,
          isbn: cleanISBN,
          stock: 1,
          ubicacion: newBook.ubicacion || 'almacen',
          descripcion: newBook.description || undefined,
          imagen_url: newBook.coverImage || undefined,
          paginas: newBook.pages || undefined,
          anio: newBook.publicationYear || undefined,
          activo: true,
          destacado: newBook.featured,
          novedad: newBook.isNew,
          oferta: newBook.isOnSale,
          precio_original: newBook.originalPrice
        }, bookContents);

        if (nuevoLibro) {
          alert(`Libro "${newBook.title}" creado exitosamente con stock inicial de 1 unidad`);

          const stats = await obtenerEstadisticasLibros();
          setTotalBooks(stats.total);
          setBooksInStock(stats.enStock);
          setBooksOutOfStock(stats.sinStock);

          const { data } = await obtenerLibros(currentPage, itemsPerPage);
          setBooks(data);

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
            ubicacion: '',
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
          setIsCreating(false);
          setIsbnSearchQuery('');
          setIsbnSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          alert('Error al crear el libro');
        }
      }
    } catch (error) {
      console.error('Error al crear/actualizar libro:', error);
      alert('Ocurrió un error al procesar la operación');
    }
  };

  const handleEditBook = (book: BookType) => {
    setEditingBook({ ...book });
    setBookContents(book.contents || []);
    setShowContentInput(!!book.contents && book.contents.length > 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;

    setSavingBook(true);
    try {
      console.log('=== GUARDANDO EDICIÓN ===');
      console.log('Libro a editar:', editingBook);

      const libroActualizado = await actualizarLibro(parseInt(editingBook.id), {
        titulo: editingBook.title,
        autor: editingBook.author,
        isbn: editingBook.isbn || undefined,
        precio: editingBook.price,
        stock: editingBook.stock,
        descripcion: editingBook.description || undefined,
        imagen_url: editingBook.coverImage || undefined,
        paginas: editingBook.pages || undefined,
        anio: editingBook.publicationYear || undefined,
        ubicacion: editingBook.ubicacion || undefined,
        destacado: editingBook.featured,
        novedad: editingBook.isNew,
        oferta: editingBook.isOnSale,
        precio_original: editingBook.originalPrice
      }, bookContents);

      console.log('Libro actualizado recibido:', libroActualizado);

      if (!libroActualizado) {
        throw new Error('No se recibió el libro actualizado del servidor');
      }

      setBooks(prev => {
        const nuevosLibros = prev.map(book =>
          book.id === editingBook.id ? libroActualizado : book
        );
        console.log('Nuevos libros en estado:', nuevosLibros);
        return nuevosLibros;
      });

      setEditingBook(null);
      alert('✓ Libro actualizado correctamente');

      // Recargar estadísticas
      const stats = await obtenerEstadisticasLibros();
      setTotalBooks(stats.total);
      setBooksInStock(stats.enStock);
      setBooksOutOfStock(stats.sinStock);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error al guardar libro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`✗ Error al actualizar el libro:\n${errorMessage}\n\nVerifica los datos e intenta nuevamente.`);
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este libro?')) {
      return;
    }

    setDeletingBook(true);
    try {
      const eliminado = await eliminarLibro(parseInt(bookId));

      if (eliminado) {
        setBooks(prev => prev.filter(book => book.id !== bookId));
        alert('Libro eliminado correctamente');

        // Actualizar estadísticas
        const stats = await obtenerEstadisticasLibros();
        setTotalBooks(stats.total);
        setBooksInStock(stats.enStock);
        setBooksOutOfStock(stats.sinStock);
      } else {
        alert('Error al eliminar el libro');
      }
    } catch (error) {
      console.error('Error al eliminar libro:', error);
      alert('Error al eliminar el libro');
    } finally {
      setDeletingBook(false);
    }
  };

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleISBNSearch = async () => {
    // Determine the ISBN to search: creates uses newBook.isbn, edits use isbnSearchQuery or editingBook.isbn
    const query = isCreating ? (newBook.isbn || '') : isbnSearchQuery;
    
    if (!query || query.trim().length < 10) {
      alert('Por favor ingresa un ISBN válido (mínimo 10 caracteres)');
      return;
    }

    setSearchingISBN(true);

    try {
      const bookData = await buscarLibroPorISBNMultiple(query);

      if (bookData) {
        setNewBook(prev => ({
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
          category: bookData.categories[0] || categories[1],
          description: bookData.description,
          coverImage: bookData.imageUrl,
          rating: 0,
          reviews: [],
          featured: false,
          isNew: false,
          isOnSale: false
        }));

        // Handle "Obra Completa" volumes if enabled
        if (showContentInput) {
             // If the user already flagged it as Obra Completa, we can try to guess volumes or just prep the UI
             // For now, we'll just ensure the state is clear or maybe add a default volume if we detected something
             // But simpler is just to let the user add them. 
             // Ideally we could parse `bookData.title` for "Volumen 1", "Tomo 2" etc, but that's complex.
             // The user requirement says "debe agregar los volumenes directamente"
             // This effectively means "Show the UI" (which is done by showContentInput)
             // We can also auto-add one empty volume if the list is empty to prompt action
             if (bookContents.length === 0) {
                 setBookContents(['']); 
             }
        } else {
            // Check again for "Obra Completa" keywords in the FETCHED title
             if (bookData.title && /obra\s*completa|colecci[oó]n|estuche|pack|set/i.test(bookData.title)) {
                 setShowContentInput(true);
                 if (bookContents.length === 0) {
                     setBookContents(['']);
                 }
             }
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

  // Pagination basada en el total filtrado
  const totalPages = Math.ceil((filters.search || filters.category !== 'Todos' || filters.stockStatus !== 'all' ? filteredCount : totalBooks) / itemsPerPage);

  // Ya no necesitamos filtrar localmente, la búsqueda se hace en el servidor
  const currentBooks = books;

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
    totalBooks: totalBooks,
    totalInvoices: invoices.length,
    totalOrders: 0,
    totalRevenue: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    inStock: booksInStock,
    outOfStock: booksOutOfStock,
    pendingInvoices: invoices.filter(invoice => invoice.status === 'Pendiente').length,
    processingOrders: 0
  };

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
            <div className="info-value-group">
              <span className="info-value">{stats.inStock} títulos</span>
              <span className="info-subvalue">({totalStockUnits} unidades totales)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBooks = () => (
    <div>
      <div className="filters-container" style={{ 
        padding: '1rem', 
        background: actualTheme === 'dark' ? '#1f2937' : 'white',
        borderRadius: '8px',
        marginBottom: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        border: actualTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb'
      }}>
        <div style={{ flex: '1 1 200px' }}>
             <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Categoría</label>
             <select 
               value={filters.category}
               onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
               style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
             >
               <option value="Todos">Todas las categorías</option>
               {categories.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
        </div>

        <div style={{ flex: '0 1 150px' }}>
           <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Stock</label>
           <select 
             value={filters.stockStatus}
             onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
             style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
           >
             <option value="all">Todos</option>
             <option value="inStock">En Stock</option>
             <option value="outOfStock">Agotados</option>
           </select>
        </div>

        <div style={{ flex: '0 1 150px' }}>
           <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Portada</label>
           <select 
             value={filters.coverStatus}
             onChange={(e) => setFilters(prev => ({ ...prev, coverStatus: e.target.value }))}
             style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
           >
             <option value="all">Todas</option>
             <option value="with_cover">Con Portada</option>
             <option value="without_cover">Sin Portada</option>
           </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flex: '1 1 200px' }}>
           <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Precio Mín</label>
              <input 
                type="number" 
                placeholder="0" 
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
              />
           </div>
           <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Precio Máx</label>
              <input 
                type="number" 
                placeholder="Top" 
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
              />
           </div>
        </div>

        {advancedMode && (
          <div style={{ flex: '1 1 100%', display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem', borderTop: '1px dashed ' + (actualTheme === 'dark' ? '#374151' : '#e5e7eb'), marginBottom: '0.5rem' }}>
              <div style={{ flex: '0 1 150px' }}>
                 <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Ubicación</label>
                 <select 
                   value={filters.location}
                   onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                   style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
                 >
                   <option value="">Todas</option>
                   {ubicaciones.map(ub => (
                     <option key={ub.id} value={ub.nombre}>{ub.nombre}</option>
                   ))}
                 </select>
              </div>

              <div style={{ flex: '0 1 200px' }}>
                 <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>ISBN</label>
                 <input 
                    type="text" 
                    placeholder="Filtrar por ISBN..." 
                    value={filters.isbn}
                    onChange={(e) => setFilters(prev => ({ ...prev, isbn: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
                 />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flex: '0 1 200px' }}>
                 <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Páginas Mín</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={filters.minPages}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPages: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
                    />
                 </div>
                 <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Máx</label>
                    <input 
                      type="number" 
                      placeholder="Top" 
                      value={filters.maxPages}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPages: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
                    />
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flex: '0 1 200px' }}>
                 <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Año Desde</label>
                    <input 
                      type="number" 
                      placeholder="1900" 
                      value={filters.startYear}
                      onChange={(e) => setFilters(prev => ({ ...prev, startYear: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
                    />
                 </div>
                 <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Hasta</label>
                    <input 
                      type="number" 
                      placeholder="Hoy" 
                      value={filters.endYear}
                      onChange={(e) => setFilters(prev => ({ ...prev, endYear: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', background: actualTheme === 'dark' ? '#374151' : 'white', color: actualTheme === 'dark' ? 'white' : 'inherit' }}
                    />
                 </div>
              </div>
          </div>
        )}

        <div style={{ flex: '1 1 100%', display: 'flex', gap: '1.5rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid ' + (actualTheme === 'dark' ? '#374151' : '#e5e7eb'), marginTop: '0.5rem' }}>
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
             <input 
               type="checkbox" 
               checked={advancedMode} 
               onChange={(e) => setAdvancedMode(e.target.checked)}
             />
             Búsqueda Avanzada
           </label>

           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
             <input 
               type="checkbox" 
               checked={filters.featured} 
               onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.checked }))}
             />
             Destacados
           </label>
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
             <input 
               type="checkbox" 
               checked={filters.isNew} 
               onChange={(e) => setFilters(prev => ({ ...prev, isNew: e.target.checked }))}
             />
             Novedades
           </label>
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
             <input 
               type="checkbox" 
               checked={filters.isOnSale} 
               onChange={(e) => setFilters(prev => ({ ...prev, isOnSale: e.target.checked }))}
             />
             Ofertas
           </label>
           
           <button 
             onClick={() => setFilters({
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
               publisher: ''
             })}
             style={{ 
               marginLeft: 'auto', 
               padding: '0.5rem 1rem', 
               background: 'transparent', 
               border: '1px solid #ef4444', 
               color: '#ef4444', 
               borderRadius: '4px',
               cursor: 'pointer' 
             }}
           >
             Limpiar Filtros
           </button>
        </div>


      </div>

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
        totalItems={searchQuery ? currentBooks.length : totalBooks}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        showItemsPerPageSelector={true}
        itemsPerPageOptions={[10, 20, 50, 100]}
      />
    </div>
  );

  const renderInvoices = () => {
    // Calcular estadísticas
    const stats = {
      total: invoices.length,
      pendientes: invoices.filter(i => i.status === 'Pendiente').length,
      pagadas: invoices.filter(i => i.status === 'Pagada').length,
      anuladas: invoices.filter(i => i.status === 'Anulada').length,
      totalFacturado: invoices
        .filter(i => i.status !== 'Anulada')
        .reduce((sum, invoice) => sum + (invoice.total || 0), 0)
    };

    return (
      <div className="invoices-section">
        <div className="invoice-stats">
          <div className="stat-card total">
            <span className="stat-label">Total Facturas</span>
            <span className="stat-value">{stats.total}</span>
          </div>

          <div className="stat-card pendiente">
            <span className="stat-label">Pendientes</span>
            <span className="stat-value">{stats.pendientes}</span>
          </div>

          <div className="stat-card pagada">
            <span className="stat-label">Pagadas</span>
            <span className="stat-value">{stats.pagadas}</span>
          </div>

          <div className="stat-card anulada">
            <span className="stat-label">Anuladas</span>
            <span className="stat-value">{stats.anuladas}</span>
          </div>

          <div className="stat-card total-amount">
            <span className="stat-label">Total Facturado</span>
            <span className="stat-value">{formatPrice(stats.totalFacturado)}</span>
          </div>
        </div>

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
  };

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
    <div className="admin-dashboard flex h-screen overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 lg:static dashboard-sidebar w-64 flex flex-col shadow-lg z-30 transition-transform duration-300 lg:translate-x-0 bg-white dark:bg-gray-800 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <img 
              src="/Logo Exlibris Perez Galdos.png" 
              alt="Logo Librería Pérez Galdós" 
              className="h-10 w-auto"
            />
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">Admin Panel</span>
          </div>
          {/* Close Menu Button (Mobile) */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button
            onClick={() => handleSectionChange('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'dashboard' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Home size={18} />
            Inicio
          </button>
          <button
            onClick={() => handleSectionChange('books')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'books' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Book size={18} />
            Catálogo
          </button>
          <button
            onClick={() => handleSectionChange('invoices')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'invoices' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <FileText size={18} />
            Facturas
          </button>
          <button
            onClick={() => handleSectionChange('orders')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'orders' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ShoppingBag size={18} />
            Pedidos
          </button>
          <button
            onClick={() => handleSectionChange('clients')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'clients' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <UsersIcon size={18} />
            Clientes
          </button>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Herramientas</p>
          </div>
          
          
          <button
            onClick={() => handleSectionChange('covers')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'covers' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ImageIcon size={18} />
            Buscar Portadas
          </button>
          <button
            onClick={() => handleSectionChange('isbn')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'isbn' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Barcode size={18} />
            Completar ISBNs
          </button>
          <button
            onClick={() => handleSectionChange('titles')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'titles' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles size={18} />
            Corregir Títulos
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2" style={{ borderColor: 'var(--border-color)' }}>
          <button 
             onClick={() => navigate('/')}
             className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
            Volver a la Web
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 shadow-sm z-10" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
             <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
             >
               <Menu size={24} />
             </button>
             <h1 className="text-xl font-bold text-gray-800 dark:text-white capitalize truncate">
              {activeSection === 'dashboard' ? 'Panel Principal' :  
              activeSection === 'isbn' ? 'Gestión de ISBN' :
              activeSection === 'titles' ? 'Corrector de Títulos' :
              activeSection}
          </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
             </div>
             <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
             <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-6" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="max-w-7xl mx-auto">
             {/* Dynamic Content */}
             {activeSection !== 'clients' && activeSection !== 'isbn' && activeSection !== 'titles' && (
              <div className="content-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ marginRight: 'auto' }}>
                  <h2 className="content-title">
                    {activeSection === 'dashboard' ? 'Panel Principal' :
                     activeSection === 'books' ? 'Gestión de Libros' :
                     activeSection === 'invoices' ? 'Gestión de Facturas' :
                     'Gestión de Pedidos'}
                  </h2>
                  <p className="content-subtitle">
                    {activeSection === 'dashboard' ? 'Resumen general y estadísticas' :
                     activeSection === 'books' ? `${searchQuery ? currentBooks.length : totalBooks} libros ${searchQuery ? 'encontrados' : 'en total'}` :
                     activeSection === 'invoices' ? 'Gestión de facturas desde Supabase' :
                     'Gestión de pedidos desde Supabase'}
                  </p>
                </div>

                {/* Search Bar - Flexible in the middle */}
                {activeSection !== 'dashboard' && (
                    <div className="admin-search" style={{ flex: '1 1 300px', margin: '0 1rem' }}>
                      <Search className="admin-search-icon" size={20} />
                      <input
                        type="text"
                        placeholder={
                          activeSection === 'books' ? 'Buscar por ISBN, título, autor, editorial o código...' :
                          activeSection === 'invoices' ? 'Buscar facturas...' :
                          'Buscar pedidos...'
                        }
                      value={filters.search}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, search: e.target.value }));
                        // Note: Pagination reset happens in the useEffect when searchQuery changes
                      }}
                      className="admin-search-input"
                    />
                  </div>
                )}

                <div style={{ flexShrink: 0 }}>
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
             {activeSection === 'isbn' && <GestionISBN />}
             {activeSection === 'titles' && <TitleFixer />}
             {activeSection === 'covers' && <CoverSearchTool />}
           </div>
        </main>
      </div>

      {/* Modals */}

  {(isCreating || editingBook) && (
          <div className="modal-overlay">
            <div className="modal create-book-modal">
              <div className="modal-header">
                <h3 className="modal-title">{isCreating ? 'Crear Nuevo Libro' : 'Editar Libro'}</h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBook(null);
                    setIsbnSearchQuery('');
                    setBookContents([]);
                    setShowContentInput(false);
                  }}
                  className="close-btn"
                >
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
                  <p>
                    Ingresa el ISBN para buscar datos automáticos. También puedes escribirlo manualmente.
                  </p>
                  <div className="search-actions">
                    <input
                      type="text"
                      className="search-input"
                      value={newBook.isbn || ''}
                      onChange={(e) => {
                          const val = e.target.value;
                          setNewBook({ ...newBook, isbn: val });
                          setIsbnSearchQuery(val); // Keep looking at this for compatibility if handleISBNSearch uses it, or update handleISBNSearch
                          
                          // Auto-detect Obra Completa
                          if (/obra\s*completa|colecci[oó]n|estuche|pack|set|tomo|volumen/i.test(val)) {
                              if (!showContentInput) setShowContentInput(true);
                          }
                      }}
                      onBlur={(e) => {
                          // Auto-detect on blur too
                          if (/obra\s*completa|colecci[oó]n|estuche|pack|set|tomo|volumen/i.test(e.target.value)) {
                              if (!showContentInput) setShowContentInput(true);
                          }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !searchingISBN) {
                          handleISBNSearch();
                        }
                      }}
                      placeholder="Ingresa ISBN (ej: 9788420412146)"
                      disabled={searchingISBN}
                    />
                    <button
                      onClick={handleISBNSearch}
                      disabled={searchingISBN || !newBook.isbn}
                      className="search-btn"
                    >
                      <Search size={18} />
                      {searchingISBN ? 'Buscando...' : 'Buscar Datos'}
                    </button>
                  </div>
                  <small style={{
                    display: 'block',
                    marginTop: '0.5rem',
                    color: '#64748b',
                    fontSize: '0.75rem'
                  }}>
                    Si se encuentra el libro, los campos del formulario se llenarán automáticamente.
                    {showContentInput && <span style={{ color: 'var(--primary-color)', marginLeft: '0.5rem', fontWeight: 500 }}>Modo Obra Completa Activo: Se habilitarán campos de volúmenes.</span>}
                  </small>
                </div>
              )}



            <div className="book-form-container" style={{ padding: '0 1rem' }}>
              {/* 1. Código (Legacy ID) */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Código Interno <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>(Opcional)</span></label>
                <input
                  type="text"
                  placeholder="Se generará automáticamente si se deja vacío"
                  value={isCreating ? (newBook.code || '') : (editingBook?.code || '')}
                  onChange={(e) => {
                     if (isCreating) setNewBook({ ...newBook, code: e.target.value });
                     else setEditingBook(prev => prev ? { ...prev, code: e.target.value } : null);
                  }}
                  className="form-input"
                  style={{ width: '100%' }}
                />
                 <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    Si no se proporciona, se generará automáticamente (ej: LIB000123)
                 </small>
              </div>

              {/* 2. ISBN - Con detección automática */}


              {/* 3. Título */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Título *</label>
                <input
                  type="text"
                  value={isCreating ? (newBook.title || '') : (editingBook?.title || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isCreating) {
                        setNewBook({ ...newBook, title: val });
                         if (/obra\s*completa|colecci[oó]n|estuche|pack|set/i.test(val)) {
                           if (!showContentInput) setShowContentInput(true);
                        }
                    } else {
                        setEditingBook(prev => prev ? { ...prev, title: val } : null);
                    }
                  }}
                  placeholder="Título del libro"
                  className="form-input"
                  style={{ width: '100%', borderColor: (isCreating && !newBook.title) ? '#ef4444' : undefined }}
                />
              </div>

               {/* SECCIÓN OBRAS COMPLETAS (Dinámica - Solo creation) */}
               {isCreating && showContentInput && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <label style={{ color: '#2563eb', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Contenido / Volúmenes de la Obra</label>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Añade los títulos de cada volumen incluido en este ISBN.</p>
                  
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
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '0 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Eliminar volumen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={() => setBookContents([...bookContents, ''])}
                    style={{ 
                      marginTop: '0.5rem', 
                      background: 'none', 
                      border: '1px dashed #cbd5e1', 
                      color: '#2563eb', 
                      padding: '0.5rem', 
                      width: '100%', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Plus size={16} /> Añadir otro volumen
                  </button>
                </div>
              )}
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* 4. Autor */}
                  <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Autor</label>
                      <input
                        type="text"
                        value={isCreating ? (newBook.author || '') : (editingBook?.author || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, author: e.target.value}) : setEditingBook(prev => prev ? {...prev, author: e.target.value} : null)}
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="Autor"
                      />
                  </div>

                  {/* 5. Editorial */}
                   <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Editorial</label>
                      <input
                        type="text"
                        value={isCreating ? (newBook.publisher || '') : (editingBook?.publisher || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, publisher: e.target.value}) : setEditingBook(prev => prev ? {...prev, publisher: e.target.value} : null)}
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="Editorial"
                      />
                  </div>
              </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                   {/* 6. Año */}
                  <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Año</label>
                      <input
                        type="number"
                        value={isCreating ? (newBook.publicationYear || '') : (editingBook?.publicationYear || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, publicationYear: parseInt(e.target.value)}) : setEditingBook(prev => prev ? {...prev, publicationYear: parseInt(e.target.value)} : null)}
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="Año"
                      />
                  </div>

                  {/* 7. Páginas */}
                   <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Páginas</label>
                      <input
                        type="number"
                        value={isCreating ? (newBook.pages || '') : (editingBook?.pages || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, pages: parseInt(e.target.value)}) : setEditingBook(prev => prev ? {...prev, pages: parseInt(e.target.value)} : null)}
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="Páginas"
                      />
                  </div>

                   {/* 8. Precio */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                        {(isCreating ? newBook.isOnSale : editingBook?.isOnSale) ? 'Precio Original ($) *' : 'Precio ($) *'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={isCreating 
                          ? ((newBook.isOnSale ? newBook.originalPrice : newBook.price) || '') 
                          : ((editingBook?.isOnSale ? editingBook?.originalPrice : editingBook?.price) || '')}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (isCreating) {
                            if (newBook.isOnSale) setNewBook({...newBook, originalPrice: val});
                            else setNewBook({...newBook, price: val});
                          } else {
                             setEditingBook(prev => {
                                if (!prev) return null;
                                if (prev.isOnSale) return {...prev, originalPrice: val};
                                return {...prev, price: val};
                             });
                          }
                        }}
                        className="form-input no-spinner"
                        style={{ width: '100%' }}
                        placeholder="15.00 €"
                      />
                  </div>
              </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                   {/* 9. Ubicación */}
                  <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Ubicación</label>
                      <select
                        value={isCreating ? (newBook.ubicacion || '') : (editingBook?.ubicacion || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, ubicacion: e.target.value}) : setEditingBook(prev => prev ? {...prev, ubicacion: e.target.value} : null)}
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

                   {/* 10. Categoría */}
                   <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Categoría</label>
                      <select
                        value={isCreating ? (newBook.category || '') : (editingBook?.category || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, category: e.target.value}) : setEditingBook(prev => prev ? {...prev, category: e.target.value} : null)}
                        className="form-select"
                        style={{ width: '100%' }}
                      >
                        {categories.slice(1).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                  </div>

                   {/* 11. Stock */}
                   <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Stock</label>
                      <input
                        type="number"
                        value={isCreating ? (newBook.stock || 0) : (editingBook?.stock || 0)}
                        onChange={(e) => isCreating ? setNewBook({...newBook, stock: parseInt(e.target.value)}) : setEditingBook(prev => prev ? {...prev, stock: parseInt(e.target.value)} : null)}
                        className="form-input"
                        style={{ width: '100%' }}
                      />
                  </div>
              </div>

               {/* 12. URL Portada */}
               <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>URL Portada</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="url"
                        value={isCreating ? (newBook.coverImage || '') : (editingBook?.coverImage || '')}
                        onChange={(e) => isCreating ? setNewBook({...newBook, coverImage: e.target.value}) : setEditingBook(prev => prev ? {...prev, coverImage: e.target.value} : null)}
                        placeholder="https://..."
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      {(isCreating ? newBook.coverImage : editingBook?.coverImage) && (
                          <div style={{ width: '40px', height: '40px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                              <img src={isCreating ? newBook.coverImage : editingBook?.coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                      )}
                  </div>
              </div>

                {/* 13. Opciones Especiales */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 600 }}>Opciones Especiales</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isCreating ? newBook.featured : editingBook?.featured}
                      onChange={(e) => isCreating ? setNewBook({...newBook, featured: e.target.checked}) : setEditingBook(prev => prev ? {...prev, featured: e.target.checked} : null)}
                    />
                    Destacado
                  </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isCreating ? newBook.isNew : editingBook?.isNew}
                      onChange={(e) => isCreating ? setNewBook({...newBook, isNew: e.target.checked}) : setEditingBook(prev => prev ? {...prev, isNew: e.target.checked} : null)}
                    />
                    Novedad
                  </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isCreating ? newBook.isOnSale : editingBook?.isOnSale}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isCreating) {
                          setNewBook(prev => ({
                            ...prev,
                            isOnSale: isChecked,
                            originalPrice: isChecked ? (prev.price) : prev.originalPrice,
                            price: (!isChecked && prev.originalPrice) ? prev.originalPrice : prev.price
                          }));
                        } else {
                          setEditingBook(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              isOnSale: isChecked,
                              originalPrice: isChecked ? (prev.price) : prev.originalPrice,
                              price: (!isChecked && prev.originalPrice) ? prev.originalPrice : prev.price
                            };
                          });
                        }
                      }}
                    />
                    Oferta
                  </label>
                </div>
              </div>

              {(isCreating ? newBook.isOnSale : editingBook?.isOnSale) && (
                <div style={{ 
                  marginBottom: '1rem',
                  padding: '1rem', 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)' 
                }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#ef4444' }}>
                    Configuración de Oferta
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem', alignItems: 'end' }}>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Precio Oferta ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input no-spinner"
                        style={{ width: '100%', borderColor: '#ef4444' }}
                        value={isCreating ? (newBook.price || '') : (editingBook?.price || '')}
                        onChange={(e) => {
                           const val = parseFloat(e.target.value);
                           if (isCreating) setNewBook({...newBook, price: val});
                           else setEditingBook(prev => prev ? {...prev, price: val} : null);
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div style={{ paddingBottom: '0.6rem', textAlign: 'center' }}>
                       {(() => {
                          const original = isCreating ? (newBook.originalPrice || 0) : (editingBook?.originalPrice || 0);
                          const current = isCreating ? (newBook.price || 0) : (editingBook?.price || 0);
                          if (original > 0 && current > 0 && original > current) {
                             const discount = Math.round(((original - current) / original) * 100);
                             return <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>-{discount}%</span>;
                          }
                          return <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>--%</span>;
                       })()}
                    </div>
                  </div>
                  <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                    El precio en "Detalles del Libro" (form superior) es ahora el Precio Original. Aquí defines el Precio de Oferta.
                  </small>
                </div>
              )}

               {/* 14. Description */}
               <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Descripción</label>
                  <textarea
                    value={isCreating ? (newBook.description || '') : (editingBook?.description || '')}
                    onChange={(e) => isCreating ? setNewBook({...newBook, description: e.target.value}) : setEditingBook(prev => prev ? {...prev, description: e.target.value} : null)}
                    className="form-textarea"
                    style={{ width: '100%', minHeight: '100px', fontFamily: 'inherit' }}
                    rows={4}
                  />
               </div>

            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
               <button onClick={() => {
                   setIsCreating(false);
                   setEditingBook(null);
                   // Reset local states
                   setBookContents([]);
                   setShowContentInput(false);
               }} className="cancel-btn">
                   Cancelar
               </button>
               <button 
                  onClick={isCreating ? handleCreateBook : handleSaveEdit} 
                  className="save-btn"
                  disabled={savingBook}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
               >
                   <Save size={16} />
                   {isCreating ? 'Crear Libro' : (savingBook ? 'Guardando...' : 'Guardar Cambios')}
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
          onOpenManualInvoice={() => {
            setIsGenerarFacturaModalOpen(false);
            setIsInvoiceModalOpen(true);
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
  );
}