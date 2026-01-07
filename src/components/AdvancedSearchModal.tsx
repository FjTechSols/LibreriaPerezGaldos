import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { AdvancedSearchCriteria } from '../types';
import { useTheme } from '../context/ThemeContext';

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
  const { actualTheme } = useTheme();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className={`${actualTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border ${actualTheme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${actualTheme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-white'}`}>
          <h2 className="text-2xl font-bold">Búsqueda Avanzada</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Título
            </label>
            <input
              type="text"
              value={criteria.titulo}
              onChange={(e) => handleInputChange('titulo', e.target.value)}
              placeholder="Ej: Don Quijote de la Mancha"
              onKeyDown={handleKeyDown}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Autor */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Autor
              </label>
              <input
                type="text"
                value={criteria.autor}
                onChange={(e) => handleInputChange('autor', e.target.value)}
                placeholder="Ej: Miguel de Cervantes"
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-base"
              />
            </div>

            {/* Editorial */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Editorial
              </label>
              <input
                type="text"
                value={criteria.editorial}
                onChange={(e) => handleInputChange('editorial', e.target.value)}
                placeholder="Ej: Alfaguara"
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ISBN */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                ISBN
              </label>
              <input
                type="text"
                value={criteria.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                placeholder="Ej: 9781234567890"
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-base"
              />
            </div>

            {/* Código Interno */}
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Código Interno (Ref)
              </label>
              <input
                type="text"
                value={criteria.legacy_id || ''}
                onChange={(e) => handleInputChange('legacy_id', e.target.value)}
                placeholder="Ej: 0229..."
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-base"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Descripción
            </label>
            <input
              type="text"
              value={criteria.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Palabras clave en la descripción..."
              onKeyDown={handleKeyDown}
              className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-base"
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${actualTheme === 'dark' ? 'border-gray-800 bg-gray-900/80' : 'border-gray-100 bg-gray-50'}`}>
          <button
            onClick={handleClear}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Limpiar todo
          </button>
          <div className="flex gap-3 ml-2 border-l border-gray-200 dark:border-gray-700 pl-5">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSearch}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2.5 shadow-lg shadow-blue-500/20 active:transform active:scale-95"
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
