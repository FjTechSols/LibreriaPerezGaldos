import { useState, useEffect } from 'react';
import { Reserva } from '../../types';
import { X } from 'lucide-react';
import '../../styles/components/ConfirmReservationModal.css';
import { MessageModal } from '../MessageModal'; // Import MessageModal

interface ConfirmReservationModalProps {
  reservation: Reserva;
  onConfirm: (expirationDate: string, startDate: string) => Promise<void>;
  onCancel: () => void;
}

export function ConfirmReservationModal({ 
  reservation, 
  onConfirm, 
  onCancel 
}: ConfirmReservationModalProps) {
  // Set default start date to today
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(reservation.libro?.stock || 0);
  const [stockLoading, setStockLoading] = useState(true);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  // Fetch current stock when modal opens
  useEffect(() => {
    const fetchCurrentStock = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('libros')
          .select('stock')
          .eq('id', reservation.libro_id)
          .single();

        if (!error && data) {
          setCurrentStock(data.stock);
        }
      } catch (error) {
        console.error('Error fetching current stock:', error);
      } finally {
        setStockLoading(false);
      }
    };

    fetchCurrentStock();
  }, [reservation.libro_id]);

  const handleConfirm = async () => {
    if (!startDate) {
      showModal('Error', 'Por favor selecciona una fecha de inicio de recogida', 'error');
      return;
    }

    if (!expirationDate) {
      showModal('Error', 'Por favor selecciona una fecha de expiración', 'error');
      return;
    }

    if (new Date(expirationDate) <= new Date(startDate)) {
      showModal('Error', 'La fecha límite debe ser posterior a la fecha de inicio', 'error');
      return;
    }

    if (currentStock <= 0) {
      showModal('Error', 'No hay stock disponible para confirmar esta reserva. El libro ya no está disponible.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await onConfirm(expirationDate, startDate);
    } finally {
      setLoading(false);
    }
  };

  // Set minimum date to tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-reservation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Confirmar Reserva</h2>
          <button onClick={onCancel} className="close-btn" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="reservation-details">
          <div className="detail-row">
            <strong>Usuario:</strong>
            <span>{reservation.usuario?.nombre_completo || reservation.usuario?.email}</span>
          </div>
          <div className="detail-row">
            <strong>Email:</strong>
            <span>{reservation.usuario?.email}</span>
          </div>
          <div className="detail-row">
            <strong>Libro:</strong>
            <span>{reservation.libro?.titulo}</span>
          </div>
          <div className="detail-row">
            <strong>Legacy ID:</strong>
            <span>{reservation.libro?.legacy_id}</span>
          </div>
          <div className="detail-row">
            <strong>Stock Actual:</strong>
            <span className={currentStock > 0 ? 'stock-available' : 'stock-unavailable'}>
              {stockLoading ? 'Cargando...' : currentStock}
            </span>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="start-date">Fecha inicial de recogida *</label>
          <input 
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={todayStr}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="expiration-date">Fecha límite para recoger *</label>
          <input 
            id="expiration-date"
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            min={startDate || minDateStr}
            required
            disabled={loading}
          />
          <small>El usuario tendrá hasta esta fecha para recoger el libro</small>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} disabled={loading} className="btn-cancel">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading} className="btn-confirm">
            {loading ? 'Confirmando...' : 'Confirmar Reserva'}
          </button>
        </div>
      </div>
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type as any}
      />
    </div>
  );
}
