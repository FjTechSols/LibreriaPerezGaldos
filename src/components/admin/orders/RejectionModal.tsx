import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import '../../../styles/components/MessageModal.css';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title?: string;
}

export function RejectionModal({ isOpen, onClose, onConfirm, title = 'Rechazar Pedido' }: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Debes especificar un motivo para el rechazo.');
      return;
    }
    onConfirm(reason);
    setReason('');
    setError('');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="modal-header">
           <div className="icon-container error">
             <AlertCircle size={32} />
           </div>
           <h2>{title}</h2>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: '#64748b' }}>
            Por favor, indica el motivo por el cual no se puede procesar este pedido. Este mensaje será enviado al cliente.
          </p>
          
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setError('');
            }}
            placeholder="Ej: Stock insuficiente, libro deteriorado..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`,
              borderRadius: '8px',
              fontSize: '0.9rem',
              resize: 'vertical',
              marginBottom: error ? '0.5rem' : '1.5rem',
              outline: 'none'
            }}
          />
          
          {error && (
             <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
               {error}
             </p>
          )}

          <div className="modal-actions">
            <button className="modal-btn secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
                className="modal-btn primary" 
                onClick={handleSubmit}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
            >
              Rechazar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
