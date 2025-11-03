import React, { useState } from 'react';
import { Invoice } from '../types';
import { Download, Eye, CreditCard as Edit } from 'lucide-react';
import '../styles/components/InvoiceTable.css';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onViewDetails: (invoice: Invoice) => void;
  onDownloadPDF: (invoice: Invoice) => void;
  onChangeStatus: (id: string, status: Invoice['status']) => void;
  searchTerm: string;
  filterStatus: string;
  filterCustomer: string;
  filterDateFrom: string;
  filterDateTo: string;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  loading = false,
  onViewDetails,
  onDownloadPDF,
  onChangeStatus,
  searchTerm,
  filterStatus,
  filterCustomer,
  filterDateFrom,
  filterDateTo
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === '' || invoice.status === filterStatus;

    const matchesCustomer = filterCustomer === '' ||
                           invoice.customer_name.toLowerCase().includes(filterCustomer.toLowerCase());

    const invoiceDate = new Date(invoice.issue_date).toISOString().split('T')[0];
    const matchesDateFrom = filterDateFrom === '' || invoiceDate >= filterDateFrom;
    const matchesDateTo = filterDateTo === '' || invoiceDate <= filterDateTo;

    return matchesSearch && matchesStatus && matchesCustomer && matchesDateFrom && matchesDateTo;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
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

  const handleStatusChange = (invoiceId: string, newStatus: string) => {
    onChangeStatus(invoiceId, newStatus as Invoice['status']);
    setSelectedInvoice(null);
  };

  return (
    <div className="invoice-table-container">
      {loading ? (
        <div className="loading-state">
          <p>Cargando facturas...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="no-invoices">
          <p>No se encontraron facturas{invoices.length === 0 ? '' : ' con los filtros aplicados'}</p>
        </div>
      ) : (
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="invoice-number">{invoice.invoice_number}</td>
                <td>{invoice.customer_name}</td>
                <td>{formatDate(invoice.issue_date)}</td>
                <td>
                  <div className="status-cell">
                    <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                      {invoice.status}
                    </span>
                    {invoice.status === 'Pendiente' && (
                      <div className="status-actions">
                        <button
                          className="status-change-btn"
                          onClick={() => setSelectedInvoice(
                            selectedInvoice === invoice.id ? null : invoice.id
                          )}
                        >
                          <Edit size={14} />
                        </button>
                        {selectedInvoice === invoice.id && (
                          <div className="status-dropdown">
                            <button onClick={() => handleStatusChange(invoice.id, 'Pagada')}>
                              Marcar como Pagada
                            </button>
                            <button onClick={() => handleStatusChange(invoice.id, 'Anulada')}>
                              Anular
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="total-amount">{formatCurrency(invoice.total)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn view-btn"
                      onClick={() => onViewDetails(invoice)}
                      title="Ver detalle"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="action-btn download-btn"
                      onClick={() => onDownloadPDF(invoice)}
                      title="Descargar PDF"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InvoiceTable;
