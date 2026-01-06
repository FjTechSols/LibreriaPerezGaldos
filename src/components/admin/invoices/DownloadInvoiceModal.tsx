import { X, Globe } from 'lucide-react';

interface DownloadInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (language: 'es' | 'en') => void;
  invoiceNumber: string;
}

export default function DownloadInvoiceModal({ isOpen, onClose, onDownload, invoiceNumber }: DownloadInvoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Descargar Factura {invoiceNumber}</h3>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body" style={{ padding: '0.5rem 0' }}>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Selecciona el idioma para el documento PDF:
          </p>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <button 
              onClick={() => onDownload('es')}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Globe size={18} />
              Español (Spanish)
            </button>
            <button 
              onClick={() => onDownload('en')}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Globe size={18} />
              Inglés (English)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
