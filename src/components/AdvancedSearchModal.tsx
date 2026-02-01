import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { AdvancedSearchCriteria } from '../types';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (criteria: AdvancedSearchCriteria) => void;
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch
}) => {
  const [criteria, setCriteria] = useState<AdvancedSearchCriteria>({
    titulo: '',
    autor: '',
    editorial: '',
    isbn: '',
    descripcion: ''
  });

  const handleInputChange = (field: keyof AdvancedSearchCriteria, value: string) => {
    setCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    // Filter out empty fields
    const filteredCriteria: AdvancedSearchCriteria = {};
    Object.entries(criteria).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        filteredCriteria[key as keyof AdvancedSearchCriteria] = value.trim();
      }
    });

    onSearch(filteredCriteria);
    handleClear(); // Clear form after search
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setCriteria({
      titulo: '',
      autor: '',
      editorial: '',
      isbn: '',
      descripcion: ''
    });
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-[var(--border-subtle)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]/50">
          <h2 className="text-2xl font-bold">Búsqueda Avanzada</h2>
          <button
            onClick={handleClose}
            className="p-2 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-[var(--bg-hover)]"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Título
            </label>
            <input
              type="text"
              value={criteria.titulo}
              onChange={(e) => handleInputChange('titulo', e.target.value)}
              placeholder="Ej: Don Quijote de la Mancha"
              onKeyDown={handleKeyDown}
              className="w-full px-5 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder:text-[var(--text-dim)] text-base text-[var(--text-main)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Autor */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Autor
              </label>
              <input
                type="text"
                value={criteria.autor}
                onChange={(e) => handleInputChange('autor', e.target.value)}
                placeholder="Ej: Miguel de Cervantes"
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder:text-[var(--text-dim)] text-base text-[var(--text-main)]"
              />
            </div>

            {/* Editorial */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Editorial
              </label>
              <input
                type="text"
                value={criteria.editorial}
                onChange={(e) => handleInputChange('editorial', e.target.value)}
                placeholder="Ej: Alfaguara"
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder:text-[var(--text-dim)] text-base text-[var(--text-main)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ISBN */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                ISBN
              </label>
              <input
                type="text"
                value={criteria.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                placeholder="Ej: 9781234567890"
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder:text-[var(--text-dim)] text-base text-[var(--text-main)]"
              />
            </div>

            {/* Código Interno */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Código Interno (Ref)
              </label>
              <input
                type="text"
                value={criteria.legacy_id || ''}
                onChange={(e) => handleInputChange('legacy_id', e.target.value)}
                placeholder="Ej: 0229..."
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder:text-[var(--text-dim)] text-base text-[var(--text-main)]"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Descripción
            </label>
            <input
              type="text"
              value={criteria.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Palabras clave en la descripción..."
              onKeyDown={handleKeyDown}
              className="w-full px-5 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition-all placeholder:text-[var(--text-dim)] text-base text-[var(--text-main)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-page)]/50">
          <button
            onClick={handleClear}
            className="px-6 py-2.5 text-sm font-medium text-[var(--text-muted)] bg-transparent hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
          >
            Limpiar todo
          </button>
          <div className="flex gap-3 ml-2 border-l border-[var(--border-subtle)] pl-5">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-sm font-medium text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSearch}
              className="px-8 py-2.5 bg-[var(--accent)] text-[var(--text-inverse)] text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2.5 shadow-lg active:transform active:scale-95"
            >
              <Search size={18} />
              Realizar Búsqueda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;
