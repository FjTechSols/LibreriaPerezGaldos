import { useState, useEffect } from 'react';
import { getUserReservations, cancelReservation } from '../../services/reservationService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Reserva } from '../../types';
import { Clock, CheckCircle, XCircle, Package, RotateCcw, Ban, Calendar } from 'lucide-react';
import { Pagination } from '../Pagination';
import { MessageModal } from '../MessageModal'; // Import MessageModal

interface MyReservationsProps {
  onReservationChange?: () => void;
}

export function MyReservations({ onReservationChange }: MyReservationsProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // MessageModal State
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
        buttonText: onConfirm ? 'Aceptar' : 'Cerrar'
    });
    setShowMessageModal(true);
  };

  useEffect(() => {
    if (user) {
      loadReservations();
    }
  }, [user, currentPage]);

  const loadReservations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, count } = await getUserReservations(user.id, currentPage, itemsPerPage);
      setReservations(data);
      setTotalItems(count);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = (reservationId: number) => {
    showModal(
        'Confirmar Cancelación',
        '¿Estás seguro de que deseas cancelar esta reserva?',
        'warning',
        async () => {
            try {
                await cancelReservation(reservationId, user!.id);
                showModal('Reserva Cancelada', 'La reserva ha sido cancelada exitosamente.', 'success');
                await loadReservations();
                if (onReservationChange) {
                    onReservationChange();
                }
            } catch (error) {
                console.error('Error canceling reservation:', error);
                showModal('Error', 'No se pudo cancelar la reserva. Por favor, intenta de nuevo.', 'error');
            }
        }
    );
  };

  const getStatusBadge = (estado: string) => {
    const badges = {
      pendiente: { icon: Clock, class: 'status-pending', label: 'Pendiente' },
      confirmada: { icon: CheckCircle, class: 'status-confirmed', label: 'Confirmada' },
      entregada: { icon: Package, class: 'status-delivered', label: 'Entregada' },
      rechazada: { icon: XCircle, class: 'status-rejected', label: 'Rechazada' },
      devuelta: { icon: RotateCcw, class: 'status-returned', label: 'Devuelta' },
      cancelada: { icon: Ban, class: 'status-canceled', label: 'Cancelada' },
      expirada: { icon: Clock, class: 'status-expired', label: 'Expirada' }
    };

    const badge = badges[estado as keyof typeof badges] || badges.pendiente;
    const Icon = badge.icon;

    return (
      <span className={`status-badge ${badge.class}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const filteredReservations = reservations.filter(res => {
    if (filter === 'all') return true;
    return res.estado === filter;
  });

  if (loading) {
    return <div className="loading">Cargando reservas...</div>;
  }

  return (
    <div className="my-reservations">
      <div className="section-header">
        <h2>{t('myReservations')}</h2>
        <p>{t('manageReservations')}</p>
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          {t('all')} ({reservations.length})
        </button>
        <button 
          className={filter === 'pendiente' ? 'active' : ''}
          onClick={() => setFilter('pendiente')}
        >
          {t('pending')} ({reservations.filter(r => r.estado === 'pendiente').length})
        </button>
        <button 
          className={filter === 'confirmada' ? 'active' : ''}
          onClick={() => setFilter('confirmada')}
        >
          {t('confirmed')} ({reservations.filter(r => r.estado === 'confirmada').length})
        </button>

      </div>

      {filteredReservations.length === 0 ? (
        <div className="empty-state">
          <Package size={48} />
          <p>{t('noReservations')} {filter !== 'all' ? `${t('inStatus')} "${filter}"` : ''}</p>
        </div>
      ) : (
        <div className="reservations-grid">
          {filteredReservations.map((reservation) => (
            <div key={reservation.id} className="reservation-card">
              <div className="card-header">
                {getStatusBadge(reservation.estado)}
                <span className="reservation-date">
                  {new Date(reservation.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>

              <div className="card-body">
                {reservation.libro?.imagen_url && (
                  <img 
                    src={reservation.libro.imagen_url} 
                    alt={reservation.libro.titulo}
                    className="book-cover"
                  />
                )}
                <div className="book-details">
                  <h3>{reservation.libro?.titulo}</h3>
                  
                  <div className="book-meta-container">
                    <span className="book-meta-item">
                      <strong>{t('author')}:</strong> {reservation.libro?.autor || t('notSpecified')}
                    </span>
                    <span className="book-meta-separator">•</span>
                    <span className="book-meta-item">
                      <strong>{t('publisher')}:</strong> {reservation.libro?.editorial?.nombre || t('notSpecifiedFemale')}
                    </span>
                    <span className="book-meta-separator">•</span>
                    <span className="book-meta-item">
                      <strong>{t('year')}:</strong> {reservation.libro?.anio || t('notSpecified')}
                    </span>
                  </div>
                  
                  {reservation.estado === 'confirmada' && reservation.fecha_expiracion && (
                    <div className="expiration-info">
                      <Calendar size={14} />
                      <span>
                        {t('pickupBefore')}: {new Date(reservation.fecha_expiracion).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-footer">
                {reservation.estado === 'pendiente' && (
                  <button 
                    onClick={() => handleCancelReservation(reservation.id)}
                    className="cancel-btn"
                  >
                    <Ban size={16} />
                    {t('cancelReservation')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalItems > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Message Modal Component */}
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
