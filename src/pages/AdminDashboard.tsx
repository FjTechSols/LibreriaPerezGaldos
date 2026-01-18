import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Manager Components
import { BooksManager } from '../components/admin/books/BooksManager';
import { InvoicesManager } from '../components/admin/invoices/InvoicesManager';
import { OrdersManager } from '../components/admin/orders/OrdersManager';
import { ReservationManager } from '../components/admin/ReservationManager';
import { GestionClientes } from '../components/admin/clients/GestionClientes';
import { MetadataManager } from '../components/admin/metadata/MetadataManager';

// ... other imports ... 

import { obtenerEstadisticasLibros, obtenerTotalUnidadesStock } from '../services/libroService';
import { obtenerEstadisticasPedidos } from '../services/pedidoService';
import { useAuth } from '../context/AuthContext';
import { useInvoice } from '../context/InvoiceContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

import { DiscountManager } from '../components/admin/marketing/DiscountManager';
import { BannerManager } from '../components/admin/marketing/BannerManager';

// Dashboard Charts
import { RevenueChart } from '../components/admin/dashboard/RevenueChart';
import { CategoryChart } from '../components/admin/dashboard/CategoryChart';
import { OrderStatusChart } from '../components/admin/dashboard/OrderStatusChart';
import { TopSellingBooksChart } from '../components/admin/dashboard/TopSellingBooksChart';

// Legacy / Specific Tools
import { GestionISBN } from '../components/admin/books/GestionISBN';
import { TitleFixer } from '../components/admin/books/TitleFixer';
import { CoverSearchTool } from '../components/admin/books/CoverSearchTool';

import { 
  Users as UsersIcon, 
  FileText, 
  LogOut, 
  Menu, 
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
  Tags,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarClock,
  Bell,
  Grid,
  LayoutList
} from 'lucide-react';

// ... imports ...

import '../styles/pages/AdminDashboard.css';

import { getAdminUnreadNotifications } from '../services/notificationService';
import { getPendingOrdersCount } from '../services/pedidoService';
import { getPendingReservationsCount } from '../services/reservationService';
import { getUnreadOrdersCount, getUnreadReservationsCount, getUnreadInvoicesCount } from '../services/notificationService';
import { AdminNotificationCenter } from '../components/admin';

type AdminSection = 'dashboard' | 'books' | 'invoices' | 'orders' | 'reservations' | 'clients' | 'marketing' | 'discounts' | 'isbn' | 'titles' | 'covers' | 'metadata' | 'notifications';

