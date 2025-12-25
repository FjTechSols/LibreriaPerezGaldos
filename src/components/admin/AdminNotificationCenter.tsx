import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdminNotifications, markAsRead, markAllAdminNotificationsAsRead } from '../../services/notificationService';
import { Notificacion } from '../../types';
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  Filter, 
  AlertCircle,
  Package,
  Calendar
} from 'lucide-react';
import '../../styles/components/AdminNotifications.css';

export default function AdminNotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'pedido' | 'reserva'>('all');

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getAdminNotifications(user!.id);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, leida: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      loadNotifications(); // Revert on error
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAdminNotificationsAsRead(user!.id);
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
      loadNotifications();
    }
  };

  // Filter logic
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.leida;
    if (filter === 'pedido') return n.tipo === 'pedido' || n.tipo === 'nuevo_pedido';
    if (filter === 'reserva') return n.tipo === 'reserva_creada' || n.tipo === 'reserva_cancelada';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  const getIconForType = (type: string) => {
    if (type === 'pedido' || type === 'nuevo_pedido') return <Package className="text-blue-500" size={20} />;
    if (type.includes('reserva')) return <Calendar className="text-purple-500" size={20} />;
    return <AlertCircle className="text-gray-500" size={20} />;
  };

  if (loading) {
    return (
      <div className="admin-notifications-loading">
        <div className="spinner"></div>
        <p>Cargando notificaciones...</p>
      </div>
    );
  }

  return (
    <div className="admin-notification-center">
      <div className="admin-notifications-header">
        <div className="header-title">
          <h2>Centro de Notificaciones</h2>
          <span className="unread-badge">
            {unreadCount} sin leer
          </span>
        </div>
        
        <div className="header-actions">
          <div className="filter-group">
            <Filter size={16} />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">Todas</option>
              <option value="unread">No leídas</option>
              <option value="pedido">Pedidos</option>
              <option value="reserva">Reservas</option>
            </select>
          </div>
          
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} className="mark-all-btn">
              <CheckCheck size={16} />
              Marcar todo leído
            </button>
          )}
        </div>
      </div>

      <div className="notifications-container">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} className="empty-icon" />
            <h3>No tienes notificaciones</h3>
            <p>Las nuevas alertas de pedidos y reservas aparecerán aquí.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-card ${!notification.leida ? 'unread' : ''}`}
                onClick={() => !notification.leida && handleMarkAsRead(notification.id)}
              >
                <div className="notification-icon-wrapper">
                  {getIconForType(notification.tipo)}
                </div>
                
                <div className="notification-content">
                  <div className="notification-top">
                    <h4>{notification.titulo}</h4>
                    <span className="notification-time">
                      <Clock size={12} />
                      {new Date(notification.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p>{notification.mensaje}</p>
                </div>

                {!notification.leida && (
                  <div className="unread-dot" title="No leído"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
