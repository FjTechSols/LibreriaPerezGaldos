import { useState } from 'react';
import { X, Package, User, MapPin, Truck, CreditCard, FileText, Calendar, CreditCard as Edit, Printer } from 'lucide-react';
import { Pedido, EstadoPedido } from '../../../types';
import { actualizarEstadoPedido } from '../../../services/pedidoService';

import { useInvoice } from '../../../context/InvoiceContext';
import '../../../styles/components/PedidoDetalle.css';

interface PedidoDetalleProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEditar?: () => void;
}

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

export default function PedidoDetalle({ pedido, isOpen, onClose, onRefresh, onEditar }: PedidoDetalleProps) {
  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [generandoAlbaran, setGenerandoAlbaran] = useState(false);

  if (!isOpen || !pedido) return null;

  const handleCambiarEstado = async (nuevoEstado: EstadoPedido) => {
    const exito = await actualizarEstadoPedido(pedido.id, nuevoEstado);

    if (exito) {
      alert('Estado actualizado correctamente');
      onRefresh();
    } else {
      alert('Error al actualizar el estado');
    }
  };

  const { createInvoice } = useInvoice();

  const handleGenerarFactura = async () => {
    if (!pedido.detalles || pedido.detalles.length === 0) {
      alert('El pedido no tiene detalles para facturar');
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
          tax_rate: 21, // Default to 21% or fetch from somewhere?
          payment_method: pedido.metodo_pago,
          order_id: pedido.id.toString(),
          items: items,
          shipping_cost: 0, // Should be passed if available in Pedido
          language: 'es' as 'es' | 'en'
      };

      const invoice = await createInvoice(formData);

      if (invoice) {
        alert(`Factura ${invoice.invoice_number} generada correctamente`);
        onRefresh();
      } else {
        alert('Error al generar la factura');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar la factura');
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
      alert('Error al generar el albarán PDF');
    } finally {
      setGenerandoAlbaran(false);
    }
  };

  const calcularSubtotal = () => {
    if (!pedido.detalles) return 0;
    return pedido.detalles.reduce((sum, detalle) => {
      return sum + (detalle.cantidad * detalle.precio_unitario);
    }, 0);
  };

  const subtotal = calcularSubtotal();
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const tieneFactura = pedido.factura && !Array.isArray(pedido.factura);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-pedido-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Package size={24} />
            <h2>Detalle del Pedido #{pedido.id}</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="pedido-info-grid">
            <div className="info-card">
              <div className="info-card-header">
                <User size={20} />
                <h3>Cliente</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">{pedido.usuario?.username}</p>
                <p className="info-secundario">{pedido.usuario?.email}</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <Calendar size={20} />
                <h3>Fecha del Pedido</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">
                  {pedido.fecha_pedido
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
                <select
                  value={pedido.estado || 'pendiente'}
                  onChange={(e) => handleCambiarEstado(e.target.value as EstadoPedido)}
                  className="estado-selector-detalle"
                >
                  {ESTADOS.map(estado => (
                    <option key={estado} value={estado}>
                      {ESTADO_LABELS[estado]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <CreditCard size={20} />
                <h3>Método de Pago</h3>
              </div>
              <div className="info-card-body">
                <p className="info-principal">{pedido.metodo_pago || '-'}</p>
              </div>
            </div>

            {pedido.direccion_envio && (
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

            {(pedido.transportista || pedido.tracking) && (
              <div className="info-card">
                <div className="info-card-header">
                  <Truck size={20} />
                  <h3>Envío</h3>
                </div>
                <div className="info-card-body">
                  {pedido.transportista && (
                    <p className="info-principal">Transportista: {pedido.transportista}</p>
                  )}
                  {pedido.tracking && (
                    <p className="info-secundario">Tracking: {pedido.tracking}</p>
                  )}
                </div>
              </div>
            )}

            {pedido.observaciones && (
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

              {pedido.detalles && pedido.detalles.length > 0 ? (
                pedido.detalles.map(detalle => (
                  <div key={detalle.id} className="table-row">
                    <span className="libro-titulo">{detalle.libro?.titulo || 'Sin título'}</span>
                    <span className="cantidad">{detalle.cantidad}</span>
                    <span className="precio">{detalle.precio_unitario.toFixed(2)} €</span>
                    <span className="subtotal">
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
                <span>IVA (21%):</span>
                <span className="total-valor">{iva.toFixed(2)} €</span>
              </div>
              <div className="total-row final">
                <span>Total:</span>
                <span className="total-valor">{total.toFixed(2)} €</span>
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
              Factura: {typeof pedido.factura === 'object' ? pedido.factura.numero_factura : ''}
            </div>
          ) : (
            <button
              onClick={handleGenerarFactura}
              className="btn-generar-factura"
              disabled={generandoFactura || !pedido.detalles || pedido.detalles.length === 0}
            >
              <FileText size={16} />
              {generandoFactura ? 'Generando...' : 'Generar Factura'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
