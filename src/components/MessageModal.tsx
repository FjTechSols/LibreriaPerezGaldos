import { useEffect } from 'react';
import { X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
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
  
  // Scroll lock with layout shift compensation
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('--scrollbar-compensation');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('--scrollbar-compensation');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="message-modal-overlay" onClick={onClose}>
      <div className="message-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="message-modal__header">
          <button onClick={onClose} className="message-modal__close-btn" aria-label="Cerrar modal">
            <X size={24} />
          </button>
        </div>

        <div className="message-modal__content">
          <div className={`message-modal__icon message-modal__icon--${type}`}>
            {type === 'error' && <AlertCircle size={48} />}
            {type === 'info' && <Info size={48} />}
            {type === 'success' && <CheckCircle2 size={48} />}
            {type === 'warning' && <AlertCircle size={48} />}
          </div>
          
          <h3 className="message-modal__title">{title}</h3>
          
          <p className="message-modal__text">
            {message}
          </p>

          <div className="message-modal__actions">
            {(showCancel || onConfirm) && (
              <button 
                onClick={onClose} 
                className="message-modal__btn message-modal__btn--cancel"
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
