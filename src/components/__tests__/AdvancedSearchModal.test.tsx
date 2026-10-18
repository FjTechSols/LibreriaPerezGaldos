import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdvancedSearchModal from '../AdvancedSearchModal';

describe('advanced search modal', () => {
  it('submits trimmed title and internal code on Enter', () => {
    const onSearch = vi.fn();
    const onClose = vi.fn();
    render(<AdvancedSearchModal isOpen onSearch={onSearch} onClose={onClose} />);
    const title = screen.getByPlaceholderText('Ej: Don Quijote de la Mancha');
    fireEvent.change(title, { target: { value: '  historia universal  ' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: 0229...'), { target: { value: ' 0229 ' } });
    fireEvent.keyDown(title, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledExactlyOnceWith({ titulo: 'historia universal', legacy_id: '0229' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('restores applied filters when reopened and clears all six fields', () => {
    const onSearch = vi.fn();
    const props = { onSearch, onClose: vi.fn(), initialCriteria: { titulo: 'historia universal', legacy_id: '0229' } };
    const { rerender } = render(<AdvancedSearchModal {...props} isOpen />);
    expect(screen.getByDisplayValue('historia universal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Realizar Búsqueda' }));
    expect(onSearch).toHaveBeenLastCalledWith({});
    rerender(<AdvancedSearchModal {...props} isOpen={false} />);
    rerender(<AdvancedSearchModal {...props} isOpen />);
    expect(screen.getByDisplayValue('historia universal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0229')).toBeInTheDocument();
  });
});
