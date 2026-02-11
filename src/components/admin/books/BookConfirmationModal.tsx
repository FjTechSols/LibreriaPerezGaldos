
import { Book } from '../../../types';
import { X, Check } from 'lucide-react';

interface BookConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: Partial<Book>;
  isCreating: boolean;
}

export function BookConfirmationModal({ isOpen, onClose, onConfirm, formData, isCreating }: BookConfirmationModalProps) {
  if (!isOpen) return null;

  const renderField = (label: string, value: string | number | undefined | null) => {
      if (value === undefined || value === null || value === '') return null;
      return (
          <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</span>
              <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold text-right max-w-[60%] truncate" title={String(value)}>
                  {value}
              </span>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {isCreating ? 'Confirmar Nuevo Libro' : 'Confirmar Edición'}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
                    Por favor revisa los datos antes de guardar.
                </p>
            </div>

            <div className="space-y-1">
                {renderField('Título', formData.title)}
                {renderField('Autor', formData.author)}
                {renderField('Editorial', formData.publisher)}
                {renderField('Año', formData.publicationYear)}
                {renderField('ISBN', formData.isbn)}
                {renderField('Categoría', formData.category)}
                {renderField('Ubicación', formData.ubicacion)}
                {renderField('Precio', `${formData.price}€`)}
                {formData.originalPrice && renderField('Precio Original', `${formData.originalPrice}€`)}
                {renderField('Stock', formData.stock)}
                {renderField('Páginas', formData.pages)}
                {renderField('Idioma', formData.language)}
                {renderField('Estado', formData.condition)}
            </div>
            
            {(formData.featured || formData.isNew || formData.isOnSale || formData.isOutOfPrint) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Etiquetas</span>
                    <div className="flex flex-wrap gap-2">
                        {formData.featured && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Destacado</span>}
                        {formData.isNew && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Nuevo</span>}
                        {formData.isOnSale && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Oferta</span>}
                        {formData.isOutOfPrint && <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Descatalogado</span>}
                    </div>
                </div>
            )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end bg-gray-50 dark:bg-gray-900/50">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                Volver a Editar
            </button>
            <button 
                onClick={onConfirm}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg shadow-md flex items-center gap-2 transition-colors"
            >
                <Check size={18} />
                {isCreating ? 'Confirmar y Crear' : 'Confirmar y Guardar'}
            </button>
        </div>
      </div>
    </div>
  );
}
