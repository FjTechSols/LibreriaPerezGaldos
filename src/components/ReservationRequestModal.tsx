import { useState, useEffect } from 'react';
import { X, CalendarClock, BookOpen, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import '../styles/components/ReservationRequestModal.css';

interface ReservationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
  isProcessing?: boolean;
  isSuccess?: boolean;
}

export function ReservationRequestModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  bookTitle,
  isProcessing = false,
  isSuccess = false
}: ReservationRequestModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Reset checkbox when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAcceptedTerms(false);
    }
  }, [isOpen]);

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
    <div className="reservation-modal-overlay" onClick={onClose}>
      <div className="reservation-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="reservation-modal__header">
          <h3 className="reservation-modal__title">
            <BookOpen className="reservation-success-icon" size={24} />
            Solicitud de Reserva
          </h3>
          <button onClick={onClose} className="reservation-modal__close-btn" disabled={isProcessing} aria-label="Cerrar modal">
            <X size={24} />
          </button>
        </div>

        {isSuccess ? (
          <div className="reservation-modal__content">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 reservation-success-icon">
                <CheckCircle size={64} />
              </div>
              <h4 className="reservation-success-title">
                Reserva Solicitada con Éxito
              </h4>
              <p className="reservation-modal__text mb-6">
                Tu solicitud para <strong>"{bookTitle}"</strong> ha sido registrada correctamente.
                <br />
                Te notificaremos cuando el ejemplar esté listo.
              </p>
              <button 
                onClick={onClose} 
                className="reservation-modal__btn reservation-modal__btn--confirm w-full"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="reservation-modal__content">
              <div className="reservation-modal__info">
                <p className="reservation-modal__text">
                  Estás a punto de solicitar la reserva del libro:
                  <br/>
                  <strong>"{bookTitle}"</strong>
                </p>
                <p className="reservation-modal__text">
                  <span className="flex items-center gap-2 mb-1">
                    <CalendarClock size={16} />
                    <strong>Proceso de Confirmación:</strong>
                  </span>
                  Esta solicitud quedará en estado <strong>Pendiente</strong> a la espera de que un administrador revise la solicitud y verifique la disponibilidad del ejemplar.
                </p>
              </div>

              <div className="mb-4 p-4 bg-[var(--bg-accent-subtle)] border border-[var(--border-accent)] rounded-lg text-sm">
                <div className="flex items-start gap-2 mb-2 text-[var(--accent)] font-bold">
                  <MapPin size={18} className="shrink-0 mt-0.5" />
                  <span>Información de Recogida</span>
                </div>
                <div className="text-[var(--text-muted)] pl-6 space-y-2">
                  <p>
                    Recomendamos este servicio para la <strong>provincia de Madrid</strong> (recogida personal). 
                    Si no puedes desplazarte, por favor utiliza el servicio de <strong>compra directa</strong>.
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-start gap-3 px-1">
                <div className="flex items-center h-5">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)] border-[var(--border-strong)] rounded focus:ring-[var(--accent)]"
                    disabled={isProcessing}
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="terms-checkbox" className="font-bold text-[var(--text-main)] select-none cursor-pointer">
                    He leído la información sobre recogida y accesibilidad
                  </label>
                </div>
              </div>

              <div className="reservation-modal__warning">
                <AlertCircle className="reservation-modal__warning-icon" size={20} />
                <p className="m-0">
                   Te notificaremos automáticamente una vez que la reserva haya sido confirmada y te informaremos sobre el plazo de recogida.
                </p>
              </div>
            </div>

            <div className="reservation-modal__footer">
              <button 
                onClick={onClose} 
                className="reservation-modal__btn reservation-modal__btn--cancel"
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirm} 
                className="reservation-modal__btn reservation-modal__btn--confirm"
                disabled={isProcessing || !acceptedTerms}
                title={!acceptedTerms ? "Debes aceptar los términos de recogida para continuar" : ""}
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Procesando...
                  </>
                ) : (
                  <>
                    Confirmar Reserva
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
