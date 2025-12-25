import React, { useState } from 'react';
import { TableLoader } from '../../Loader';
import { Pagination } from '../../Pagination';
import { Invoice } from '../../../types';
import { Download, Eye, CreditCard as Edit } from 'lucide-react';
import '../../../styles/components/InvoiceTable.css';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCustomer, filterDateFrom, filterDateTo]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

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

  const getProcedenciaLabel = (invoice: any) => {
    // If no order_id, it's a manually created invoice
    if (!invoice.order_id) return 'Manual';
    
    // If has order_id but no pedido data (not found), show the order_id
    if (!invoice.pedido) return `Pedido #${invoice.order_id}`;
    
    // If has pedido but no tipo, show 'Sin tipo'
    const tipo = invoice.pedido.tipo;
    if (!tipo) return 'Sin tipo';
    
    // Map tipo to readable label
    switch (tipo.toLowerCase()) {
      case 'interno': return 'Interno';
      case 'perez_galdos': return 'Pérez Galdós';
      case 'galeon': return 'Galeón';
      case 'uniliber': return 'Uniliber';
      case 'iberlibro': return 'Iberlibro';
      case 'todocoleccion': return 'Todocolección';
      case 'wallapop': return 'Wallapop';
      default: return tipo;
    }
  };

  return (
    <div className="contenedor-tabla-facturas">
      {loading ? (
        <TableLoader text="Cargando facturas..." />
      ) : (
        <>
          {filteredInvoices.length === 0 ? (
            <div className="sin-facturas">
              <p>No se encontraron facturas{invoices.length === 0 ? '' : ' con los filtros aplicados'}</p>
            </div>
          ) : (
            <>
              <table className="tabla-facturas">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Procedencia</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="numero-factura">{invoice.invoice_number}</td>
                      <td className="cliente-factura">{invoice.customer_name}</td>
                      <td className="fecha-factura">{formatDate(invoice.issue_date)}</td>
                      <td className="procedencia-factura">
                        <span className="text-sm font-medium text-gray-600">
                          {getProcedenciaLabel(invoice)}
                        </span>
                      </td>
                      <td>
                        <div className="celda-estado">
                          <span className={`badge-estado ${getStatusClass(invoice.status)}`}>
                            {invoice.status}
                          </span>
                          {invoice.status === 'Pendiente' && (
                            <div className="acciones-estado">
                              <button
                                className={`btn-cambiar-estado ${selectedInvoice === invoice.id ? 'activo' : ''}`}
                                onClick={() => setSelectedInvoice(
                                  selectedInvoice === invoice.id ? null : invoice.id
                                )}
                              >
                                <Edit size={14} />
                              </button>
                              {selectedInvoice === invoice.id && (
                                <div className="dropdown-estado">
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
                      <td className="monto-total">{formatCurrency(invoice.total)}</td>
                      <td>
                        <div className="botones-accion">
                          <button
                            className="btn-accion btn-ver"
                            onClick={() => onViewDetails(invoice)}
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="btn-accion btn-descargar"
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

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredInvoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                showItemsPerPageSelector={true}
                itemsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default InvoiceTable;
