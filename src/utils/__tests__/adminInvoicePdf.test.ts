import { describe, expect, it } from 'vitest';
import { createAdminInvoicePdf } from '../adminInvoicePdf';
import type { Invoice } from '../../types';

const company = { name: 'Perez Galdos', address: 'Madrid', phone: '123', email: 'test@example.com', taxId: 'TEST', website: '', logo: '' };
const invoice: Invoice = {
  id: 'test', invoice_number: 'TEST-2026', customer_name: 'Cliente', customer_address: 'Direccion\nMadrid', customer_nif: 'TEST',
  issue_date: '2026-10-17', status: 'Pendiente', subtotal: 100, tax_rate: 4, tax_amount: 4, total: 104,
  items: [{ book_title: 'Titulo\nSegunda linea', quantity: 1, unit_price: 100, line_total: 100 }],
};

describe('admin invoice PDF pagination', () => {
  it('keeps short invoices on one page and preserves explicit line breaks', () => {
    const doc = createAdminInvoicePdf(invoice, company);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output()).toContain('(Titulo)');
    expect(doc.output()).toContain('(Segunda linea)');
    expect(doc.output()).toContain('(TOTAL)');
  });

  it('paginates all items, repeats column headings and puts totals on the last page', () => {
    const items = Array.from({ length: 90 }, (_, i) => ({ ...invoice.items![0], book_title: `Articulo ${i} ` + 'Una descripcion extensa que ocupa varias lineas. '.repeat(4) }));
    const doc = createAdminInvoicePdf({ ...invoice, items }, company, 'en');
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    for (let page = 1; page <= doc.getNumberOfPages(); page++) {
      const content = doc.internal.pages[page].join('\n');
      expect(content).toContain(`Page ${page} / ${doc.getNumberOfPages()}`);
      if (page < doc.getNumberOfPages()) expect(content).not.toContain('(TOTAL)');
    }
    expect(doc.internal.pages.at(-1)!.join('\n')).toContain('(TOTAL)');
    expect(doc.output()).toContain('Articulo 89');
    expect(doc.output().match(/\(Description\)/g)!.length).toBeGreaterThan(1);
  });

  it('continues a single description longer than one page without losing its ending or duplicating amounts', () => {
    const doc = createAdminInvoicePdf({ ...invoice, items: [{ ...invoice.items![0], book_title: 'Primera linea\n'.repeat(160) + 'FINAL-DESCRIPCION', unit_price: 12.34, line_total: 56.78 }] }, company);
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(doc.output()).toContain('FINAL-DESCRIPCION');
    expect(doc.output().match(/12\.34/g)).toHaveLength(1);
    expect(doc.output().match(/56\.78/g)).toHaveLength(1);
  });
});
