import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelarSinStockModal } from '../admin/orders/CancelarSinStockModal';
import { cancelarPedidoSinStock, obtenerPedidoPorId } from '../../services/pedidoService';
import type { Pedido } from '../../types';

vi.mock('../../services/pedidoService', () => ({ cancelarPedidoSinStock: vi.fn(), obtenerPedidoPorId: vi.fn() }));
const order = { id: 42, detalles: [
  { id: 1, libro_id: 10, libro: { titulo: 'Libro ausente' } },
  { id: 2, libro_id: 20, libro: { titulo: 'Libro disponible' } },
  { id: 3, libro_id: 10, libro: { titulo: 'Libro ausente' } },
  { id: 4, libro_id: null, nombre_externo: 'Producto externo' },
] } as unknown as Pedido;
const confirm = () => screen.getByRole('button', { name: 'Confirmar cancelación por falta de stock' });

describe('missing-stock book selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(obtenerPedidoPorId).mockResolvedValue(order);
    vi.mocked(cancelarPedidoSinStock).mockResolvedValue({ success: true });
  });

  it('requires an explicit selection and deduplicates book lines', async () => {
    render(<CancelarSinStockModal pedidoId={42} onClose={vi.fn()} onCancelled={vi.fn()} />);
    await screen.findByText('Libro ausente');
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(confirm()).toBeDisabled();
    expect(screen.queryByText('Producto externo')).not.toBeInTheDocument();
  });

  it('sends only missing books and refreshes after success', async () => {
    const onCancelled = vi.fn();
    render(<CancelarSinStockModal pedidoId={42} onClose={vi.fn()} onCancelled={onCancelled} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Libro ausente' }));
    fireEvent.click(confirm());
    await waitFor(() => expect(cancelarPedidoSinStock).toHaveBeenCalledExactlyOnceWith(42, [10]));
    await waitFor(() => expect(onCancelled).toHaveBeenCalledOnce());
  });

  it('does not mutate inventory when the administrator goes back', async () => {
    const onClose = vi.fn();
    render(<CancelarSinStockModal pedidoId={42} onClose={onClose} onCancelled={vi.fn()} />);
    await screen.findByText('Libro ausente');
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(cancelarPedidoSinStock).not.toHaveBeenCalled();
  });

  it('keeps the selection visible after a backend error', async () => {
    vi.mocked(cancelarPedidoSinStock).mockResolvedValue({ success: false, error: 'Error de inventario' });
    const onCancelled = vi.fn();
    render(<CancelarSinStockModal pedidoId={42} onClose={vi.fn()} onCancelled={onCancelled} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Libro ausente' }));
    fireEvent.click(confirm());
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de inventario');
    expect(screen.getByRole('checkbox', { name: 'Libro ausente' })).toBeChecked();
    expect(onCancelled).not.toHaveBeenCalled();
  });
});
