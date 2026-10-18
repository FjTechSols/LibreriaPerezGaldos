import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizarEstadoPedido, cancelarPedidoSinStock, esPedidoPagable } from '../pedidoService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
vi.mock('../notificationService', () => ({ createAdminOrderNotification: vi.fn(), createOrderNotification: vi.fn() }));
vi.mock('../emailService', () => ({ sendOrderConfirmationEmail: vi.fn() }));
vi.mock('../settingsService', () => ({ settingsService: {} }));
vi.mock('../abeBooksService', () => ({ abeBooksService: { syncStock: vi.fn() } }));

describe('out-of-stock cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never);
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: async () => ({ data: [], error: null }) }) } as never);
  });

  it('uses one atomic RPC with only the selected, deduplicated books', async () => {
    expect(await cancelarPedidoSinStock(42, [1, 1, 2])).toEqual({ success: true });
    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith('cancel_order_out_of_stock', { p_pedido_id: 42, p_libros_sin_stock: [1, 2] });
  });
  it('does not change inventory without a selection', async () => {
    expect((await cancelarPedidoSinStock(42, [])).success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('reports a rejected RPC and does not start inventory synchronization', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'Sin permisos' } } as never);
    expect(await cancelarPedidoSinStock(42, [1])).toEqual({ success: false, error: 'Sin permisos' });
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it('cannot use the ordinary state change to bypass book selection', async () => {
    expect((await actualizarEstadoPedido(42, 'sin_stock')).success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it.each(['interno', 'express', 'flash', 'perez_galdos'] as const)('cannot pay a %s order cancelled for missing inventory', tipo => {
    expect(esPedidoPagable({ tipo, estado: 'sin_stock' })).toBe(false);
  });

  it('does not restore stock when attempting to change an already out-of-stock order', async () => {
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({ data: { estado: 'sin_stock', tipo: 'express' } }) }) }) } as never);
    expect((await actualizarEstadoPedido(42, 'cancelado')).success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('preserves the ordinary cancellation restoration', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => (table === 'pedidos' ? {
      select: () => ({ eq: () => ({ single: async () => ({ data: { estado: 'procesando', tipo: 'interno' } }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    } : { insert: async () => ({ error: null }) }) as never);
    expect(await actualizarEstadoPedido(42, 'cancelado')).toEqual({ success: true });
    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith('restore_stock_force', { p_pedido_id: 42 });
  });
});
