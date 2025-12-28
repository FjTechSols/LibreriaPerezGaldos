import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, FileText, Download } from 'lucide-react';
import { useInvoice } from '../context/InvoiceContext';
import { obtenerPedidoPorId } from '../services/pedidoService';
import { supabase } from '../lib/supabase';
import { generarPDFFactura } from '../utils/pdfGenerator';
import * as settingsService from '../services/settingsService';
import { Factura } from '../types';
import '../styles/pages/PaymentSuccess.css';
import { MessageModal } from '../components/MessageModal'; // Import MessageModal

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pedidoId, paymentIntentId, total } = location.state || {};
  const { createInvoice } = useInvoice();
  
  const [isGenerandoFactura, setIsGenerandoFactura] = useState(false);
  const [facturaId, setFacturaId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'pending' | 'sending' | 'sent' | 'error'>('pending');
  const [finalOrder, setFinalOrder] = useState<any>(null);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ title: '', message: '', type: 'info' });

  const showModal = (title: string, message: string, type: 'info' | 'error' = 'info') => {
    setMessageModalConfig({ title, message, type });
    setShowMessageModal(true);
  };

  useEffect(() => {
    if (!pedidoId) {
      navigate('/');
      return;
    }

    let isCreatingInvoice = false;

    const gestionarPostCompra = async () => {
      if (isCreatingInvoice) return; // Prevent duplicate execution
      
      setIsGenerandoFactura(true);
      isCreatingInvoice = true;
      
      try {
        // 1. Check if invoice already exists for this order
        const { data: existingInvoice, error: searchError } = await supabase
          .from('invoices')
          .select('id, status')
          .eq('order_id', String(pedidoId))
          .maybeSingle();

        if (existingInvoice) {
          setFacturaId(existingInvoice.id);
          setIsGenerandoFactura(false);
          return;
        }

        // 2. Get order details
        const pedido = await obtenerPedidoPorId(pedidoId);
        if (!pedido) {
          console.error('Pedido not found');
          setIsGenerandoFactura(false);
          return;
        }
        setFinalOrder(pedido);

        // 2.5 Get settings for tax rate
        const settings = await settingsService.settingsService.getAllSettings();
        const taxRate = settings?.billing?.taxRate ?? 4; // Default to 4% if not setting found

        // 3. Create invoice with "Pagada" status for web purchases
        
        try {
          const nuevaFactura = await createInvoice({
            customer_name: pedido.cliente?.nombre + ' ' + (pedido.cliente?.apellidos || '') || pedido.usuario?.username || 'Cliente',
            customer_address: pedido.direccion_envio || '',
            customer_nif: pedido.cliente?.nif || '',
            tax_rate: taxRate,
            payment_method: pedido.metodo_pago || 'tarjeta',
            order_id: String(pedidoId),
            items: (pedido.detalles || []).map(detalle => ({
              book_id: String(detalle.libro_id || ''),
              book_title: detalle.libro?.titulo || detalle.nombre_externo || 'Producto',
              quantity: detalle.cantidad,
              unit_price: detalle.precio_unitario,
              line_total: detalle.cantidad * detalle.precio_unitario
            })),
            shipping_cost: pedido.coste_envio || 0,
            language: 'es'
          });

          if (nuevaFactura) {
            // Update invoice status to "Pagada" since payment was successful
            await supabase
              .from('invoices')
              .update({ status: 'Pagada' })
              .eq('id', nuevaFactura.id);
              
            setFacturaId(nuevaFactura.id);
          }
        } catch (invoiceError: any) {
          // Silently handle duplicate invoice (happens in dev mode with React StrictMode)
          if (invoiceError?.code === '23505') {
          } else {
            console.error('❌ Failed to create invoice:', invoiceError);
          }
        }

      } catch (error: any) {
        console.error('Error generando factura post-compra:', error);
      } finally {
        setIsGenerandoFactura(false);
        isCreatingInvoice = false;
      }
    };

    gestionarPostCompra();
  }, [pedidoId, navigate]); // Removed createInvoice from dependencies to prevent re-execution

  const handleDownloadInvoice = async () => {
    try {
        let currentFacturaId = facturaId;

        // If no invoice yet, try to find it
        if (!currentFacturaId) {
            setIsGenerandoFactura(true);
            try {
                const { data: invoice } = await supabase
                  .from('invoices')
                  .select('id')
                  .eq('order_id', String(pedidoId))
                  .maybeSingle();
                
                if (invoice) {
                    currentFacturaId = invoice.id;
                    setFacturaId(invoice.id);
                }
            } catch (findError) {
                console.error('❌ Error buscando factura:', findError);
            } finally {
                setIsGenerandoFactura(false);
            }
        }

        if (currentFacturaId) {
            setIsGenerandoFactura(true);
            
            // Fetch full invoice data with items
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    invoice_items (*)
                `)
                .eq('id', currentFacturaId)
                .single();

            if (invoiceError || !invoice) {
                throw new Error('No se pudo obtener la factura');
            }

            // Convert Invoice to Factura format for PDF generation
            const facturaData: Factura = {
                id: parseInt(invoice.id),
                pedido_id: parseInt(invoice.order_id || '0'),
                numero_factura: invoice.invoice_number,
                fecha: invoice.issue_date,
                subtotal: invoice.subtotal,
                iva: invoice.tax_amount,
                total: invoice.total,
                tipo: 'normal',
                anulada: false,
                pedido: {
                    id: parseInt(invoice.order_id || '0'),
                    cliente: {
                        nombre: invoice.customer_name.split(' ')[0] || '',
                        apellidos: invoice.customer_name.split(' ').slice(1).join(' ') || '',
                        nif: invoice.customer_nif,
                        direccion: invoice.customer_address
                    },
                    detalles: (invoice.invoice_items || []).map((item: any) => ({
                        id: item.id,
                        pedido_id: parseInt(invoice.order_id || '0'),
                        libro_id: parseInt(item.book_id || '0'),
                        cantidad: item.quantity,
                        precio_unitario: item.unit_price,
                        libro: {
                            id: parseInt(item.book_id || '0'),
                            titulo: item.book_title
                        }
                    }))
                } as any
            };

            // Generate PDF
            const settings = await settingsService.settingsService.getAllSettings();
            const pdfBlob = await generarPDFFactura(facturaData, settings || undefined);
            
            // Download PDF
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${invoice.invoice_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pdfUrl);
            
            setIsGenerandoFactura(false);
        } else {
            showModal('Error', 'No se pudo encontrar la factura. Por favor contacte con soporte.', 'error');
        }
    } catch (error: any) {
        console.error('Error downloading invoice:', error);
        setIsGenerandoFactura(false);
        const errorMsg = error?.message || 'Error desconocido';
        showModal('Error al Descargar', `Error al descargar la factura:\n${errorMsg}\n\nPor favor contacte con soporte.`, 'error');
    }
  };

  return (
    <div className="payment-success-container">
      <div className="success-card">
        <div className="success-icon">
          <CheckCircle size={64} />
        </div>

        <h1>¡Pago Completado!</h1>
        <p className="success-message">
          Tu pedido ha sido procesado correctamente y lo recibirás pronto.
        </p>

        <div className="order-details">
          <div className="detail-item">
            <span className="label">Número de Pedido:</span>
            <span className="value">#{pedidoId}</span>
          </div>
          <div className="detail-item">
            <span className="label">ID de Transacción:</span>
            <span className="value">{paymentIntentId?.substring(0, 20)}...</span>
          </div>
          <div className="detail-item">
            <span className="label">Total Pagado:</span>
            <span className="value total">€{(finalOrder?.total || total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="success-info">
          <Package size={24} />
          <div>
            <h3>¿Qué sigue?</h3>
            <p>Hemos enviado un email de confirmación con los detalles de tu pedido.</p>
            {emailStatus === 'sent' && <p className="text-sm text-green-600">✓ Factura enviada por correo</p>}
            {emailStatus === 'error' && <p className="text-sm text-yellow-600">⚠ No pudimos enviar el email, por favor descarga tu factura abajo.</p>}
          </div>
        </div>

        {/* Invoice Download Action - Visible Always for Pedido */}
        <div className="invoice-action" style={{ margin: '0 0 24px 0', textAlign: 'center' }}>
             <button 
                onClick={handleDownloadInvoice}
                disabled={isGenerandoFactura}
                className="btn-secondary flex items-center justify-center gap-2 mx-auto w-full sm:w-auto"
                style={{ borderColor: '#2563eb', color: '#2563eb' }} // Ensure visibility logic
            >
                {isGenerandoFactura ? (
                    <span>Generando PDF...</span>
                ) : (
                    <>
                        <FileText size={18} />
                        <span>Descargar Factura</span>
                        <Download size={16} />
                    </>
                )}
            </button>
        </div>

        <div className="success-actions">
          <button
            onClick={() => navigate('/mi-cuenta', { state: { section: 'orders' } })}
            className="btn-primary"
          >
            Ver Mis Pedidos
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/catalogo')}
            className="btn-secondary"
          >
            Seguir Comprando
          </button>
        </div>
      </div>


      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type}
      />
    </div>
  );
}
