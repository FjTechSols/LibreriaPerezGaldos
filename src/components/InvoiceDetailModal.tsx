import React from 'react';
import { Invoice } from '../types';
import { X, Download } from 'lucide-react';
import '../styles/components/InvoiceDetailModal.css';

const COMPANY_INFO = {
  name: 'Perez Galdos S.L.',
  address: 'Calle Hortaleza 5, 28004 Madrid, España',
  phone: '+34 91 531 26 40',
  email: 'libreria@perezgaldos.com',
  taxId: 'B12345678',
  logo: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=200'
};

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (invoice: Invoice) => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onDownloadPDF
}) => {
  if (!isOpen || !invoice) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusClass = (status: Invoice['status']) => {
    switch (status) {
      case 'Pagada':
        return 'status-paid';
      case 'Pendiente':
        return 'status-pending';
      case 'Anulada':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="invoice-detail-overlay" onClick={onClose}>
      <div className="invoice-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-detail-header">
          <h2>Detalle de factura</h2>
          <div className="header-actions">
            <button
              className="btn-download-detail"
              onClick={() => onDownloadPDF(invoice)}
              title="Descargar PDF"
            >
              <Download size={18} />
              Descargar PDF
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="invoice-detail-body">
          <div className="invoice-preview">
            <div className="company-header">
              {COMPANY_INFO.logo && (
                <img src={COMPANY_INFO.logo} alt="Logo" className="company-logo" />
              )}
              <div className="company-info">
                <h3>{COMPANY_INFO.name}</h3>
                <p>{COMPANY_INFO.address}</p>
                <p>NIF: {COMPANY_INFO.taxId}</p>
                <p>Tel: {COMPANY_INFO.phone}</p>
                <p>Email: {COMPANY_INFO.email}</p>
              </div>
            </div>

            <div className="invoice-header-info">
              <div>
                <h2>FACTURA</h2>
                <p className="invoice-number-large">{invoice.invoice_number}</p>
                <p className={`status-badge-large ${getStatusClass(invoice.status)}`}>
                  {invoice.status}
                </p>
              </div>
              <div className="invoice-dates">
                <p><strong>Fecha de emisión:</strong> {formatDate(invoice.issue_date)}</p>
              </div>
            </div>

            <div className="customer-info">
              <h4>Facturar a:</h4>
              <p><strong>{invoice.customer_name}</strong></p>
              <p>{invoice.customer_address}</p>
              <p>NIF: {invoice.customer_nif}</p>
            </div>

            <div className="invoice-items">
              <table className="detail-items-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.book_title}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-totals">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="totals-row">
                <span>IVA ({invoice.tax_rate}%):</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="totals-row total">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            {invoice.payment_method && (
              <div className="payment-info">
                <p><strong>Método de pago:</strong> {invoice.payment_method}</p>
              </div>
            )}

            <div className="invoice-footer">
              <p>Gracias por su compra</p>
              <p className="footer-note">
                Esta factura ha sido generada electrónicamente y es válida sin firma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
