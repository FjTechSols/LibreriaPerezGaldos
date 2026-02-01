import React, { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchBar } from '../SearchBar';
import { MemoryRouter, useSearchParams, useLocation, Routes, Route } from 'react-router-dom';
import * as libroService from '../../services/libroService';
import { LanguageProvider } from '../../context/LanguageContext';

// Mock service
vi.mock('../../services/libroService', () => ({
  buscarLibros: vi.fn(),
}));

// Helper component to observe location changes
const LocationDisplay = ({ onChange }: { onChange: (location: any) => void }) => {
  const location = useLocation();
  useEffect(() => {
    onChange(location);
  }, [location, onChange]);
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

const renderSearchBar = (props: any = {}, initialEntries = ['/']) => {
  const onLocationChange = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <LanguageProvider>
        <Routes>
          <Route path="*" element={
            <>
              <SearchBar {...props} />
              <LocationDisplay onChange={onLocationChange} />
            </>
          } />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );
  return { ...utils, onLocationChange };
};

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    renderSearchBar();
    expect(screen.getByPlaceholderText('Buscar libros...')).toBeInTheDocument();
  });

  it('updates internal state when typing', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Buscar libros...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Quijote' } });
    expect(input.value).toBe('Quijote');
  });

  it('clears input when clear button is clicked', () => {
    renderSearchBar();
    const input = screen.getByPlaceholderText('Buscar libros...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Quijote' } });
    
    const clearBtn = screen.getByLabelText('Limpiar búsqueda');
    fireEvent.click(clearBtn);
    
    expect(input.value).toBe('');
  });

  it('syncs with URL search params in "sync" mode', async () => {
    const { onLocationChange } = renderSearchBar({ mode: 'sync' });
    const input = screen.getByPlaceholderText('Buscar libros...') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'Cervantes' } });

    // Wait for debounce (400ms)
    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith(expect.objectContaining({
        search: '?search=Cervantes'
      }));
    }, { timeout: 2000 });
  });

  it('navigates on submit in "navigate" mode', async () => {
    const { onLocationChange } = renderSearchBar({ mode: 'navigate' });
    const input = screen.getByPlaceholderText('Buscar libros...') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'Don Quijote' } });
    
    const form = screen.getByRole('form', { name: /Explorar catálogo/i });
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith(expect.objectContaining({
        pathname: '/catalogo',
        search: '?search=Don%20Quijote'
      }));
    });
    
    expect(input.value).toBe(''); // Reset on navigate
  });

  it('shows suggestions when showSuggestions is true and query length >= 2', async () => {
    const mockBooks = [{ id: '1', title: 'Libro de Test', author: 'Autor 1', price: 10, coverImage: 'img.jpg' }];
    vi.mocked(libroService.buscarLibros).mockResolvedValue(mockBooks as any);

    renderSearchBar({ showSuggestions: true });
    const input = screen.getByPlaceholderText('Buscar libros...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Tes' } });

    await waitFor(() => {
      expect(screen.getByText('Libro de Test')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls onSearch callback when submitted', () => {
    const onSearchMock = vi.fn();
    renderSearchBar({ onSearch: onSearchMock });
    const input = screen.getByPlaceholderText('Buscar libros...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test query' } });
    
    const form = screen.getByRole('form', { name: /Explorar catálogo/i });
    fireEvent.submit(form);
    expect(onSearchMock).toHaveBeenCalledWith('Test query');
  });
});
