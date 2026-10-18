import { jsPDF } from 'jspdf';
import type { Invoice } from '../types';
import type { CompanySettings } from '../services/settingsService';

/** Builds the admin invoice without downloading it, so pagination can be verified. */
export function createAdminInvoicePdf(invoice: Invoice, company: CompanySettings, language: 'es' | 'en' = 'es') {
  const doc = new jsPDF();
  const t = language === 'es'
    ? { title: 'FACTURA', date: 'Fecha', status: 'Estado', billTo: 'FACTURAR A:', nif: 'NIF', description: 'Descripción', qty: 'Cant.', unit: 'Precio Unit.', total: 'Total', subtotal: 'Subtotal', tax: 'IVA', page: 'Página' }
    : { title: 'INVOICE', date: 'Date', status: 'Status', billTo: 'BILL TO:', nif: 'VAT ID', description: 'Description', qty: 'Qty', unit: 'Unit Price', total: 'Total', subtotal: 'Subtotal', tax: 'VAT', page: 'Page' };
  const left = 20;
  const right = doc.internal.pageSize.getWidth() - 20;
  const bottom = doc.internal.pageSize.getHeight() - 22;
  const lineHeight = 5;
  const descriptionWidth = 92;
  let y = 40;
  const money = (value: number) => `${(value || 0).toFixed(2)} €`;
  const wrap = (value: string, width: number): string[] => doc.splitTextToSize((value || '').replace(/\r\n?/g, '\n'), width);

  const continuation = () => {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${t.title} · ${invoice.invoice_number}`, left, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = 32;
  };
  const tableHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.text(t.description, left, y);
    doc.text(t.qty, 122, y, { align: 'right' });
    doc.text(t.unit, 158, y, { align: 'right' });
    doc.text(t.total, right, y, { align: 'right' });
    doc.line(left, y + 2, right, y + 2);
    doc.setFont('helvetica', 'normal');
    y += 9;
  };
  const textBlock = (value: string, width = right - left) => {
    for (const line of wrap(value, width)) {
      if (y > bottom - lineHeight) continuation();
      doc.text(line, left, y);
      y += lineHeight;
    }
  };

  if (company.logo) {
    try { doc.addImage(company.logo, 'PNG', left, 10, 25, 25); }
    catch (error) { console.error('Error adding invoice logo:', error); }
  }
  doc.setFontSize(20);
  doc.text(t.title, 105, 22, { align: 'center' });
  doc.setFontSize(10);
  textBlock(company.name, 105);
  textBlock(company.address, 105);
  textBlock(`${t.nif}: ${company.taxId}`, 105);
  textBlock(`Tel: ${company.phone}`, 105);
  textBlock(`Email: ${company.email}`, 105);
  let metaY = 40;
  for (const value of [
    `N° ${invoice.invoice_number}`,
    `${t.date}: ${new Date(invoice.issue_date).toLocaleDateString(language === 'en' ? 'en-GB' : 'es-ES')}`,
    `${t.status}: ${invoice.status}`,
  ]) {
    const lines = wrap(value, 55);
    doc.text(lines, right, metaY, { align: 'right', lineHeightFactor: lineHeight / (10 * 25.4 / 72) });
    metaY += lines.length * lineHeight;
  }
  y = Math.max(y, metaY) + 10;
  textBlock(t.billTo);
  textBlock(invoice.customer_name);
  textBlock(invoice.customer_address);
  textBlock(`${t.nif}: ${invoice.customer_nif || ''}`);
  y += 10;
  if (y + 16 > bottom) continuation();
  tableHeader();

  for (const item of invoice.items || []) {
    const description = item.description && item.description !== item.book_title
      ? `${item.book_title}\n${item.description}` : item.book_title;
    const lines = wrap(description, descriptionWidth);
    const rowHeight = Math.max(1, lines.length) * lineHeight + 4;
    // Move ordinary rows intact; exceptionally long rows continue on another page.
    if ((rowHeight <= bottom - 41 && y + rowHeight > bottom) || y + lineHeight + 4 > bottom) {
      continuation();
      tableHeader();
    }
    let offset = 0;
    while (offset < lines.length) {
      const capacity = Math.max(1, Math.floor((bottom - y - 4) / lineHeight));
      const segment = lines.slice(offset, offset + capacity);
      segment.forEach((line, index) => doc.text(line, left, y + index * lineHeight));
      if (offset === 0) {
        doc.text(String(item.quantity), 122, y, { align: 'right' });
        doc.text(money(item.unit_price), 158, y, { align: 'right' });
        doc.text(money(item.line_total), right, y, { align: 'right' });
      }
      y += segment.length * lineHeight + 4;
      offset += segment.length;
      if (offset < lines.length) {
        continuation();
        tableHeader();
      }
    }
  }

  const totalsHeight = invoice.tax_rate > 0 ? 31 : 24;
  if (y + totalsHeight > bottom) continuation();
  y += 6;
  doc.line(120, y - 3, right, y - 3);
  const totalLine = (label: string, value: number) => {
    doc.text(label, 120, y);
    doc.text(money(value), right, y, { align: 'right' });
    y += 7;
  };
  totalLine(t.subtotal, invoice.subtotal);
  if (invoice.tax_rate > 0) totalLine(`${t.tax} (${invoice.tax_rate}%)`, invoice.tax_amount);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  totalLine('TOTAL', invoice.total);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${t.page} ${page} / ${pages}`, right, doc.internal.pageSize.getHeight() - 12, { align: 'right' });
  }
  return doc;
}
