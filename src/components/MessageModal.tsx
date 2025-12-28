import { X, AlertCircle, Info } from 'lucide-react';
import '../styles/components/MessageModal.css';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning';
  buttonText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  cancelText?: string;
}

export function MessageModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  buttonText = 'Aceptar',
  onConfirm,
  showCancel = false,
  cancelText = 'Cancelar'
}: MessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="message-modal-overlay" onClick={onClose}>
      <div className="message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="message-modal__header">
          <button onClick={onClose} className="message-modal__close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="message-modal__content">
          <div className={`message-modal__icon message-modal__icon--${type}`}>
            {type === 'error' && <AlertCircle size={48} />}
            {type === 'info' && <Info size={48} />}
            {type === 'success' && <Info size={48} className="text-green-500" />} {/* Reusing Info or check */}
            {type === 'warning' && <AlertCircle size={48} className="text-yellow-500" />}
          </div>
          
          <h3 className="message-modal__title">{title}</h3>
          
          <p className="message-modal__text">
            {message}
          </p>

          <div className="message-modal__actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%' }}>
            {(showCancel || onConfirm) && (
              <button 
                onClick={onClose} 
                className="message-modal__btn message-modal__btn--cancel"
                style={{ backgroundColor: '#64748b' }}
              >
                {cancelText}
              </button>
            )}
            <button 
              onClick={() => {
                if (onConfirm) onConfirm();
                else onClose();
              }} 
              className={`message-modal__btn message-modal__btn--${type}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
