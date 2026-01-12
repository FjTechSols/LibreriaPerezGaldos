import { useState, useEffect } from 'react';
import { X, Package, User, MapPin, Truck, CreditCard, FileText, Calendar, CreditCard as Edit, Printer, Save, Check, XCircle, Hash, Trash, Plus, Edit2, Building2, Globe, Link as LinkIcon } from 'lucide-react';
import { Pedido, EstadoPedido, Libro } from '../../../types';
import { actualizarEstadoPedido, actualizarPedido, eliminarDetallePedido, actualizarDetallePedido, agregarDetallePedido, calcularTotalesPedido } from '../../../services/pedidoService';
import { sendPaymentReadyEmail } from '../../../services/emailService';
import { useSettings } from '../../../context/SettingsContext';
import { useInvoice } from '../../../context/InvoiceContext';
import '../../../styles/components/PedidoDetalle.css';
import { MessageModal } from '../../MessageModal';
import { RejectionModal } from './RejectionModal';
import { EditClientModal } from '../clients/EditClientModal';
import { AddProductToOrderModal } from './AddProductToOrderModal';
import { Cliente } from '../../../types';

interface PedidoDetalleProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
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

export default function PedidoDetalle({ pedido, isOpen, onClose, onRefresh }: PedidoDetalleProps) {
  const { settings, formatPrice } = useSettings();
  const { createInvoice } = useInvoice();
  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [generandoAlbaran, setGenerandoAlbaran] = useState(false);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editedLines, setEditedLines] = useState<any[]>([]); 
  const [deletedLinesIds, setDeletedLinesIds] = useState<number[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);
  
  // Add Book State
  const [showAddBook, setShowAddBook] = useState(false);


  // State for shipping info editing
  const [editingShipping, setEditingShipping] = useState(false);
  const [transportista, setTransportista] = useState(pedido?.transportista || '');
  const [tracking, setTracking] = useState(pedido?.tracking || '');

  // State for observations editing
  const [editingObservations, setEditingObservations] = useState(false);
  const [observations, setObservations] = useState(pedido?.observaciones || '');

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ title: '', message: '', type: 'info' });

  // State for rejection modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);

  // State for Edit Client Modal
  const [showEditClientModal, setShowEditClientModal] = useState(false);

  const handleClientUpdated = (_updatedCliente: Cliente) => {
      onRefresh();
      setShowEditClientModal(false);
  };

  // Initialize editedLines when entering edit mode or when pedido changes
  useEffect(() => {
    if (pedido?.detalles) {
      setEditedLines(pedido.detalles.map(d => ({ ...d })));
    }
    setTransportista(pedido?.transportista || '');
    setTracking(pedido?.tracking || ''); 
    setObservations(pedido?.observaciones || '');
  }, [pedido, isOpen]);

  // Book Search Effect


  if (!isOpen || !pedido) return null;



  // I need to add deletedLineIds state
  // Let me add it in the next step or rework state declarations above.
  // I will just use immediate mode for Delete/Add to make it easier? 
  // No, user said "Al pulsar Guardar Cambios". So it must be batch.
  
  // Handlers placeholder (I'll add full logic in next tool call)
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
      setEditingShipping(false);
      onRefresh();
      setTimeout(() => {
          setMessageModalConfig({
            title: 'Envío Actualizado',
            message: 'La información de envío se ha actualizado correctamente.',
            type: 'info'
          });
          setShowMessageModal(true);
      }, 300);
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: 'Hubo un error al actualizar la información de envío.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  const handleSaveObservations = async () => {
    if (!pedido) return;

    const success = await actualizarPedido(pedido.id, {
      observaciones: observations
    });

    if (success) {
      setEditingObservations(false);
      onRefresh();
      setTimeout(() => {
          setMessageModalConfig({
            title: 'Observaciones Actualizadas',
            message: 'Las observaciones se han actualizado correctamente.',
            type: 'info'
          });
          setShowMessageModal(true);
      }, 300);
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: 'Hubo un error al actualizar las observaciones.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  const toggleEditMode = () => {
      if (isEditing) {
          // Cancel: Reset lines
          setEditedLines(pedido.detalles ? pedido.detalles.map(d => ({...d})) : []);
          setDeletedLinesIds([]);
          setIsEditing(false);
      } else {
          // Start Editing
          setIsEditing(true);
      }
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const newLines = [...editedLines];
    newLines[index].cantidad = newQty;
    setEditedLines(newLines);
  };

  const handleDeleteLine = (index: number) => {
    if (confirm('¿Estás seguro de eliminar este producto del pedido?')) {
        const line = editedLines[index];
        if (line.id) {
           setDeletedLinesIds([...deletedLinesIds, line.id]);
        }
        const newLines = [...editedLines];
        newLines.splice(index, 1);
        setEditedLines(newLines);
    }
  };

  /* OLD SEARCH LOGIC REMOVED - REPLACED BY MODAL HANDLER */
  const handleAddProductFromModal = (item: { 
    libro?: Libro; 
    nombre_externo?: string; 
    precio_unitario: number; 
    cantidad: number;
    url_externa?: string;
    isExternal: boolean;
  }) => {
      // Check duplicate only for internal books
      if (!item.isExternal && item.libro) {
         const exists = editedLines.find(l => l.libro_id === item.libro!.id);
         if (exists) {
             alert("Este libro ya está en el pedido. Incrementa la cantidad si lo deseas.");
             return;
         }
      }

      setEditedLines([...editedLines, {
          libro_id: item.isExternal ? null : item.libro!.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          libro: item.libro, // visual
          nombre_externo: item.nombre_externo,
          url_externa: item.url_externa
      }]);
      setShowAddBook(false);
  };

  const handleSaveChanges = async () => {
      if (!monitorChanges()) {
          setIsEditing(false);
          return;
      }

      setSavingChanges(true);
      try {
          // 1. Process Deletions
          for (const id of deletedLinesIds) {
              await eliminarDetallePedido(id);
          }

          // 2. Process Updates and Inserts
          for (const line of editedLines) {
              if (line.id) {
                  // Update
                  await actualizarDetallePedido(line.id, {
                      cantidad: line.cantidad,
                      precio_unitario: line.precio_unitario
                  });
              } else {
                  // Insert
                  await agregarDetallePedido(
                    pedido.id, 
                    line.libro_id, 
                    line.cantidad, 
                    line.precio_unitario,
                    line.nombre_externo,
                    line.url_externa
                  );
              }
          }

          // 3. Recalculate Totals (Client side logic reused)
          // Construct 'detalles' for calculation
          const cleanDetalles = editedLines.map(l => ({
              cantidad: l.cantidad,
              precio_unitario: l.precio_unitario
          }));
          
          const { subtotal, iva, total } = calcularTotalesPedido(cleanDetalles, settings.billing.taxRate / 100); // Assuming current rate
          
          await actualizarPedido(pedido.id, {
              subtotal,
              iva,
              total: total + (pedido.coste_envio || 0) // Add shipping back
          });

          setMessageModalConfig({
              title: 'Pedido Actualizado',
              message: 'El pedido ha sido actualizado correctamente.',
              type: 'info'
          });
          setShowMessageModal(true);
          setIsEditing(false);
          setDeletedLinesIds([]);
          onRefresh();

      } catch (error) {
          console.error(error);
          setMessageModalConfig({
              title: 'Error',
              message: 'Hubo un error al guardar los cambios.',
              type: 'error'
          });
          setShowMessageModal(true);
      } finally {
          setSavingChanges(false);
      }
  };

  const monitorChanges = () => {
      // Helper to check if any changes actually happened?
      // For now assume yes if they clicked save.
      return true;
  };

  const handleCopyPaymentLink = () => {
    if (!pedido) return;
    const paymentUrl = `${window.location.origin}/stripe-checkout?orderId=${pedido.id}`;
    navigator.clipboard.writeText(paymentUrl);
    setMessageModalConfig({
        title: 'Enlace Copiado',
        message: 'El enlace de pago se ha copiado al portapapeles.',
        type: 'info'
    });
    setShowMessageModal(true);
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
              <div className="info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} />
                  <h3>Cliente</h3>
                </div>
                {pedido?.cliente && (
                    <button 
                        onClick={() => setShowEditClientModal(true)}
                        className="btn-icon" 
                        title="Editar Cliente"
                        style={{ padding: '4px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <Edit2 size={16} />
                    </button>
                )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="info-principal">{pedido?.metodo_pago || '-'}</p>
                    <button
                        onClick={handleCopyPaymentLink}
                        title="Copiar enlace de pago manual"
                        style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        <LinkIcon size={14} />
                        Copiar Enlace
                    </button>
                </div>
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
                  {(!editingShipping && !pedido?.direccion_envio?.includes('RECOGIDA')) && (
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
                      {/* Special display for Pickup Orders */}
                      {pedido?.direccion_envio?.includes('RECOGIDA') ? (
                          <div style={{ padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Building2 size={20} style={{ color: 'var(--success-color)' }} />
                              <div>
                                  <span style={{ fontWeight: 600, display: 'block' }}>Recogida en Librería</span>
                                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>El cliente recogerá el pedido.</span>
                              </div>
                          </div>
                      ) : (
                          <>
                            {transportista ? (
                                <p className="info-principal">Transportista: {transportista}</p>
                            ) : (
                                <p className="info-principal" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin transportista asignado</p>
                            )}

                            {tracking ? (
                                <p className="info-secundario">Tracking: {tracking}</p>
                            ) : (
                                <p className="info-secundario" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin tracking asignado</p>
                            )}
                          </>
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
                  {transportista && (
                    <p className="info-principal">Transportista: {transportista}</p>
                  )}
                  {tracking && (
                    <p className="info-secundario">Tracking: {tracking}</p>
                  )}
                </div>
              </div>
            )}

            <div className="info-card full-width">
                <div className="info-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} />
                    <h3>Observaciones</h3>
                  </div>
                  {!editingObservations && (
                    <button
                      onClick={() => setEditingObservations(true)}
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
                  {editingObservations ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                            placeholder="Escribe aquí las observaciones..."
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setEditingObservations(false);
                                    setObservations(pedido?.observaciones || '');
                                }}
                                style={{
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
                            <button
                                onClick={handleSaveObservations}
                                style={{
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
                                    gap: '0.5rem'
                                }}
                            >
                                <Save size={16} />
                                Guardar
                            </button>
                        </div>
                    </div>
                  ) : (
                    <p className="info-principal" style={{ whiteSpace: 'pre-wrap' }}>
                        {observations || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin observaciones</span>}
                    </p>
                  )}
                </div>
              </div>
          </div>

          <div className="detalles-section">
            <div className="detalles-header">
              <h3>Productos del Pedido</h3>
              {!isEditing && (
                <button onClick={toggleEditMode} className="btn-editar-pedido">
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
                {isEditing && <span>Acciones</span>}
              </div>

              {(isEditing ? editedLines : pedido?.detalles || []).map((detalle, index) => (
                <div key={detalle.id || `temp-${index}`} className="table-row">
                  <span className="libro-titulo" data-label="Título" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                        {detalle.libro?.titulo || detalle.nombre_externo || 'Sin título'}
                    </span>
                    
                    {/* External Product Indicator & Link */}
                    {(!detalle.libro && detalle.nombre_externo) && (
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 w-fit">
                                Externo
                             </span>
                             {detalle.url_externa && (
                                 <a 
                                    href={detalle.url_externa} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                 >
                                     <Globe size={12} />
                                     Ver Enlace
                                 </a>
                             )}
                        </div>
                    )}
                  </span>
                  
                  <span className="cantidad" data-label="Cantidad">
                    {isEditing ? (
                        <input 
                            type="number" 
                            min="1"
                            value={detalle.cantidad}
                            onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                            className="input-cantidad-edit"
                            style={{ 
                                width: '60px', 
                                padding: '6px', 
                                border: '1px solid #6b7280', // More visible border (gray-500)
                                borderRadius: '4px',
                                background: 'var(--bg-tertiary)', // Distinct background
                                color: 'var(--text-primary)',
                                textAlign: 'center',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                fontWeight: '500'
                            }}
                        />
                    ) : (
                        detalle.cantidad
                    )}
                  </span>
                  
                  <span className="precio" data-label="Precio Unitario">
                    {formatPrice(detalle.precio_unitario)}
                  </span>
                  
                  <span className="subtotal" data-label="Subtotal">
                    {formatPrice(detalle.cantidad * detalle.precio_unitario)}
                  </span>

                  {isEditing && (
                      <span className="acciones" data-label="Acciones">
                          <button 
                             onClick={() => handleDeleteLine(index)}
                             title="Eliminar línea"
                             style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                              <Trash size={18} />
                          </button>
                      </span>
                  )}
                </div>
              ))}
              
              {!pedido?.detalles?.length && !isEditing && (
                 <div className="no-detalles">No hay productos en este pedido</div>
              )}

              {isEditing && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                        onClick={() => setShowAddBook(true)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            color: 'var(--primary-color)',
                            backgroundColor: 'transparent',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                             e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                             e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseOut={(e) => {
                             e.currentTarget.style.backgroundColor = 'transparent';
                             e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                    >
                        <Plus size={16} />
                        Añadir Producto (Interno o Externo)
                    </button>
                    
                    <AddProductToOrderModal 
                        isOpen={showAddBook}
                        onClose={() => setShowAddBook(false)}
                        onAdd={handleAddProductFromModal}
                    />
                </div>
              )}
            </div>

            <div className="totales-section">
              <div className="total-row">
                <span>Subtotal (Estimado):</span>
                <span className="total-valor">
                    {formatPrice(calcularTotalesPedido(isEditing ? editedLines : (pedido?.detalles || []), settings.billing.taxRate / 100).subtotal)}
                </span>
              </div>
              <div className="total-row">
                 <span>IVA (Estimado):</span>
                 <span className="total-valor">
                    {formatPrice(calcularTotalesPedido(isEditing ? editedLines : (pedido?.detalles || []), settings.billing.taxRate / 100).iva)}
                 </span>
              </div>
              {pedido?.coste_envio !== undefined && pedido.coste_envio > 0 && (
                <div className="total-row">
                  <span>Gastos de envío:</span>
                  <span className="total-valor">{pedido.coste_envio.toFixed(2)} €</span>
                </div>
              )}
              <div className="total-row final">
                <span>Total:</span>
                <span className="total-valor">
                    {formatPrice(calcularTotalesPedido(isEditing ? editedLines : (pedido?.detalles || []), settings.billing.taxRate / 100).total + (pedido?.coste_envio || 0))}
                </span>
              </div>
              
              {pedido?.es_senal && (
                <>
                    <div className="total-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Señal Pagada:</span>
                        <span className="total-valor" style={{ color: '#f59e0b', fontWeight: 600 }}>
                            - {formatPrice(pedido.importe_senal || 0)}
                        </span>
                    </div>
                    <div className="total-row final" style={{ marginTop: '0.5rem' }}>
                        <span>Restante:</span>
                        <span className="total-valor">
                            {formatPrice((calcularTotalesPedido(isEditing ? editedLines : (pedido?.detalles || []), settings.billing.taxRate / 100).total + (pedido?.coste_envio || 0)) - (pedido.importe_senal || 0))}
                        </span>
                    </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isEditing ? (
              <>
                  <button 
                      onClick={toggleEditMode}
                      className="btn-cancelar"
                      disabled={savingChanges}
                  >
                      Cancelar Edición
                  </button>
                  <button 
                      onClick={handleSaveChanges}
                      className="btn-guardar"
                      disabled={savingChanges}
                      style={{ 
                          backgroundColor: '#10b981', 
                          color: 'white', 
                          padding: '0.75rem 1.5rem', 
                          borderRadius: '0.5rem', 
                          fontWeight: 600, 
                          border: 'none', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem' 
                      }}
                  >
                      <Save size={16} />
                      {savingChanges ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
              </>
          ) : (
              <>
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
              </>
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
        {showEditClientModal && pedido?.cliente && (
            <EditClientModal
                cliente={pedido.cliente}
                isOpen={showEditClientModal}
                onClose={() => setShowEditClientModal(false)}
                onClientUpdated={handleClientUpdated}
            />
        )}
      </div>
    </div>
  );
}
