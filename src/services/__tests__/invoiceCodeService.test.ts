import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarLibrosPorCodigos } from '../invoiceCodeService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ supabase: { from: vi.fn() } }));
const range = vi.fn();
const inFilter = vi.fn();
const eq = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  range.mockResolvedValue({ data: [], error: null });
  inFilter.mockReturnValue({ order: () => ({ range }) });
  eq.mockReturnValue({ in: inFilter });
  vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never);
});
describe('exact invoice book-code lookup', () => {
  it('matches internal codes exactly in batches and removes duplicate queries', async () => {
    const codes = Array.from({ length: 230 }, (_, i) => String(i).padStart(8, '0'));
    await buscarLibrosPorCodigos([...codes, codes[0]]);
    expect(inFilter).toHaveBeenCalledTimes(3);
    expect(inFilter).toHaveBeenNthCalledWith(1, 'legacy_id', codes.slice(0, 100));
    expect(inFilter).toHaveBeenNthCalledWith(3, 'legacy_id', codes.slice(200));
    expect(eq).toHaveBeenCalledWith('activo', true);
  });
  it('reads all result pages, including duplicate database codes, instead of choosing an arbitrary match', async () => {
    range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, id) => ({ id, legacy_id: '0001', titulo: 'Libro', precio: 12 })), error: null });
    range.mockResolvedValueOnce({ data: [{ id: 501, legacy_id: '0001', titulo: 'Otro libro', precio: 14 }], error: null });
    const books = await buscarLibrosPorCodigos(['0001']);
    expect(books).toHaveLength(501);
    expect(range).toHaveBeenNthCalledWith(2, 500, 999);
    expect(books.at(-1)).toMatchObject({ id: '501', code: '0001', price: 14 });
  });
  it('rejects the whole lookup if a later batch fails', async () => {
    range.mockResolvedValueOnce({ data: [{ id: 1, legacy_id: '0001', titulo: 'Libro', precio: 10 }], error: null });
    range.mockResolvedValueOnce({ data: null, error: { message: 'Network error' } });
    await expect(buscarLibrosPorCodigos(Array.from({ length: 101 }, (_, i) => String(i))))
      .rejects.toMatchObject({ message: 'Network error' });
  });
});
