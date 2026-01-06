import { useState } from 'react';
import { X, Package, User, MapPin, Truck, CreditCard, FileText, Calendar, CreditCard as Edit, Printer, Save, Check, XCircle, Hash } from 'lucide-react';
import { Pedido, EstadoPedido } from '../../../types';
import { actualizarEstadoPedido, actualizarPedido } from '../../../services/pedidoService';
import { sendPaymentReadyEmail } from '../../../services/emailService';
import { useSettings } from '../../../context/SettingsContext';
import { useInvoice } from '../../../context/InvoiceContext';
import '../../../styles/components/PedidoDetalle.css';
import { MessageModal } from '../../MessageModal';
import { RejectionModal } from './RejectionModal';

interface PedidoDetalleProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEditar?: () => void;
}

const ESTADOS: EstadoPedido[] = ['pending_verification', 'payment_pending', 'pendiente', 'procesando', 'enviado', 'completado', 'cancelado', 'devolucion'];

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pending_verification: 'Por Verificar',
  payment_pending: 'Pendiente Pago',
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  completado: 'Completado',
  cancelado: 'Cancelado',
  devolucion: 'Devolución'
};

export default function PedidoDetalle({ pedido, isOpen, onClose, onRefresh, onEditar }: PedidoDetalleProps) {
  const { settings } = useSettings();
  const { createInvoice } = useInvoice();
  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [generandoAlbaran, setGenerandoAlbaran] = useState(false);

  // State for shipping info editing
  const [editingShipping, setEditingShipping] = useState(false);
  const [transportista, setTransportista] = useState(pedido?.transportista || '');
  const [tracking, setTracking] = useState(pedido?.tracking || '');

  // State for rejection modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ title: '', message: '', type: 'info' });

  if (!isOpen || !pedido) return null;

  const handleCambiarEstado = async (nuevoEstado: EstadoPedido) => {
    const result = await actualizarEstadoPedido(pedido.id, nuevoEstado);

    if (result.success) {
      setMessageModalConfig({
        title: 'Estado Actualizado',
        message: 'El estado del pedido se ha actualizado correctamente.',
        type: 'info'
      });
      setShowMessageModal(true);
      onRefresh();
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: result.error || 'Hubo un error al actualizar el estado del pedido.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  const handleActualizarEnvio = async () => {
    if (!pedido) return;

    const success = await actualizarPedido(pedido.id, {
      transportista: transportista as any,
      tracking: tracking || undefined
    });

    if (success) {
      setMessageModalConfig({
        title: 'Envío Actualizado',
        message: 'La información de envío se ha actualizado correctamente.',
        type: 'info'
      });
      setShowMessageModal(true);
      setEditingShipping(false);
      onRefresh();
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: 'Hubo un error al actualizar la información de envío.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  const handleConfirmarStock = async () => {
    const result = await actualizarEstadoPedido(pedido.id, 'payment_pending');
    if (result.success) {
      // Send payment ready email
      if (pedido.usuario?.email) {
        const paymentUrl = `${window.location.origin}/stripe-checkout?orderId=${pedido.id}`;
        const emailResult = await sendPaymentReadyEmail(
          pedido.id.toString(),
          pedido.usuario.email,
          pedido.usuario.nombre_completo || pedido.usuario.username || 'Cliente',
          pedido.total || 0,
          paymentUrl
        );
        
        if (emailResult.success) {
          setMessageModalConfig({
            title: 'Stock Confirmado',
            message: 'El pedido ha sido confirmado y se ha enviado un email al cliente para que realice el pago.',
            type: 'info'
          });
        } else {
          setMessageModalConfig({
            title: 'Stock Confirmado',
            message: 'El pedido ha sido confirmado, pero hubo un error al enviar el email. Por favor, contacte al cliente manualmente.',
            type: 'info'
          });
        }
      } else {
        setMessageModalConfig({
          title: 'Stock Confirmado',
          message: 'El pedido ha sido confirmado y movido a Pendiente de Pago.',
          type: 'info'
        });
      }
      setShowMessageModal(true);
      onRefresh();
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: result.error || 'Error al confirmar stock.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  const handleRechazarPedido = async (_reason: string) => {
    const result = await actualizarEstadoPedido(pedido.id, 'cancelado');
    
    if (result.success) {
      setRejectionModalOpen(false);
      setMessageModalConfig({
        title: 'Pedido Rechazado',
        message: 'El pedido ha sido rechazado y cancelado.',
        type: 'info'
      });
      setShowMessageModal(true);
      onRefresh();
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: result.error || 'Error al rechazar pedido.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  // Lógica híbrida para totales:
  // 1. Calculamos el total teórico sumando los precios de los ítems (que incluyen impuestos).
  const calcularTotalBruto = () => {
    if (!pedido?.detalles) return 0;
    return pedido.detalles.reduce((sum, detalle) => {
      // Precio unitario ya incluye IVA en el nuevo sistema
      return sum + (detalle.cantidad * detalle.precio_unitario);
    }, 0);
  };

  const totalItems = calcularTotalBruto();
  
  // 2. Verificamos si el pedido tiene totales guardados válidos
  const tieneValoresGuardados = pedido?.total !== undefined && pedido.total > 0;

  // 3. Comprobamos si el total guardado coincide con la suma de ítems para detectar si es pedido "nuevo" (IVA incluido)
  const totalGuardado = pedido?.total || 0;
  const diferencia = tieneValoresGuardados ? Math.abs(totalGuardado - totalItems) : 999;
  const esPedidoConIvaIncluido = diferencia < 0.05; // 5 céntimos de margen

  let total, subtotal, iva, taxRateApplied;

  if (esPedidoConIvaIncluido && tieneValoresGuardados) {
    // Caso: Pedido histórico válido (IVA Incluido). Respetamos los valores guardados.
    total = totalGuardado;
    // Usamos el subtotal guardado, o lo derivamos si falta
    subtotal = pedido?.subtotal !== undefined ? pedido.subtotal : (total / (1 + (settings.billing.taxRate / 100)));
    // Usamos el iva guardado, o lo derivamos
    iva = pedido?.iva !== undefined ? pedido.iva : (total - subtotal);
    
    // Calculamos la tasa real basada en los valores guardados
    const rawRate = subtotal > 0 ? Math.round((iva / subtotal) * 100) : settings.billing.taxRate;
    
    // FIX: Si detectamos que el pedido se guardó con el default de 21% (error común) pero la configuración actual es diferente (ej. 4%),
    // forzamos el uso de la tasa configurada para que la factura salga correcta.
    taxRateApplied = (rawRate === 21 && Number(settings.billing.taxRate) !== 21) ? Number(settings.billing.taxRate) : rawRate;
  } else {
    // Caso: Pedido antiguo (IVA Sumado) o sin datos. Recalculamos con la configuración ACTUAL.
    total = totalItems;
    const currentTaxRateDecimal = settings.billing.taxRate / 100;
    subtotal = total / (1 + currentTaxRateDecimal);
    iva = total - subtotal;
    taxRateApplied = settings.billing.taxRate;
  }

  const handleGenerarFactura = async () => {
    if (!pedido.detalles || pedido.detalles.length === 0) {
      setMessageModalConfig({
        title: 'Error',
        message: 'El pedido no tiene detalles para facturar.',
        type: 'error'
      });
      setShowMessageModal(true);
      return;
    }

    setGenerandoFactura(true);

    try {
      // Map Pedido details to InvoiceItems
      const items = pedido.detalles.map(d => ({
          book_id: d.libro_id.toString(),
          book_title: d.libro?.titulo || d.nombre_externo || 'Producto',
          quantity: d.cantidad,
          unit_price: d.precio_unitario,
          line_total: d.cantidad * d.precio_unitario
      }));

      // Map Pedido to InvoiceFormData
      // Use client info or user info or defaults
      const customerName = pedido.cliente 
          ? `${pedido.cliente.nombre} ${pedido.cliente.apellidos}`.trim() 
          : pedido.usuario?.username || 'Cliente General';
          
      const customerAddress = pedido.direccion_envio || pedido.cliente?.direccion || '';
      const customerNif = pedido.cliente?.nif || '';
      

      
      const formData = {
          customer_name: customerName,
          customer_address: customerAddress,
          customer_nif: customerNif,
          tax_rate: taxRateApplied, // Usamos la tasa que se aplicó al pedido (histórica o actual)
          payment_method: pedido.metodo_pago,
          order_id: pedido.id.toString(),
          items: items,
          shipping_cost: pedido.coste_envio || 0, // Usamos el coste de envío real del pedido
          language: 'es' as 'es' | 'en'
      };

      const invoice = await createInvoice(formData);

      if (invoice) {
        setMessageModalConfig({
          title: 'Factura Generada',
          message: `Factura ${invoice.invoice_number} generada correctamente.`,
          type: 'info'
        });
        setShowMessageModal(true);
        onRefresh();
      } else {
        setMessageModalConfig({
          title: 'Error',
          message: 'Error al generar la factura.',
          type: 'error'
        });
        setShowMessageModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessageModalConfig({
        title: 'Error',
        message: 'Error al generar la factura.',
        type: 'error'
      });
      setShowMessageModal(true);
    } finally {
      setGenerandoFactura(false);
    }
  };

  const handleGenerarAlbaran = async () => {
    setGenerandoAlbaran(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Extract details from observations if possible (Heuristic)
      let abeBooksId = '';
      let estimatedDelivery = '7 - 20 días laborables';

      if (pedido.observaciones) {
        const obs = pedido.observaciones;
        const abebooksMatch = obs.match(/(?:AbeBooks|Pedido AbeBooks|External ID)[:\s]+(\d+)/i);
        if (abebooksMatch) abeBooksId = abebooksMatch[1];
      }

      // If not found in observations, try to look at legacy_id if typical length?
      // Or just leave empty if not found.
      if (!abeBooksId && pedido.legacy_id) abeBooksId = pedido.legacy_id.toString();

      // Recipient Info
      const recipientName = pedido.cliente 
        ? `${pedido.cliente.nombre} ${pedido.cliente.apellidos}` 
        : pedido.usuario?.username || 'Cliente';
      
      const direccion = pedido.direccion_envio || pedido.cliente?.direccion || '';
      
      // Parse multi-line address from single string if it contains commas or newlines
      const addressLines = direccion.split(/[\n,]/).map(l => l.trim()).filter(l => l);

      // Layout Constants
      const leftMargin = 20;
      let y = 30;

      doc.setFontSize(11);
      doc.text('Para:', leftMargin, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text(recipientName, leftMargin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      
      addressLines.forEach(line => {
        doc.text(line, leftMargin, y);
        y += 5;
      });
      
      if (pedido.cliente?.telefono) {
          doc.text(`Phone: ${pedido.cliente.telefono}`, leftMargin, y);
          y += 5;
      }

      // Ensure some spacing before the title
      y = Math.max(y + 10, 80);

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Albarán de Envío', leftMargin, y);
      y += 10;

      // Order Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Phone again if strictly following example layout location? 
      // Example put Phone under address. I did that above.

      doc.text(`Nº de pedido: ${pedido.id}`, leftMargin, y);
      y += 5;
      if (abeBooksId) {
        doc.text(`Nº de pedido AbeBooks: ${abeBooksId}`, leftMargin, y);
        y += 5;
      }
      
      const orderDate = pedido.fecha_pedido ? new Date(pedido.fecha_pedido) : new Date();
      doc.text(`Tramitado: ${orderDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`, leftMargin, y);
      y += 5;
      doc.text(`Fecha estimada de entrega: ${estimatedDelivery}`, leftMargin, y);
      y += 10;

      // Divider
      doc.setLineWidth(0.5);
      doc.line(leftMargin, y, 190, y);
      y += 5;

      // Table Header
      doc.setFont('helvetica', 'bold');
      doc.text('Artículo', leftMargin, y);
      doc.text('Autor', 50, y);
      doc.text('Título', 100, y);
      doc.text('Nº de referencia', 160, y); // SKU/Ref
      y += 2;
      doc.line(leftMargin, y, 190, y); // Small underline per row style? No, usually typical table.
      y += 6;

      // Items
      doc.setFont('helvetica', 'normal');
      pedido.detalles?.forEach((detalle, index) => {
          doc.text((index + 1).toString(), leftMargin, y);
          
          let author = detalle.libro?.autor || '';
          let title = detalle.libro?.titulo || detalle.nombre_externo || '';
          let ref = detalle.libro?.codigo || detalle.libro?.legacy_id?.toString() || detalle.libro?.isbn || '';

          // Truncate logic if too long?
          if (author.length > 25) author = author.substring(0, 22) + '...';
          if (title.length > 30) title = title.substring(0, 27) + '...';

          doc.text(author, 50, y);
          doc.text(title, 100, y);
          doc.text(ref, 160, y);
          
          y += 6;
          
          // Description / Details below item
          // The example shows detailed description below the item row.
          // "Descripción:\n Infinita plus..."
          if (detalle.libro?.descripcion || detalle.libro?.categoria || detalle.libro?.paginas) {
              y += 2;
              doc.setFontSize(9);
              doc.text(`Descripción:`, leftMargin, y);
              y += 4;
              
              const descText = [
                 detalle.libro?.editorial ? `${detalle.libro.editorial?.nombre || ''}.` : '',
                 detalle.libro?.categoria ? `${detalle.libro.categoria?.nombre || ''}.` : '',
                 detalle.libro?.paginas ? `${detalle.libro.paginas} p.` : '',
                 detalle.libro?.descripcion || ''
              ].filter(Boolean).join(' ');

              // Split text to fit width
              const splitDesc = doc.splitTextToSize(descText, 170);
              doc.text(splitDesc, leftMargin, y);
              y += (splitDesc.length * 4) + 4;

              // Line separator after item block
              doc.setLineWidth(0.1);
              doc.line(leftMargin, y, 190, y);
              y += 6;

              doc.setFontSize(10); // Reset font size
          }
      });
      
      // Footer Notes
      y += 5;
      doc.setFontSize(9);
      doc.text('Por favor, guarde este albarán de envío para sus registros. Si tiene alguna pregunta relacionada', leftMargin, y);
      y += 4;
      doc.text('con su pedido, por favor póngase en contacto con la librería.', leftMargin, y);
      
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Atención: AbeBooks ha procesado el pago del pedido a través de la tarjeta de crédito del comprador.', leftMargin, y);

      doc.save(`Albaran-${pedido.id}.pdf`);

    } catch (error) {
      console.error('Error generating Albaran PDS:', error);
      setMessageModalConfig({
        title: 'Error',
        message: 'Error al generar el albarán PDF.',
        type: 'error'
      });
      setShowMessageModal(true);
    } finally {
      setGenerandoAlbaran(false);
    }
  };



  const tieneFactura = pedido.factura && !Array.isArray(pedido.factura);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-pedido-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Package size={24} />
            <h2>Detalle del Pedido #{pedido?.id}</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="creado-por-section" style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            border: '1px solid var(--border-color)'
          }}>
            <User size={20} style={{ color: 'var(--text-secondary)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Creado por</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                 {pedido?.usuario?.username} 
                 <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                   ({pedido?.usuario?.email})
                 </span>
              </span>
            </div>
          </div>

          <div className="legacy-id-section" style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              border: '1px solid var(--border-color)'
            }}>
              <Hash size={20} style={{ color: 'var(--text-secondary)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Código de Referencia (Libros)</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                   {
                     pedido?.detalles && pedido.detalles.length > 0 
                     ? pedido.detalles
                        .map(d => d.libro?.legacy_id || d.libro?.codigo)
                        .filter(Boolean)
                        .join(', ') || '-'
                     : '-'
                   }
                </span>
              </div>
            </div>

          <div className="pedido-info-grid">
            <div className="info-card">
              <div className="info-card-header">
                <User size={20} />
                <h3>Cliente</h3>
              </div>
              <div className="info-card-body">
                {pedido?.cliente ? (
                  <>
                    <p className="info-principal">
                      {pedido.cliente.tipo === 'empresa' || pedido.cliente.tipo === 'institucion'
                        ? pedido.cliente.nombre
                        : `${pedido.cliente.nombre} ${pedido.cliente.apellidos || ''}`.trim()}
                    </p>
                    {pedido.cliente.email && <p className="info-secundario">{pedido.cliente.email}</p>}
                    {pedido.cliente.telefono && <p className="info-secundario">{pedido.cliente.telefono}</p>}
                  </>
                ) : pedido?.tipo === 'interno' && pedido?.usuario ? (
                  <>
                    <p className="info-principal" style={{ fontStyle: 'italic', opacity: 0.9 }}>
                      {pedido.usuario.nombre_completo || pedido.usuario.username}
                    </p>
                    {pedido.usuario.email && <p className="info-secundario">{pedido.usuario.email}</p>}
                    {pedido.usuario.telefono && <p className="info-secundario">{pedido.usuario.telefono}</p>}
                  </>
                ) : (
                  <p className="info-principal" style={{ color: 'var(--text-tertiary)' }}>Sin cliente asignado</p>
                )}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Calendar size={20} />
                <h3>Fecha del Pedido</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">
                  {pedido?.fecha_pedido
                    ? new Date(pedido.fecha_pedido).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : '-'}
                </p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Package size={20} />
                <h3>Estado</h3>
              </div>
              <div className="info-card-body">
                {pedido?.estado === 'pending_verification' && pedido?.tipo === 'interno' ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button
                      onClick={handleConfirmarStock}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      <Check size={16} />
                      Confirmar Stock Disponible
                    </button>
                    <button
                      onClick={() => setRejectionModalOpen(true)}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}
                    >
                      <XCircle size={16} />
                      Rechazar - Stock No Disponible
                    </button>
                  </div>
                ) : (
                  <select
                     /* 
                       Visual Fix: If original state is invalid for this type (e.g. pending_verification for non-internal),
                       fallback to 'pendiente' or 'procesando' to match options.
                     */
                    value={(() => {
                        let val = pedido?.estado || 'pendiente';
                        if (pedido?.tipo !== 'interno') {
                             if (val === 'pending_verification') val = 'pendiente';
                             if (val === 'payment_pending') val = 'procesando';
                        }
                        return val;
                    })()}
                    onChange={(e) => handleCambiarEstado(e.target.value as EstadoPedido)}
                    className="estado-selector-detalle"
                  >
                    {ESTADOS.filter(estado => {
                      if (pedido?.tipo === 'interno') {
                         return estado !== 'pending_verification' && estado !== 'pendiente';
                      }
                      return estado !== 'pending_verification' && estado !== 'payment_pending';
                    }).map(estado => (
                      <option key={estado} value={estado}>
                        {ESTADO_LABELS[estado]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Package size={20} />
                <h3>Tipo</h3>
              </div>
              <div className="info-card-body">
                <span className="info-principal uppercase px-2 py-1 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700">
                  {pedido?.tipo?.replace('_', ' ') || '-'}
                </span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <CreditCard size={20} />
                <h3>Método de Pago</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">{pedido?.metodo_pago || '-'}</p>
              </div>
            </div>

            {pedido?.direccion_envio && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <MapPin size={20} />
                  <h3>Dirección de Envío</h3>
                </div>
                <div className="info-card-body">
                  <p className="info-principal">{pedido.direccion_envio}</p>
                </div>
              </div>
            )}

            {pedido?.tipo === 'interno' ? (
              <div className="info-card">
                <div className="info-card-header">
                  <Truck size={20} />
                  <h3>Envío</h3>
                  {!editingShipping && (
                    <button
                      onClick={() => setEditingShipping(true)}
                      style={{
                        marginLeft: 'auto',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                  )}
                </div>
                <div className="info-card-body">
                  {editingShipping ? (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Transportista</label>
                        <select
                          value={transportista}
                          onChange={(e) => setTransportista(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            background: 'var(--input-bg)',
                            color: 'var(--input-text)'
                          }}
                        >
                          <option value="">Seleccionar transportista</option>
                          <option value="ASM">ASM</option>
                          <option value="GLS">GLS</option>
                          <option value="Envialia">Envialia</option>
                          <option value="Correos">Correos</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Tracking ID</label>
                        <input
                          type="text"
                          value={tracking}
                          onChange={(e) => setTracking(e.target.value)}
                          placeholder="Número de seguimiento"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            background: 'var(--input-bg)',
                            color: 'var(--input-text)'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleActualizarEnvio}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Save size={16} />
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setEditingShipping(false);
                            setTransportista(pedido?.transportista || '');
                            setTracking(pedido?.tracking || '');
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {pedido?.transportista ? (
                        <p className="info-principal">Transportista: {pedido.transportista}</p>
                      ) : (
                        <p className="info-principal" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin transportista asignado</p>
                      )}
                      {pedido?.tracking ? (
                        <p className="info-secundario">Tracking: {pedido.tracking}</p>
                      ) : (
                        <p className="info-secundario" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin tracking asignado</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (pedido?.transportista || pedido?.tracking) && (
              <div className="info-card">
                <div className="info-card-header">
                  <Truck size={20} />
                  <h3>Envío</h3>
                </div>
                <div className="info-card-body">
                  {pedido?.transportista && (
                    <p className="info-principal">Transportista: {pedido.transportista}</p>
                  )}
                  {pedido?.tracking && (
                    <p className="info-secundario">Tracking: {pedido.tracking}</p>
                  )}
                </div>
              </div>
            )}

            {pedido?.observaciones && (
              <div className="info-card full-width">
                <div className="info-card-header">
                  <FileText size={20} />
                  <h3>Observaciones</h3>
                </div>
                <div className="info-card-body">
                  <p className="info-principal">{pedido.observaciones}</p>
                </div>
              </div>
            )}
          </div>

          <div className="detalles-section">
            <div className="detalles-header">
              <h3>Productos del Pedido</h3>
              {onEditar && (
                <button onClick={onEditar} className="btn-editar-pedido">
                  <Edit size={16} />
                  Editar Pedido
                </button>
              )}
            </div>

            <div className="detalles-table">
              <div className="table-header">
                <span>Título</span>
                <span>Cantidad</span>
                <span>Precio Unitario</span>
                <span>Subtotal</span>
              </div>

              {pedido?.detalles && pedido.detalles.length > 0 ? (
                pedido.detalles.map(detalle => (
                  <div key={detalle.id} className="table-row">
                    <span className="libro-titulo" data-label="Título">{detalle.libro?.titulo || 'Sin título'}</span>
                    <span className="cantidad" data-label="Cantidad">{detalle.cantidad}</span>
                    <span className="precio" data-label="Precio Unitario">{detalle.precio_unitario.toFixed(2)} €</span>
                    <span className="subtotal" data-label="Subtotal">
                      {(detalle.cantidad * detalle.precio_unitario).toFixed(2)} €
                    </span>
                  </div>
                ))
              ) : (
                <div className="no-detalles">No hay productos en este pedido</div>
              )}
            </div>

            <div className="totales-section">
              <div className="total-row">
                <span>Subtotal:</span>
                <span className="total-valor">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="total-row">
                <span>IVA ({taxRateApplied}%):</span>
                <span className="total-valor">{iva.toFixed(2)} €</span>
              </div>
              {pedido?.coste_envio !== undefined && pedido.coste_envio > 0 && (
                <div className="total-row">
                  <span>Gastos de envío:</span>
                  <span className="total-valor">{pedido.coste_envio.toFixed(2)} €</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total:</span>
                <span className="total-valor">{(total + (pedido?.coste_envio || 0)).toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancelar">
            Cerrar
          </button>

          <button 
             onClick={handleGenerarAlbaran} 
             className="btn-generar-albaran"
             disabled={generandoAlbaran}
             style={{ 
               backgroundColor: '#6b7280', 
               color: 'white',
               display: 'flex',
               alignItems: 'center',
               gap: '0.5rem',
               padding: '0.75rem 1.5rem',
               borderRadius: '0.5rem',
               fontWeight: 600,
               border: 'none',
               cursor: 'pointer',
               marginRight: '0.5rem'
             }}
          >
             <Printer size={16} />
             {generandoAlbaran ? 'Generando...' : 'Imprimir Albarán/Etiqueta'}
          </button>

          {tieneFactura ? (
            <div className="factura-generada">
              <FileText size={16} />
              Factura: {typeof pedido?.factura === 'object' ? pedido.factura.numero_factura : ''}
            </div>
          ) : (
            <button
              onClick={handleGenerarFactura}
              className="btn-generar-factura"
              disabled={generandoFactura || !pedido?.detalles || pedido.detalles.length === 0}
            >
              <FileText size={16} />
              {generandoFactura ? 'Generando...' : 'Generar Factura'}
            </button>
          )}
        </div>

        {/* Message Modal Component */}
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          title={messageModalConfig.title}
          message={messageModalConfig.message}
          type={messageModalConfig.type}
        />

        {/* Rejection Modal Component */}
        <RejectionModal 
          isOpen={rejectionModalOpen}
          onClose={() => setRejectionModalOpen(false)}
          onConfirm={handleRechazarPedido}
        />
      </div>
    </div>
  );
}
