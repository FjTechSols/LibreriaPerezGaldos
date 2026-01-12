import React from 'react';
import { X } from 'lucide-react';
import InvoiceForm from './InvoiceForm';
import { InvoiceFormData } from '../../../types';
import '../../../styles/components/InvoiceModal.css';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
  loading?: boolean;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSubmit, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="invoice-modal-overlay">
      <div className="invoice-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-modal-header">
          <h2>Nueva factura</h2>
          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>
        <div className="invoice-modal-body">
          <InvoiceForm onSubmit={onSubmit} onCancel={onClose} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
