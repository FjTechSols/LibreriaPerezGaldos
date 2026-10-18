import type { InvoiceItem } from '../types';

export const parseInvoiceCodes = (text: string): string[] => text.split(/[\s,]+/u).filter(Boolean);

/** Merge only identical books/prices; preserve manually edited invoice prices. */
export function mergeInvoiceItems(current: InvoiceItem[], additions: InvoiceItem[]): InvoiceItem[] {
  const result = current.map(item => ({ ...item }));
  for (const item of additions) {
    const existing = item.book_id ? result.find(row => row.book_id === item.book_id && row.unit_price === item.unit_price && !row.description) : undefined;
    if (existing) {
      existing.quantity += item.quantity;
      existing.line_total = Number((existing.quantity * existing.unit_price).toFixed(2));
    } else result.push({ ...item });
  }
  return result;
}
