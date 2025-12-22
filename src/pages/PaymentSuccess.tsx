import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, FileText, Download } from 'lucide-react';
import { crearFactura, descargarFacturaPDF, obtenerFacturas } from '../services/facturaService';
import { sendInvoiceEmail } from '../services/emailService';
import '../styles/pages/PaymentSuccess.css';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pedidoId, paymentIntentId, total } = location.state || {};
  
  const [isGenerandoFactura, setIsGenerandoFactura] = useState(false);
  const [facturaId, setFacturaId] = useState<number | null>(null);
  const [emailStatus, setEmailStatus] = useState<'pending' | 'sending' | 'sent' | 'error'>('pending');

  useEffect(() => {
    if (!pedidoId) {
      navigate('/');
      return;
    }

    const gestionarPostCompra = async () => {
      setIsGenerandoFactura(true);
      try {
        // 1. Verify if invoice already exists
        const facturasExistentes = await obtenerFacturas({ tipo: 'normal' }); 
        // Note: obtenerFacturas filter logic is basic, ideally we check by pedido_id explicitly if API supports it
        // Since obtenerFacturas doesn't filter by pedido_id directly in the visible signature, 
        // we might rely on try/create or fetching all (inefficient) or adding a filter.
        // For efficiency, let's just try to create and rely on uniqueness or idempotency logic if possible, 
        // OR better: search carefully. 
        // Actually, let's implement a check:
        const buscarFactura = facturasExistentes.find(f => f.pedido_id === pedidoId && !f.anulada);

        let activeFacturaId = buscarFactura?.id;

        if (!activeFacturaId) {
            // 2. Create Invoice
            const nuevaFactura = await crearFactura({
                pedido_id: pedidoId,
                tipo: 'normal'
            });
            activeFacturaId = nuevaFactura?.id;
        }

        if (activeFacturaId) {
            setFacturaId(activeFacturaId);
            
            // 3. Send Email
            if (emailStatus === 'pending') {
                setEmailStatus('sending');
                const emailResult = await sendInvoiceEmail(activeFacturaId);
                setEmailStatus(emailResult.success ? 'sent' : 'error');
            }
        }

      } catch (error) {
        console.error('Error generando factura post-compra:', error);
      } finally {
        setIsGenerandoFactura(false);
      }
    };

    gestionarPostCompra();
  }, [pedidoId, navigate]);

  const handleDownloadInvoice = async () => {
    if (facturaId) {
        await descargarFacturaPDF(facturaId);
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
            <span className="value total">€{total?.toFixed(2)}</span>
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

        {/* Invoice Download Action */}
        <div className="invoice-action" style={{ margin: '20px 0', textAlign: 'center' }}>
            {facturaId ? (
                <button 
                    onClick={handleDownloadInvoice}
                    className="btn-outline flex items-center justify-center gap-2 mx-auto"
                    style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: '6px', background: '#f9fafb' }}
                >
                    <FileText size={18} />
                    <span>Descargar Factura</span>
                    <Download size={16} />
                </button>
            ) : isGenerandoFactura ? (
                <p className="text-sm text-gray-500">Generando factura...</p>
            ) : null}
        </div>

        <div className="success-actions">
          <button
            onClick={() => navigate('/dashboard')}
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
    </div>
  );
}
