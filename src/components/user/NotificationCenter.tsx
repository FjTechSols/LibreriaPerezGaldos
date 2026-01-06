import { useState, useEffect } from 'react';
import { getUserNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Notificacion } from '../../types';
import { Bell, CheckCheck } from 'lucide-react';


interface NotificationCenterProps {
  onNotificationsChange?: () => void;
}

export function NotificationCenter({ onNotificationsChange }: NotificationCenterProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getUserNotifications(user!.id);
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
      loadNotifications();
      if (onNotificationsChange) onNotificationsChange();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(user!.id);
      loadNotifications();
      if (onNotificationsChange) onNotificationsChange();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Helper function to translate notification content
  const translateNotification = (notification: Notificacion): { titulo: string; mensaje: string } => {
    let titulo = notification.titulo;
    let mensaje = notification.mensaje;

    // Translate known notification titles
    if (titulo === 'Nuevo Pedido') {
      titulo = t('newOrder');
      // Extract order number and client from message
      const match = mensaje.match(/Nuevo pedido #(\d+) recibido de (.+)/);
      if (match) {
        mensaje = t('newOrderMessage').replace('{0}', match[1]).replace('{1}', match[2]);
      }
    } else if (titulo === 'Pedido Realizado') {
      titulo = t('orderPlaced');
      // Extract order number and status from message
      const match = mensaje.match(/Tu pedido #(\d+) se ha creado correctamente y está en estado: (.+)\./);
      if (match) {
        let status = match[2];
        // Translate status if it's "pendiente"
        if (status === 'pendiente') {
          status = t('orderStatusPending');
        }
        mensaje = t('orderPlacedMessage').replace('{0}', match[1]).replace('{1}', status);
      }
    }

    return { titulo, mensaje };
  };

  const unreadCount = notifications.filter(n => !n.leida).length;

  if (loading) {
    return <div className="loading">{t('loadingNotifications')}</div>;
  }

  return (
    <div className="notification-center">
      <div className="section-header">
        <div>
          <h2>{t('notifications')}</h2>
          <p>{unreadCount} {t('unread')}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="mark-all-btn">
            <CheckCheck size={16} />
            {t('markAllAsRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} />
          <p>{t('noNotifications')}</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const { titulo, mensaje } = translateNotification(notification);
            return (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.leida ? 'unread' : ''}`}
                onClick={() => !notification.leida && handleMarkAsRead(notification.id)}
              >
                <div className="notification-icon">
                  <Bell size={20} />
                </div>
                <div className="notification-content">
                  <h4>{titulo}</h4>
                  <p>{mensaje}</p>
                  <span className="notification-date">
                    {new Date(notification.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {!notification.leida && (
                  <div className="unread-indicator"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
