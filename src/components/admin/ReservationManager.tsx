import { useState, useEffect } from 'react';
import { getReservations, confirmReservation, rejectReservation, markAsDelivered, markAsReturned } from '../../services/reservationService';
import { createNotification } from '../../services/notificationService';
import { decrementStock } from '../../services/libroService';
import { sendReservationEmail } from '../../services/emailService';
import { Reserva } from '../../types';
import { Check, X, Clock, ExternalLink, Package, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ConfirmReservationModal } from './ConfirmReservationModal';
import { Pagination } from '../Pagination';

export function ReservationManager() {
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reserva | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    loadReservations();
  }, [currentPage]); // Reload when page changes

  const loadReservations = async () => {
    setLoading(true);
    try {
      const { data, count } = await getReservations({ page: currentPage, limit: itemsPerPage });
      console.log('Loaded reservations:', data);
      setReservations(data);
      setTotalItems(count);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = (reservation: Reserva) => {
    setSelectedReservation(reservation);
    setShowConfirmModal(true);
  };

  const handleConfirmReservation = async (expirationDate: string) => {
    if (!selectedReservation || !user) return;

    try {
      // 1. Confirm reservation with expiration date and admin tracking
      await confirmReservation(selectedReservation.id, expirationDate, user.id);

      // 2. Create in-app notification
      await createNotification(
        selectedReservation.usuario_id,
        'reserva_confirmada',
        'Reserva Confirmada',
        `Tu reserva para "${selectedReservation.libro?.titulo}" ha sido confirmada. Recógela antes del ${new Date(expirationDate).toLocaleDateString('es-ES')}.`,
        selectedReservation.id
      );

      // 4. Send email notification (non-blocking)
      sendReservationEmail(selectedReservation.id, 'confirmed').catch(error => {
        console.warn('Email notification failed:', error);
      });

      // 5. Reload reservations and close modal
      await loadReservations();
      setShowConfirmModal(false);
      setSelectedReservation(null);
      alert('Reserva confirmada exitosamente');
    } catch (error) {
      console.error('Error confirming reservation:', error);
      alert('Error al confirmar la reserva: ' + (error as Error).message);
    }
  };

  const handleRejectClick = async (reservation: Reserva) => {
    if (!user) return;
    
    if (!confirm(`¿Estás seguro de rechazar la reserva de "${reservation.libro?.titulo}"?`)) {
      return;
    }

    try {
      // 1. Reject reservation with admin tracking
      await rejectReservation(reservation.id, user.id);

      // 2. Create in-app notification
      await createNotification(
        reservation.usuario_id,
        'reserva_rechazada',
        'Reserva Rechazada',
        `Tu reserva para "${reservation.libro?.titulo}" no ha podido ser confirmada. Por favor, contacta con la librería para más información.`,
        reservation.id
      );

      // 3. Send email notification (non-blocking)
      sendReservationEmail(reservation.id, 'rejected').catch(error => {
        console.warn('Email notification failed:', error);
      });

      // 4. Reload reservations
      await loadReservations();
      alert('Reserva rechazada');
    } catch (error) {
      console.error('Error rejecting reservation:', error);
      alert('Error al rechazar la reserva: ' + (error as Error).message);
    }
  };

  const handleMarkAsDelivered = async (reservation: Reserva) => {
    if (!user) return;
    
    if (!confirm(`¿Marcar como entregada la reserva de "${reservation.libro?.titulo}"? Esto reducirá el stock.`)) {
      return;
    }

    try {
      // 1. Mark as delivered
      await markAsDelivered(reservation.id, user.id);

      // 2. Deduct stock
      await decrementStock(reservation.libro_id, 1);

      // 3. Reload reservations
      await loadReservations();
      alert('Reserva marcada como entregada y stock actualizado');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('Error al marcar como entregada: ' + (error as Error).message);
    }
  };

  const handleMarkAsReturned = async (reservation: Reserva) => {
    if (!user) return;
    
    if (!confirm(`¿Marcar como devuelta la reserva de "${reservation.libro?.titulo}"?`)) {
      return;
    }

    try {
      // 1. Mark as returned (no stock change)
      await markAsReturned(reservation.id, user.id);

      // 2. Reload reservations
      await loadReservations();
      alert('Reserva marcada como devuelta');
    } catch (error) {
      console.error('Error marking as returned:', error);
      alert('Error al marcar como devuelta: ' + (error as Error).message);
    }
  };

  if (loading) return <div>Cargando reservas...</div>;

  return (
    <div className="reservation-manager">
      <div className="section-header">
        <h2>Gestión de Reservas</h2>
        <p>Administra las solicitudes de reserva de libros.</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Libro (Legacy ID)</th>
              <th>Stock Actual</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((res) => (
              <tr key={res.id}>
                <td data-label="Fecha">{new Date(res.created_at).toLocaleDateString()}</td>
                <td data-label="Usuario">
                  <div className="user-info">
                    <span className="font-medium">{res.usuario?.nombre_completo || 'N/A'}</span>
                    <span className="text-sm text-gray-500">{res.usuario?.email}</span>
                  </div>
                </td>
                <td data-label="Libro">
                  <div className="book-info">
                    <Link to={`/libro/${res.libro_id}`} className="text-blue-600 hover:underline flex items-center gap-1" target="_blank">
                      {res.libro?.titulo}
                      <ExternalLink size={12} />
                    </Link>
                    <span className="text-xs text-gray-500">ID: {res.libro?.legacy_id || 'N/A'}</span>
                  </div>
                </td>
                <td data-label="Stock">{res.libro?.stock}</td>
                <td data-label="Estado">
                  <span className={`status-badge ${res.estado}`}>
                    {res.estado === 'pendiente' && <Clock size={14} />}
                    {res.estado.charAt(0).toUpperCase() + res.estado.slice(1)}
                  </span>
                </td>
                <td className={`actions-cell ${!(res.estado === 'pendiente' || res.estado === 'confirmada') ? 'empty-actions' : ''}`}>
                  {res.estado === 'pendiente' && (
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleConfirmClick(res)}
                        className="action-btn success"
                        title="Confirmar"
                      >
                        <Check size={16} />
                        <span>Confirmar</span>
                      </button>
                      <button 
                        onClick={() => handleRejectClick(res)}
                        className="action-btn danger"
                        title="Rechazar"
                      >
                        <X size={16} />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  )}
                  {res.estado === 'confirmada' && (
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleMarkAsDelivered(res)}
                        className="action-btn success"
                        title="Marcar como entregada"
                      >
                        <Package size={16} />
                        <span>Entregada</span>
                      </button>
                      <button 
                        onClick={() => handleMarkAsReturned(res)}
                        className="action-btn warning"
                        title="Marcar como devuelta"
                      >
                        <RotateCcw size={16} />
                        <span>Devuelta</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No hay reservas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showConfirmModal && selectedReservation && (
        <ConfirmReservationModal
          reservation={selectedReservation}
          onConfirm={handleConfirmReservation}
          onCancel={() => {
            setShowConfirmModal(false);
            setSelectedReservation(null);
          }}
        />
      )}

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
