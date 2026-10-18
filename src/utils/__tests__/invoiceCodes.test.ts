import { describe, expect, it } from 'vitest';
import { mergeInvoiceItems, parseInvoiceCodes } from '../invoiceCodes';

describe('invoice code lists', () => {
  it('parses spaces, commas, tabs, BOM and Windows/Unix newlines without losing leading zeros', () => {
    expect(parseInvoiceCodes('\uFEFF0023, 0045\r\n0067\t0089\n0023,, ')).toEqual(['0023', '0045', '0067', '0089', '0023']);
    expect(parseInvoiceCodes(' , \n ')).toEqual([]);
  });
  it('does not truncate long lists', () => {
    const codes = Array.from({ length: 1500 }, (_, i) => String(i).padStart(8, '0'));
    expect(parseInvoiceCodes(codes.join('\n'))).toEqual(codes);
  });
  it('combines quantities at matching prices, preserves custom prices and avoids mutating original items', () => {
    const existing = [{ book_id: '1', book_title: 'Libro', quantity: 1, unit_price: 10.33, line_total: 10.33 }];
    const additions = [{ ...existing[0], quantity: 2, line_total: 20.66 }, { ...existing[0], unit_price: 5, line_total: 5 }];
    const result = mergeInvoiceItems(existing, additions);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ quantity: 3, line_total: 30.99 });
    expect(result[1].unit_price).toBe(5);
    expect(existing[0].quantity).toBe(1);
  });
});
