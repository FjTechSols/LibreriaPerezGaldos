import { useState, useEffect } from 'react';
import { FileText, Download, X as XIcon, AlertCircle, Eye, Plus } from 'lucide-react';
import { useInvoice } from '../context/InvoiceContext';
import '../styles/components/FacturaList.css';

interface FacturaListProps {
  onSelectFactura?: (invoice: any) => void;
  onCrearFactura?: () => void;
}

export default function FacturaList({ onSelectFactura, onCrearFactura }: FacturaListProps) {
  const { invoices, loading: contextLoading, downloadInvoicePDF } = useInvoice();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Paid' | 'Pending' | 'Cancelled'>('all');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');

  useEffect(() => {
    setLoading(contextLoading);
  }, [contextLoading]);

  const handleDescargarPDF = async (invoiceId: string) => {
    await downloadInvoicePDF(invoiceId);
  };

  const invoicesFiltradas = invoices.filter(invoice => {
    const matchSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'all' || invoice.status === filterStatus;

    const matchFechaDesde = !filterFechaDesde ||
                           (invoice.issue_date && new Date(invoice.issue_date) >= new Date(filterFechaDesde));

    const matchFechaHasta = !filterFechaHasta ||
                           (invoice.issue_date && new Date(invoice.issue_date) <= new Date(filterFechaHasta));

    return matchSearch && matchStatus && matchFechaDesde && matchFechaHasta;
  });

  // Calculate stats
  const stats = {
    totalFacturas: invoices.length,
    totalFacturado: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
    totalPendiente: invoices.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + (inv.total || 0), 0)
  };

  if (loading) {
    return <div className="factura-loading">Cargando facturas...</div>;
  }

  return (
    <div className="factura-list-container">
      <div className="factura-header">
        <div className="factura-stats">
          <div className="stat-card">
            <span className="stat-label">Total Facturas</span>
            <span className="stat-value">{stats.totalFacturas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Facturado</span>
            <span className="stat-value">{stats.totalFacturado.toFixed(2)} €</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pendiente</span>
            <span className="stat-value">{stats.totalPendiente.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className="factura-filters">
        <input
          type="text"
          placeholder="Buscar por número o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="filter-select"
        >
          <option value="all">Todos los estados</option>
          <option value="Paid">Pagadas</option>
          <option value="Pending">Pendientes</option>
          <option value="Cancelled">Canceladas</option>
        </select>

        <input
          type="date"
          value={filterFechaDesde}
          onChange={(e) => setFilterFechaDesde(e.target.value)}
          className="filter-date"
          placeholder="Desde"
        />

        <input
          type="date"
          value={filterFechaHasta}
          onChange={(e) => setFilterFechaHasta(e.target.value)}
          className="filter-date"
          placeholder="Hasta"
        />

        {onCrearFactura && (
          <button onClick={onCrearFactura} className="btn-crear-factura">
            <Plus size={16} />
            Facturar Pedido
          </button>
        )}
      </div>

      <div className="factura-table">
        <div className="table-header">
          <span>Número</span>
          <span>Cliente</span>
          <span>Fecha</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {invoicesFiltradas.map(invoice => (
          <div
            key={invoice.id}
            className={`table-row ${invoice.status === 'Cancelled' ? 'anulada' : ''}`}
            onClick={() => onSelectFactura?.(invoice)}
          >
            <span className="numero">{invoice.invoice_number}</span>
            <span className="cliente">{invoice.customer_name}</span>
            <span className="fecha">
              {invoice.issue_date
                ? new Date(invoice.issue_date).toLocaleDateString('es-ES')
                : '-'}
            </span>
            <span className="total">{invoice.total?.toFixed(2) || '0.00'} €</span>
            <span className={`estado ${invoice.status?.toLowerCase()}`}>
              {invoice.status === 'Paid' && 'Pagada'}
              {invoice.status === 'Pending' && 'Pendiente'}
              {invoice.status === 'Cancelled' && 'Cancelada'}
            </span>
            <div className="acciones">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDescargarPDF(invoice.id);
                }}
                className="btn-accion"
                title="Descargar PDF"
              >
                <Download size={16} />
              </button>
              {onSelectFactura && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFactura(invoice);
                  }}
                  className="btn-accion"
                  title="Ver detalles"
                >
                  <Eye size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        {invoicesFiltradas.length === 0 && (
          <div className="no-facturas">
            <AlertCircle size={48} />
            <p>No se encontraron facturas</p>
          </div>
        )}
      </div>
    </div>
  );
}
