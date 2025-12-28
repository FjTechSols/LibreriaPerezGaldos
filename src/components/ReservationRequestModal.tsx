import { X, CalendarClock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="reservation-modal-overlay" onClick={onClose}>
      <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reservation-modal__header">
          <h3 className="reservation-modal__title">
            <BookOpen className="text-blue-600" size={24} />
            Solicitud de Reserva
          </h3>
          <button onClick={onClose} className="reservation-modal__close-btn" disabled={isProcessing}>
            <X size={24} />
          </button>
        </div>

        {isSuccess ? (
          <div className="reservation-modal__content">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 text-green-500">
                <CheckCircle size={64} />
              </div>
              <h4 className="text-xl font-bold mb-2 dark:text-gray-100" style={{ color: 'var(--text-primary)'}}>
                Reserva Solicitada con Éxito
              </h4>
              <p className="reservation-modal__text mb-6">
                Tu solicitud para <strong>"{bookTitle}"</strong> ha sido registrada correctamente.
                <br />
                Te notificaremos cuando el ejemplar esté listo.
              </p>
              <button 
                onClick={onClose} 
                className="reservation-modal__btn reservation-modal__btn--confirm w-full justify-center"
                style={{ width: '100%', justifyContent: 'center' }}
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

              <div className="reservation-modal__warning">
                <AlertCircle className="reservation-modal__warning-icon" size={20} />
                <p className="m-0">
                   Te notificaremos automáticamente una vez que la reserva haya sido confirmada y te informaremos sobre el plazo de recogida.
                </p>
              </div>

              <p className="reservation-modal__text text-center font-medium mt-2">
                ¿Deseas continuar con la reserva?
              </p>
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
                disabled={isProcessing}
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
