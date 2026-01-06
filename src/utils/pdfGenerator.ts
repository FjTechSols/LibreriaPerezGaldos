import jsPDF from 'jspdf';
import { Factura } from '../types';
import { AllSettings } from '../services/settingsService';

// Helper to load image
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = error => reject(error);
  });
};

export const generarPDFFactura = async (factura: Factura, settings?: AllSettings): Promise<Blob> => {
  const COMPANY_INFO = settings ? {
    nombre: settings.company.name,
    direccion: settings.company.address,
    telefono: settings.company.phone,
    email: settings.company.email,
    cif: settings.company.taxId,
    web: settings.company.website
  } : {
    nombre: 'Perez Galdos',
    direccion: 'Calle Hortaleza 5, 28004 Madrid, España',
    telefono: '+34 91 531 26 40',
    email: 'libreria@perezgaldos.com',
    cif: 'B12345678',
    web: 'www.libreriaperezgaldos.com'
  };
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add Logo
  try {
    const logoUrl = '/Logo Exlibris Perez Galdos.png';
    const logoBase64 = await getBase64ImageFromURL(logoUrl);
    // Add logo at top left (margin, 10), size 30x30 roughly (adjust aspect ratio in real scenario if needed)
    doc.addImage(logoBase64, 'PNG', margin, 15, 25, 25);
  } catch (err) {
    console.error('Error adding logo to PDF:', err);
  }

  let yPos = 20;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', pageWidth / 2, yPos, { align: 'center' });

  if (factura.tipo === 'rectificativa') {
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text('(RECTIFICATIVA)', pageWidth / 2, yPos + 8, { align: 'center' });
    yPos += 8;
  }

  doc.setTextColor(0, 0, 0);
  // Start text below logo. Logo ends at 15+25 = 40. Start at 45.
  yPos = 50; 

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.nombre, margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(COMPANY_INFO.direccion, margin, yPos);
  yPos += 4;
  doc.text(`Tel: ${COMPANY_INFO.telefono}`, margin, yPos);
  yPos += 4;
  doc.text(`Email: ${COMPANY_INFO.email}`, margin, yPos);
  yPos += 4;
  doc.text(`NIF: ${COMPANY_INFO.cif}`, margin, yPos);

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);

  yPos += 15;

  const colRight = pageWidth - margin - 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Nº Factura:', colRight, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.numero_factura, colRight + 30, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', colRight, yPos);
  doc.setFont('helvetica', 'normal');
  const fecha = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : '-';
  doc.text(fecha, colRight + 30, yPos);
  yPos += 10;

  if (factura.pedido?.usuario) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DATOS DEL CLIENTE', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Nombre: ${factura.pedido.usuario.username}`, margin, yPos);
    yPos += 4;
    doc.text(`Email: ${factura.pedido.usuario.email}`, margin, yPos);
    yPos += 4;

    if (factura.pedido.direccion_envio) {
      doc.text(`Dirección: ${factura.pedido.direccion_envio}`, margin, yPos);
      yPos += 4;
    }
  }

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETALLE DE LA FACTURA', margin, yPos);
  yPos += 8;

  const tableHeaders = ['Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal'];
  const colWidths = [80, 30, 30, 30];
  const startX = margin;

  doc.setFillColor(240, 240, 240);
  doc.rect(startX, yPos - 5, pageWidth - 2 * margin, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  let xPos = startX + 2;
  tableHeaders.forEach((header, idx) => {
    doc.text(header, xPos, yPos);
    xPos += colWidths[idx];
  });

  yPos += 8;

  doc.setFont('helvetica', 'normal');

  if (factura.pedido?.detalles && factura.pedido.detalles.length > 0) {
    factura.pedido.detalles.forEach((detalle) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      xPos = startX + 2;
      const titulo = detalle.libro?.titulo || 'Sin título';
      const maxWidth = colWidths[0] - 5;
      const lines = doc.splitTextToSize(titulo, maxWidth);

      doc.text(lines[0], xPos, yPos);
      xPos += colWidths[0];

      doc.text(detalle.cantidad.toString(), xPos, yPos);
      xPos += colWidths[1];

      const currencySymbol = settings?.billing.currencySymbol || '€';
      doc.text(`${detalle.precio_unitario.toFixed(2)} ${currencySymbol}`, xPos, yPos);
      xPos += colWidths[2];

      const subtotal = detalle.cantidad * detalle.precio_unitario;
      doc.text(`${subtotal.toFixed(2)} ${currencySymbol}`, xPos, yPos);

      yPos += 6;
    });
  }

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const totalsX = pageWidth - margin - 60;
  const currencySymbol = settings?.billing.currencySymbol || '€';
  const taxRate = settings?.billing.taxRate || 21;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`${factura.subtotal.toFixed(2)} ${currencySymbol}`, totalsX + 30, yPos, { align: 'right' });
  yPos += 6;

  if (factura.pedido?.coste_envio && factura.pedido.coste_envio > 0) {
    doc.text('Gastos de Envío:', totalsX, yPos);
    doc.text(`${factura.pedido.coste_envio.toFixed(2)} ${currencySymbol}`, totalsX + 30, yPos, { align: 'right' });
    yPos += 6;
  }

  doc.text(`IVA (${taxRate}%):`, totalsX, yPos);
  doc.text(`${factura.iva.toFixed(2)} ${currencySymbol}`, totalsX + 30, yPos, { align: 'right' });
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, yPos);
  doc.text(`${factura.total.toFixed(2)} ${currencySymbol}`, totalsX + 30, yPos, { align: 'right' });

  if (factura.tipo === 'rectificativa' && factura.motivo_anulacion) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text('MOTIVO DE RECTIFICACIÓN:', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const motivoLines = doc.splitTextToSize(factura.motivo_anulacion, pageWidth - 2 * margin);
    doc.text(motivoLines, margin, yPos);
  }

  yPos += 15;

  if (settings?.billing.invoiceTerms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('TÉRMINOS DE PAGO:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const termsLines = doc.splitTextToSize(settings.billing.invoiceTerms, pageWidth - 2 * margin);
    doc.text(termsLines, margin, yPos);
    yPos += termsLines.length * 4;
  }

  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  if (settings?.billing.invoiceFooter) {
    const footerLines = doc.splitTextToSize(settings.billing.invoiceFooter, pageWidth - 2 * margin);
    let footerYPos = footerY - (footerLines.length * 4);
    doc.text(footerLines, pageWidth / 2, footerYPos, { align: 'center' });
  }

  doc.text(COMPANY_INFO.web, pageWidth / 2, footerY, { align: 'center' });

  return doc.output('blob');
};

export const descargarPDF = (blob: Blob, nombreArchivo: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const previsualizarPDF = (blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 100);
};
