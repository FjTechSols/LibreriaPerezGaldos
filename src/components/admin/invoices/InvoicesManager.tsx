import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useInvoice } from '../../../context/InvoiceContext';
import { useSettings } from '../../../context/SettingsContext';
import { useTheme } from '../../../context/ThemeContext';
import { Invoice, InvoiceFormData } from '../../../types';
import InvoiceTable from './InvoiceTable';
import InvoiceModal from './InvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import GenerarFacturaModal from '../orders/GenerarFacturaDesdeped';
import DownloadInvoiceModal from './DownloadInvoiceModal';
import { MessageModal } from '../../MessageModal';

export function InvoicesManager() {
  const { invoices, loading, createInvoice, updateInvoiceStatus } = useInvoice();
  const { formatPrice, settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false); // Manual Invoice Form
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGenerarFacturaModalOpen, setIsGenerarFacturaModalOpen] = useState(false); // Choice/Orders
  
  // Download Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [invoiceToDownload, setInvoiceToDownload] = useState<Invoice | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus] = useState('');
  const [filterCustomer] = useState('');
  const [filterDateFrom] = useState('');
  const [filterDateTo] = useState('');

  // MessageModal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  // Handlers
  const handleCreateInvoice = async (formData: InvoiceFormData) => {
    const result = await createInvoice(formData);
    if (result) {
      setInvoiceToDownload(result);
      setIsDownloadModalOpen(true); // Offer download after create
      setIsInvoiceModalOpen(false);
    }
  };

  const handleChangeInvoiceStatus = async (id: string, status: Invoice['status']) => {
    await updateInvoiceStatus(id, status);
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalOpen(true);
  };

  const generatePDF = async (invoice: Invoice, language: 'es' | 'en' = 'es') => {
      // Logic copied from AdminDashboard.tsx
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        // Assuming settings are available via context or passed. 
        // We need settings.company for header. 
        // We used useSettings() hook above.
        // Wait, I need to make sure settings is loaded.
        
        const company = settings?.company || {
            name: 'Librería', 
            address: '', 
            taxId: '', 
            phone: '', 
            email: '',
            logo: ''
        };

        const lang = language;
        const t = {
          es: { title: 'FACTURA', date: 'Fecha', status: 'Estado', billTo: 'FACTURAR A:', nif: 'NIF', description: 'Descripción', qty: 'Cant.', unitPrice: 'Precio Unit.', total: 'Total', subtotal: 'Subtotal', tax: 'IVA', totalUpper: 'TOTAL' },
          en: { title: 'INVOICE', date: 'Date', status: 'Status', billTo: 'BILL TO:', nif: 'VAT ID', description: 'Description', qty: 'Qty', unitPrice: 'Unit Price', total: 'Total', subtotal: 'Subtotal', tax: 'VAT', totalUpper: 'TOTAL' }
        }[lang];
  
        // Add logo if available
        if (company.logo) {
          try {
            doc.addImage(company.logo, 'PNG', 15, 10, 25, 25);
          } catch (error) {
            console.error('Error adding logo to PDF:', error);
          }
        }

        doc.setFontSize(20);
        doc.text(t.title, 105, 20, { align: 'center' });
  
        doc.setFontSize(10);
        doc.text(company.name, 20, 40);
        doc.text(company.address, 20, 45);
        doc.text(`${t.nif}: ${company.taxId}`, 20, 50);
        doc.text(`Tel: ${company.phone}`, 20, 55);
        doc.text(`Email: ${company.email}`, 20, 60);
  
        doc.setFontSize(12);
        doc.text(`N° ${invoice.invoice_number}`, 150, 40);
        doc.setFontSize(10);
        doc.text(`${t.date}: ${new Date(invoice.issue_date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES')}`, 150, 45);
        doc.text(`${t.status}: ${invoice.status}`, 150, 50);
  
        doc.text(t.billTo, 20, 75);
        doc.text(invoice.customer_name, 20, 80);
        doc.text(invoice.customer_address, 20, 85);
        doc.text(`${t.nif}: ${invoice.customer_nif}`, 20, 90);
  
        let y = 105;
        doc.setFontSize(10);
        doc.text(t.description, 20, y);
        doc.text(t.qty, 100, y);
        doc.text(t.unitPrice, 125, y);
        doc.text(t.total, 170, y);
        doc.line(20, y + 2, 190, y + 2);
  
        y += 8;
        if (invoice.items) {
          invoice.items.forEach(item => {
            doc.text(item.book_title, 20, y);
            doc.text(item.quantity.toString(), 100, y);
            doc.text(`${(item.unit_price || 0).toFixed(2)} €`, 125, y);
            doc.text(`${(item.line_total || 0).toFixed(2)} €`, 170, y);
            y += 7;
          });
        }
  
        y += 10;
        doc.text(`${t.subtotal}: ${(invoice.subtotal || 0).toFixed(2)} €`, 150, y);
        y += 7;
        if ((invoice.tax_rate || 0) > 0) {
            doc.text(`${t.tax} (${invoice.tax_rate}%): ${(invoice.tax_amount || 0).toFixed(2)} €`, 150, y);
            y += 7;
        }
        
        doc.setFontSize(12);
        doc.text(`${t.totalUpper}: ${(invoice.total || 0).toFixed(2)} €`, 150, y);
  
        doc.save(`${t.title}-${invoice.invoice_number}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        showModal('Error', 'Error al generar el PDF', 'error');
      }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    setInvoiceToDownload(invoice);
    setIsDownloadModalOpen(true);
  };

  const handleConfirmDownload = (language: 'es' | 'en') => {
    if (invoiceToDownload) {
      generatePDF(invoiceToDownload, language);
      setIsDownloadModalOpen(false);
      setInvoiceToDownload(null);
    }
  };

  // Stats
  const stats = {
    total: invoices.length,
    pendientes: invoices.filter(i => i.status === 'Pendiente').length,
    pagadas: invoices.filter(i => i.status === 'Pagada').length,
    anuladas: invoices.filter(i => i.status === 'Anulada').length,
    totalFacturado: invoices
       .filter(i => i.status !== 'Anulada')
       .reduce((sum, invoice) => sum + (invoice.total || 0), 0)
  };

  return (
    <div className="invoices-manager">
      <div className="content-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 className="content-title">Gestión de Facturas</h2>
            <p className="content-subtitle">Gestión de facturas y contabilidad</p>
          </div>
          <button
              onClick={() => setIsGenerarFacturaModalOpen(true)}
              className="action-btn primary"
            >
              <Plus size={20} />
              Nueva Factura
            </button>
      </div>

       <div className="invoice-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ 
            background: isDark ? '#1e293b' : '#f8fafc', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            color: isDark ? '#f1f5f9' : 'inherit'
          }}>
            <span className="block text-sm mb-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Total Facturas</span>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <div className="stat-card" style={{ 
            background: isDark ? 'rgba(217, 119, 6, 0.1)' : '#fffbeb', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: isDark ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid #fcd34d',
            color: isDark ? '#fbbf24' : '#b45309'
          }}>
            <span className="block text-sm mb-1" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>Pendientes</span>
            <span className="text-2xl font-bold">{stats.pendientes}</span>
          </div>
          <div className="stat-card" style={{ 
            background: isDark ? 'rgba(5, 150, 105, 0.1)' : '#f0fdf4', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: isDark ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid #86efac',
            color: isDark ? '#34d399' : '#15803d'
          }}>
            <span className="block text-sm mb-1" style={{ color: isDark ? '#34d399' : '#15803d' }}>Pagadas</span>
            <span className="text-2xl font-bold">{stats.pagadas}</span>
          </div>
          {/* Amount */}
          <div className="stat-card" style={{ 
            background: isDark ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: isDark ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid #93c5fd',
            color: isDark ? '#60a5fa' : '#1d4ed8'
          }}>
            <span className="block text-sm mb-1" style={{ color: isDark ? '#60a5fa' : '#1d4ed8' }}>Total Facturado</span>
            <span className="text-2xl font-bold">{formatPrice(stats.totalFacturado)}</span>
          </div>
       </div>

       {/* Search Bar specific to Invoices */}
       <div className="admin-search mb-4" style={{ position: 'relative' }}>
          <Search className="admin-search-icon" size={20} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar facturas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
       </div>

       <InvoiceTable
          invoices={invoices}
          loading={loading}
          onViewDetails={handleViewInvoiceDetails}
          onDownloadPDF={handleDownloadPDF}
          onChangeStatus={handleChangeInvoiceStatus}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterCustomer={filterCustomer}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
       />

       {/* Modals */}
       <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSubmit={handleCreateInvoice}
          loading={loading}
       />

       <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedInvoice(null);
          }}
          onDownloadPDF={handleDownloadPDF}
       />

       <GenerarFacturaModal
          isOpen={isGenerarFacturaModalOpen}
          onClose={() => setIsGenerarFacturaModalOpen(false)}
          onSuccess={() => setIsGenerarFacturaModalOpen(false)}
          onOpenManualInvoice={() => {
            setIsGenerarFacturaModalOpen(false);
            setIsInvoiceModalOpen(true);
          }}
       />

       <DownloadInvoiceModal 
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          onDownload={handleConfirmDownload}
          invoiceNumber={invoiceToDownload?.invoice_number || ''}
        />

        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          title={messageModalConfig.title}
          message={messageModalConfig.message}
          type={messageModalConfig.type as any}
        />
     </div>
  );
}
