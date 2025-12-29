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

              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm">
                <div className="flex items-start gap-2 mb-2 text-blue-800 dark:text-blue-300 font-medium">
                  <MapPin size={18} className="shrink-0 mt-0.5" />
                  <span>Información de Recogida</span>
                </div>
                <div className="text-blue-700 dark:text-blue-400 pl-6 space-y-2">
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
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="terms-checkbox" className="font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">
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
                style={!acceptedTerms ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
