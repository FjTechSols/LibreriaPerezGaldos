import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerLibros } from '../libroService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
vi.mock('../discountService', () => ({ discountService: { getActiveDiscounts: vi.fn().mockResolvedValue([]) } }));

describe('advanced book search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
  });

  it('sends the title and combined filters to the advanced RPC', async () => {
    await obtenerLibros(2, 20, {
      titulo: 'historia universal', autor: 'Autor', publisher: 'Editorial',
      isbn: '978-123', legacy_id: '0229', descripcion: 'ilustraciones',
      featured: true, isNew: true, isOnSale: true, coverStatus: 'without_cover',
      availability: 'inStock', sortBy: 'title', sortOrder: 'desc',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('search_books_advanced', expect.objectContaining({
      p_titulo: 'historia universal', p_autor: 'Autor', p_publisher: 'Editorial',
      p_isbn: '978-123', p_legacy_id: '0229', p_descripcion: 'ilustraciones',
      p_featured: true, p_is_new: true, p_is_on_sale: true, p_cover_status: 'without_cover',
      p_stock_status: 'in_stock', p_sort_by: 'title_desc', p_offset: 20,
    }));
  });

  it.each(['titulo', 'autor', 'descripcion', 'publisher', 'isbn', 'legacy_id'])(
    'uses the same advanced query when only %s is supplied', async field => {
      await obtenerLibros(1, 20, { [field]: 'test' });
      expect(supabase.rpc).toHaveBeenCalledWith('search_books_advanced', expect.any(Object));
      expect(supabase.from).not.toHaveBeenCalled();
    },
  );

  it('uses the exact filtered total for pagination', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{
      id: 1, titulo: 'Historia universal', autor: 'Autor', precio: 10,
      stock: 1, activo: true, total_count: 57,
    }], error: null } as never);
    const result = await obtenerLibros(1, 20, { titulo: 'historia universal' });
    expect(result.count).toBe(57);
    expect(result.data[0].title).toBe('Historia universal');
  });

  it('preserves a maximum price of zero', async () => {
    await obtenerLibros(1, 20, { titulo: 'historia', minPrice: 0, maxPrice: 0 });
    expect(supabase.rpc).toHaveBeenCalledWith('search_books_advanced', expect.objectContaining({ p_min_price: 0, p_max_price: 0 }));
  });

  it('does not drop an unknown category and return books from other categories', async () => {
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) } as never);
    expect(await obtenerLibros(1, 20, { titulo: 'historia', category: 'No existe' })).toEqual({ data: [], count: 0 });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('lets the admin distinguish a query error from an empty result', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } } as never);
    await expect(obtenerLibros(1, 20, { titulo: 'historia universal', throwOnError: true }))
      .rejects.toMatchObject({ message: 'RPC unavailable' });
  });
});
