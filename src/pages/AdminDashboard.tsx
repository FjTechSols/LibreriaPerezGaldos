import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users as UsersIcon, 
  FileText, 
  LogOut, 
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
  Book as BookIcon,
  Tags
} from 'lucide-react';

import { obtenerEstadisticasLibros, obtenerTotalUnidadesStock } from '../services/libroService';
import { obtenerEstadisticasPedidos } from '../services/pedidoService';
import { useAuth } from '../context/AuthContext';
import { useInvoice } from '../context/InvoiceContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

// Manager Components
import { BooksManager } from '../components/admin/books/BooksManager';
import { InvoicesManager } from '../components/admin/invoices/InvoicesManager';
import { OrdersManager } from '../components/admin/orders/OrdersManager';
import { GestionClientes } from '../components/admin/clients/GestionClientes';
import { MetadataManager } from '../components/admin/metadata/MetadataManager';

// Legacy / Specific Tools
import { GestionISBN } from '../components/admin/books/GestionISBN';
import { TitleFixer } from '../components/admin/books/TitleFixer';
import { CoverSearchTool } from '../components/admin/books/CoverSearchTool';

import '../styles/pages/AdminDashboard.css';

type AdminSection = 'dashboard' | 'books' | 'invoices' | 'orders' | 'clients' | 'isbn' | 'titles' | 'covers' | 'metadata';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { invoices } = useInvoice(); // Invoices context
  const { theme, actualTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { formatPrice, settings } = useSettings();
  
  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark');
  };
  
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dashboard Stats State
  const [totalBooks, setTotalBooks] = useState(0);
  const [booksInStock, setBooksInStock] = useState(0);
  const [booksOutOfStock, setBooksOutOfStock] = useState(0);
  const [totalStockUnits, setTotalStockUnits] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Load Stats on Mount
  useEffect(() => {
    const cargarEstadisticas = async () => {
      setLoadingStats(true);
      try {
        const stats = await obtenerEstadisticasLibros();
        setTotalBooks(stats.total);
        setBooksInStock(stats.enStock);
        setBooksOutOfStock(stats.sinStock);
        
        const units = await obtenerTotalUnidadesStock();
        setTotalStockUnits(units);

        const pedidosStats = await obtenerEstadisticasPedidos();
        if (pedidosStats) {
             setTotalOrders(pedidosStats.total);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    cargarEstadisticas();
  }, []);

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Dashboard Home View
  const renderDashboard = () => {
    const stats = {
        totalBooks: totalBooks,
        totalInvoices: invoices.length,
        totalOrders: totalOrders,
        totalRevenue: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
        inStock: booksInStock,
        outOfStock: booksOutOfStock
    };

    return (
    <div className="stats-section">
      {loadingStats && (
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon books">
            <BookIcon size={24} />
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
  };

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
            <BookIcon size={18} />
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
          
          <button
            onClick={() => handleSectionChange('metadata')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'metadata' 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Tags size={18} />
            Metadatos
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
             onClick={() => navigate('/admin/ajustes')}
             className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Sparkles size={18} /> {/* Reuse Sparkles or suggest Settings Icon if imported */}
            Ajustes de Administrador
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
              activeSection === 'covers' ? 'Buscador de Portadas' :
              activeSection === 'books' ? 'Catálogo' :
              activeSection === 'invoices' ? 'Facturas' :
              activeSection === 'orders' ? 'Pedidos' :
              activeSection === 'clients' ? 'Clientes' :
              activeSection === 'metadata' ? 'Gestión de Metadatos' :
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
             {activeSection === 'dashboard' && renderDashboard()}
             {activeSection === 'books' && <BooksManager />}
             {activeSection === 'invoices' && <InvoicesManager />}
             {activeSection === 'orders' && <OrdersManager />}
             {activeSection === 'clients' && <GestionClientes />}
             
             {/* Tools */}
             {activeSection === 'isbn' && <GestionISBN />}
             {activeSection === 'titles' && <TitleFixer />}
             {activeSection === 'covers' && <CoverSearchTool />}
             {activeSection === 'metadata' && <MetadataManager />}
           </div>
        </main>
      </div>
    </div>
  );
}