export function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const { invoices } = useInvoice(); // Invoices context
  const { theme, actualTheme, setTheme, viewMode, setViewMode } = useTheme();
  const navigate = useNavigate();
  const { formatPrice, settings } = useSettings();
  
  const toggleTheme = () => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark');
  };
  
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [badgeCounts, setBadgeCounts] = useState({ total: 0, orders: 0, reservations: 0, invoices: 0 });

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const unreadNotes = await getAdminUnreadNotifications(user.id);
      const pendingOrdersCount = await getPendingOrdersCount();
      
      
      // Orders count uses PENDING/PROCESSING orders (Action items)
      // Reservations count: Actual pending reservations from DB
      const reservationsCount = await getPendingReservationsCount();
      
      // Invoices count (Pending) - derived from context
      // Invoices count (Pending/Actionable)
      // Logic: Show badge only for statuses needing review/action
      const pendingInvoices = invoices.filter(inv => {
          const s = inv.status?.toLowerCase() || '';
          return s === 'pendiente' || s === 'pending' || s === 'payment_pending' || s === 'por verificar';
      }).length;

      setBadgeCounts({
        total: unreadNotes.length,
        orders: pendingOrdersCount,
        reservations: reservationsCount,
        invoices: pendingInvoices
      });
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  }, [user, invoices]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Section collapse state
  const [sectionStates, setSectionStates] = useState({
    principal: true,
    marketing: false,
    tools: false
  });
  
  // Sidebar collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('adminSidebarCollapsed', String(newValue));
      return newValue;
    });
  };

  // Dashboard Stats State
  const [totalBooks, setTotalBooks] = useState(0);
  const [booksInStock, setBooksInStock] = useState(0);
  const [booksOutOfStock, setBooksOutOfStock] = useState(0);
  const [totalStockUnits, setTotalStockUnits] = useState(0);
  
  // Notification badges for sidebar
  const [unreadOrders, setUnreadOrders] = useState(0);
  const [unreadReservations, setUnreadReservations] = useState(0);
  const [unreadInvoices, setUnreadInvoices] = useState(0);
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

  // Fetch notification counts for sidebar badges
  useEffect(() => {
    const fetchNotificationCounts = async () => {
      if (user) {
        try {
          const [orders, reservations, invoices] = await Promise.all([
            getUnreadOrdersCount(user.id),
            getUnreadReservationsCount(user.id),
            getUnreadInvoicesCount(user.id)
          ]);
          
          setUnreadOrders(orders);
          setUnreadReservations(reservations);
          setUnreadInvoices(invoices);
        } catch (error) {
          console.error('Error fetching notification counts:', error);
        }
      }
    };

    fetchNotificationCounts();
    // Refresh every 10 seconds
    const interval = setInterval(fetchNotificationCounts, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAdmin) {
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

      {/* Analytics Charts */}
      <div className="charts-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--spacing-6)',
        marginBottom: 'var(--spacing-8)'
      }}>
        <RevenueChart />
        <CategoryChart />
        <OrderStatusChart />
        <TopSellingBooksChart />
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${!isMobile && isSidebarCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img 
              src="/Logo Exlibris Perez Galdos.png" 
              alt="Logo" 
              className="sidebar-logo-img"
            />
            {!isSidebarCollapsed && (
              <span className="sidebar-title">Admin Panel</span>
            )}
          </div>
          <button 
            onClick={toggleSidebar}
            className="sidebar-toggle"
            title={isSidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>



        {/* Navigation */}
        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Section: Principal */}
          <div className="nav-section">
            {!isSidebarCollapsed && (
              <button 
                className="section-header"
                onClick={() => setSectionStates(prev => ({ ...prev, principal: !prev.principal }))}
              >
                <span>PRINCIPAL</span>
                {sectionStates.principal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            
            {(isSidebarCollapsed || sectionStates.principal) && (
              <div className="section-content">
                <button
                  onClick={() => handleSectionChange('dashboard')}
                  className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Inicio' : ''}
                >
                  <Home size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Inicio</span>}
                </button>
                
                <button
                  onClick={() => handleSectionChange('books')}
                  className={`nav-item ${activeSection === 'books' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Catálogo' : ''}
                >
                  <BookIcon size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Catálogo</span>}
                </button>
                
                <button
                  onClick={() => handleSectionChange('invoices')}
                  className={`nav-item ${activeSection === 'invoices' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Facturas' : ''}
                >
                  <div className="nav-item-icon-wrapper">
                    <FileText size={20} className="nav-item-icon" />
                    {/* Dot removed as badge handles status */}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="nav-item-text">Facturas</span>
                      {badgeCounts.invoices > 0 && (
                          <span className={`sidebar-badge-count ${unreadInvoices === 0 ? 'passive' : ''}`}>
                            {badgeCounts.invoices}
                          </span>
                      )}
                    </div>
                  )}
                </button>
                
                <button
                  onClick={() => handleSectionChange('orders')}
                  className={`nav-item ${activeSection === 'orders' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Pedidos' : ''}
                >
                  <div className="nav-item-icon-wrapper">
                    <ShoppingBag size={20} className="nav-item-icon" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full">
                     <span className="nav-item-text">Pedidos</span>
                     {badgeCounts.orders > 0 && (
                         <span className={`sidebar-badge-count ${unreadOrders === 0 ? 'passive' : ''}`}>
                            {badgeCounts.orders}
                         </span>
                     )}
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleSectionChange('reservations')}
                  className={`nav-item ${activeSection === 'reservations' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Reservas' : ''}
                >
                  <div className="nav-item-icon-wrapper">
                    <CalendarClock size={20} className="nav-item-icon" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="nav-item-text">Reservas</span>
                      {badgeCounts.reservations > 0 && (
                          <span className={`sidebar-badge-count ${unreadReservations === 0 ? 'passive' : ''}`}>
                            {badgeCounts.reservations}
                          </span>
                      )}
                    </div>
                  )}
                </button>
                
                <button
                  onClick={() => handleSectionChange('clients')}
                  className={`nav-item ${activeSection === 'clients' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Clientes' : ''}
                >
                  <UsersIcon size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Clientes</span>}
                </button>
                
                <button
                  onClick={() => handleSectionChange('metadata')}
                  className={`nav-item ${activeSection === 'metadata' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Metadatos' : ''}
                >
                  <Tags size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Metadatos</span>}
                </button>
              </div>
            )}
          </div>

          {/* Section: Marketing */}
          <div className="nav-section">
            {!isSidebarCollapsed && (
              <button 
                className="section-header"
                onClick={() => setSectionStates(prev => ({ ...prev, marketing: !prev.marketing }))}
              >
                <span>MARKETING</span>
                {sectionStates.marketing ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}

            {(isSidebarCollapsed || sectionStates.marketing) && (
              <div className="section-content">
                <button 
                  onClick={() => handleSectionChange('marketing')}
                  className={`nav-item ${activeSection === 'marketing' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Banners' : ''}
                >
                  <Sparkles size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Banners</span>}
                </button>

                <button 
                  onClick={() => handleSectionChange('discounts')}
                  className={`nav-item ${activeSection === 'discounts' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Ofertas' : ''}
                >
                  <Tag size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Ofertas</span>}
                </button>
              </div>
            )}
          </div>

          {/* Section: Herramientas */}
          <div className="nav-section">
            {!isSidebarCollapsed && (
              <button 
                className="section-header"
                onClick={() => setSectionStates(prev => ({ ...prev, tools: !prev.tools }))}
              >
                <span>HERRAMIENTAS</span>
                {sectionStates.tools ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          
            {(isSidebarCollapsed || sectionStates.tools) && (
              <div className="section-content">
                <button
                  onClick={() => handleSectionChange('covers')}
                  className={`nav-item ${activeSection === 'covers' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Buscar Portadas' : ''}
                >
                  <ImageIcon size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Buscar Portadas</span>}
                </button>
                
                <button
                  onClick={() => handleSectionChange('isbn')}
                  className={`nav-item ${activeSection === 'isbn' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Completar ISBNs' : ''}
                >
                  <Barcode size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Completar ISBNs</span>}
                </button>
                
                <button
                  onClick={() => handleSectionChange('titles')}
                  className={`nav-item ${activeSection === 'titles' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'Corregir Títulos' : ''}
                >
                  <Sparkles size={20} className="nav-item-icon" />
                  {!isSidebarCollapsed && <span className="nav-item-text">Corregir Títulos</span>}
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button 
            onClick={() => navigate('/')}
            className="nav-item"
            title={isSidebarCollapsed ? 'Volver a la Web' : ''}
          >
            <ArrowLeft size={20} className="nav-item-icon" />
            {!isSidebarCollapsed && <span className="nav-item-text">Volver a la Web</span>}
          </button>
          
          <button 
            onClick={() => navigate('/admin/ajustes')}
            className="nav-item"
            title={isSidebarCollapsed ? 'Ajustes de Administrador' : ''}
          >
            <Sparkles size={20} className="nav-item-icon" />
            {!isSidebarCollapsed && <span className="nav-item-text">Ajustes de Administrador</span>}
          </button>
          
          <button 
            onClick={logout}
            className="nav-item logout-btn"
            title={isSidebarCollapsed ? 'Cerrar Sesión' : ''}
          >
            <LogOut size={20} className="nav-item-icon" />
            {!isSidebarCollapsed && <span className="nav-item-text">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`dashboard-content-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
              activeSection === 'reservations' ? 'Buzón de Reservas' :
              activeSection === 'clients' ? 'Clientes' :
              activeSection === 'metadata' ? 'Gestión de Metadatos' :
              activeSection}
          </h1>
          </div>

          {/* Center: View Toggle for Book Manager */}
          {activeSection === 'books' && (
             <div className="flex-1 flex justify-center mx-4">
               <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Vista de Cuadrícula"
                  >
                    <Grid size={16} />
                    <span className="hidden sm:inline">Cuadrícula</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Vista de Lista"
                  >
                    <LayoutList size={16} />
                    <span className="hidden sm:inline">Lista</span>
                  </button>
               </div>
             </div>
          )}
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
             </div>
             <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
             <button 
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setActiveSection('notifications')}
                title="Notificaciones"
                style={{ position: 'relative' }}
              >
                <Bell size={20} />
                {badgeCounts.total > 0 && (
                  <span className="admin-notification-badge">
                    {badgeCounts.total > 99 ? '99+' : badgeCounts.total}
                  </span>
                )}
              </button>
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
        <main className="flex-1 overflow-auto p-6 min-w-0" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="w-full min-w-0">
             {activeSection === 'dashboard' && renderDashboard()}
             {activeSection === 'books' && <BooksManager />}
             {activeSection === 'invoices' && <InvoicesManager />}
             {activeSection === 'orders' && <OrdersManager onOrdersChange={fetchUnreadCount} />}
             {activeSection === 'reservations' && <ReservationManager />}
             {activeSection === 'clients' && <GestionClientes />}
             
             {/* Marketing */}
             {activeSection === 'marketing' && <BannerManager />}
             {activeSection === 'discounts' && <DiscountManager />}
             
             {/* Tools */}
             {activeSection === 'isbn' && <GestionISBN />}
             {activeSection === 'titles' && <TitleFixer />}
             {activeSection === 'covers' && <CoverSearchTool />}
             {activeSection === 'metadata' && <MetadataManager />}
             {activeSection === 'notifications' && <AdminNotificationCenter onNotificationsChange={fetchUnreadCount} />}
           </div>
        </main>
      </div>
    </div>
  );
}