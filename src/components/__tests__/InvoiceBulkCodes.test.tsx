import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceBulkCodes } from '../admin/invoices/InvoiceBulkCodes';
import InvoiceForm from '../admin/invoices/InvoiceForm';
import { buscarLibrosPorCodigos } from '../../services/invoiceCodeService';

vi.mock('../../services/invoiceCodeService', () => ({ buscarLibrosPorCodigos: vi.fn() }));
vi.mock('../../services/libroService', () => ({ obtenerLibros: vi.fn().mockResolvedValue({ data: [] }), buscarLibros: vi.fn() }));
vi.mock('../../services/clienteService', () => ({ getClientes: vi.fn().mockResolvedValue({ data: [] }), crearCliente: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buscarLibrosPorCodigos).mockResolvedValue([{ id: '1', code: '0001', title: 'Libro uno', price: 12.34 }]);
});
const input = () => screen.getByRole('textbox', { name: 'Códigos de los libros' });
const add = () => screen.getByRole('button', { name: 'Añadir a factura' });

describe('bulk invoice codes', () => {
  it('adds matching quantities and leaves missing and ambiguous codes for review', async () => {
    vi.mocked(buscarLibrosPorCodigos).mockResolvedValue([
      { id: '1', code: '0001', title: 'Libro uno', price: 12.34 },
      { id: '2', code: '0002', title: 'Libro dos', price: 20 },
      { id: '3', code: '0002', title: 'Otro libro', price: 30 },
    ]);
    const onAdd = vi.fn();
    render(<InvoiceBulkCodes onAdd={onAdd} onBusyChange={vi.fn()} />);
    fireEvent.change(input(), { target: { value: '0001,0002\n0001 0099' } });
    fireEvent.click(add());
    await waitFor(() => expect(onAdd).toHaveBeenCalledExactlyOnceWith([
      { book_id: '1', book_title: 'Libro uno', quantity: 2, unit_price: 12.34, line_total: 24.68 },
    ]));
    expect(input()).toHaveValue('0002\n0099');
    expect(screen.getByText('0002: corresponde a varios libros')).toBeInTheDocument();
    expect(screen.getByText('0099: no encontrado')).toBeInTheDocument();
  });
  it('loads a TXT into the editor without automatically changing the invoice', async () => {
    const onAdd = vi.fn();
    render(<InvoiceBulkCodes onAdd={onAdd} onBusyChange={vi.fn()} />);
    const file = new File(['0001,0002\r\n0003'], 'codigos.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'text', { value: async () => '0001,0002\r\n0003' });
    fireEvent.change(screen.getByLabelText('Archivo de códigos TXT'), { target: { files: [file] } });
    await waitFor(() => expect(input()).toHaveValue('0001,0002\n0003'));
    expect(onAdd).not.toHaveBeenCalled();
    expect(buscarLibrosPorCodigos).not.toHaveBeenCalled();
  });
  it('preserves the input and adds nothing on a query error', async () => {
    vi.mocked(buscarLibrosPorCodigos).mockRejectedValue(new Error('Network'));
    const onAdd = vi.fn();
    render(<InvoiceBulkCodes onAdd={onAdd} onBusyChange={vi.fn()} />);
    fireEvent.change(input(), { target: { value: '0001' } });
    fireEvent.click(add());
    await screen.findByRole('alert');
    expect(input()).toHaveValue('0001');
    expect(onAdd).not.toHaveBeenCalled();
  });
  it('does not add the same successful list again when the add button is clicked twice', async () => {
    const onAdd = vi.fn();
    render(<InvoiceBulkCodes onAdd={onAdd} onBusyChange={vi.fn()} />);
    fireEvent.change(input(), { target: { value: '0001' } });
    fireEvent.click(add());
    fireEvent.click(screen.getByRole('button', { name: 'Procesando códigos…' }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledOnce());
    expect(input()).toHaveValue('');
    expect(add()).toBeDisabled();
  });
  it('adds items to the actual invoice table, merges quantities and preserves tab input', async () => {
    render(<InvoiceForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir por códigos' }));
    fireEvent.change(input(), { target: { value: '0001,0001' } });
    fireEvent.click(add());
    await screen.findByText('Libro uno');
    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /24,68/ })).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: '0001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Concepto Manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Libro' }));
    expect(screen.getByPlaceholderText('Introduzca el código del libro...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir por códigos' }));
    expect(input()).toHaveValue('0001');
    fireEvent.click(add());
    await waitFor(() => expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument());
    expect(screen.getAllByText('Libro uno')).toHaveLength(1);
  });
});
