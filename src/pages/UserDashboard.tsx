import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Bell, 
  Package, 
  ShoppingCart, 
  LayoutDashboard,
  BookMarked,
  Menu,
  X,
  Mail,
  Settings
} from 'lucide-react';
import { MyReservations } from '../components/user/MyReservations';
import { NotificationCenter } from '../components/user/NotificationCenter';
import { OrderHistory } from '../components/user/OrderHistory';
import { getUnreadCount } from '../services/notificationService';
import '../styles/pages/UserDashboard.css';

interface UserProfile {
  username: string;
  email: string;
  fecha_registro: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
}

interface UserStats {
  pedidos: number;
  reservas: number;
  notificaciones: number;
}

type Section = 'overview' | 'reservations' | 'notifications' | 'orders' | 'profile';

export function UserDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<Section>('overview');

  useEffect(() => {
    if (location.state && (location.state as any).section) {
      const section = (location.state as any).section;
      if (['overview', 'reservations', 'notifications', 'orders', 'profile'].includes(section)) {
        setActiveSection(section);
      }
    }
  }, [location]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ pedidos: 0, reservas: 0, notificaciones: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  // Reload stats when switching to notifications to update unread count
  useEffect(() => {
    if (user && activeSection === 'notifications') {
      loadStats();
    }
  }, [activeSection, user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { count: pedidosCount } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user?.id);

      // Count only active reservations (pendiente or confirmada)
      const { count: reservasCount } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user?.id)
        .in('estado', ['pendiente', 'confirmada']);

      const unreadNotifications = await getUnreadCount(user!.id);

      setStats({
        pedidos: pedidosCount || 0,
        reservas: reservasCount || 0,
        notificaciones: unreadNotifications
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'reservations':
        return <MyReservations onReservationChange={loadStats} />;
      case 'notifications':
        return <NotificationCenter onNotificationsChange={loadStats} />;
      case 'orders':
        return <OrderHistory />;
      case 'profile':
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="section-header">
        <h2>{t('overview')}</h2>
        <p>{t('welcome')}, {profile?.username}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => setActiveSection('reservations')}>
          <div className="stat-icon reservations">
            <BookMarked size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.reservas}</h3>
            <p>{t('activeReservations')}</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveSection('orders')}>
          <div className="stat-icon orders">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.pedidos}</h3>
            <p>{t('totalOrders')}</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveSection('notifications')}>
          <div className="stat-icon notifications">
            <Bell size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.notificaciones}</h3>
            <p>{t('notifications')}</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Accesos Rápidos</h3>
        <div className="action-buttons">
          <button onClick={() => setActiveSection('reservations')} className="action-btn">
            <BookMarked size={20} />
            {t('myReservations')}
          </button>
          <button onClick={() => setActiveSection('orders')} className="action-btn">
            <ShoppingCart size={20} />
            {t('myOrders')}
          </button>
          <button onClick={() => setActiveSection('profile')} className="action-btn">
            <User size={20} />
            {t('myProfile')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="profile-section">
      <div className="section-header">
        <h2>{t('myProfile')}</h2>
        <p>{t('accountInfo')}</p>
      </div>

      <div className="profile-info-grid">
        {profile?.nombre && (
          <div className="info-item">
            <User size={20} />
            <div>
              <label>{t('fullName')}</label>
              <p>{profile.nombre}</p>
            </div>
          </div>
        )}
        
        <div className="info-item">
          <User size={20} />
          <div>
            <label>{t('username')}</label>
            <p>{profile?.username}</p>
          </div>
        </div>
        
        <div className="info-item">
          <Mail size={20} />
          <div>
            <label>{t('email')}</label>
            <p>{profile?.email}</p>
          </div>
        </div>

        {profile?.telefono && (
          <div className="info-item">
            <Package size={20} />
            <div>
              <label>{t('phone')}</label>
              <p>{profile.telefono}</p>
            </div>
          </div>
        )}

        {profile?.direccion && (
          <div className="info-item">
            <Package size={20} />
            <div>
              <label>{t('address')}</label>
              <p>{profile.direccion}</p>
            </div>
          </div>
        )}

        {profile?.ciudad && (
          <div className="info-item">
            <Package size={20} />
            <div>
              <label>{t('city')}</label>
              <p>{profile.ciudad}</p>
            </div>
          </div>
        )}

        {profile?.codigo_postal && (
          <div className="info-item">
            <Package size={20} />
            <div>
              <label>{t('postalCode')}</label>
              <p>{profile.codigo_postal}</p>
            </div>
          </div>
        )}
        
        <div className="info-item">
          <Package size={20} />
          <div>
            <label>{t('memberSince')}</label>
            <p>{new Date(profile?.fecha_registro || '').toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </div>

        {(user?.role || user?.rolPrincipal) && (
          <div className="info-item">
            <Settings size={20} />
            <div>
              <label>Rol</label>
              <p className="role-badge">
                  {user.rolPrincipal?.nombre === 'super_admin' 
                  ? 'Super Administrador' 
                  : user.rolPrincipal?.nombre === 'admin' 
                  ? 'Administrador' 
                  : user.rolPrincipal?.nombre === 'editor'
                  ? 'Editor'
                  : user.rolPrincipal?.nombre === 'visualizador'
                  ? 'Visualizador'
                  : user.role === 'admin' 
                  ? 'Administrador' 
                  : 'Usuario'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="profile-actions">
        <Link to="/ajustes" className="settings-link-btn">
          <Settings size={18} />
          Ir a Ajustes para editar perfil
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="user-dashboard">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-btn">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1>{t('myAccount')}</h1>
      </div>

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{t('myAccount')}</h2>
          <p>{profile?.username}</p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }}
          >
            <LayoutDashboard size={20} />
            <span>{t('overview')}</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'reservations' ? 'active' : ''}`}
            onClick={() => { setActiveSection('reservations'); setSidebarOpen(false); }}
          >
            <BookMarked size={20} />
            <span>{t('myReservations')}</span>
            {stats.reservas > 0 && <span className="badge">{stats.reservas}</span>}
          </button>

          <button
            className={`nav-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveSection('notifications'); setSidebarOpen(false); }}
          >
            <Bell size={20} />
            <span>{t('notifications')}</span>
            {stats.notificaciones > 0 && <span className="badge">{stats.notificaciones}</span>}
          </button>

          <button
            className={`nav-item ${activeSection === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveSection('orders'); setSidebarOpen(false); }}
          >
            <Package size={20} />
            <span>{t('myOrders')}</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveSection('profile'); setSidebarOpen(false); }}
          >
            <User size={20} />
            <span>{t('myProfile')}</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {renderContent()}
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
