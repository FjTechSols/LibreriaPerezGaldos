
import { Book } from '../../../types';
import { Check, Copy, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

interface BookSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

export function BookSuccessModal({ isOpen, onClose, book }: BookSuccessModalProps) {
  const { actualTheme } = useTheme();
  
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(book.code || '');
    // You could show a toast here, but for now the button feedback is enough
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md p-6 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200"
        style={{ 
          background: actualTheme === 'dark' ? '#1f2937' : 'white',
          color: actualTheme === 'dark' ? '#f3f4f6' : '#111827',
          border: '1px solid var(--border-color)'
        }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <Check size={32} strokeWidth={3} />
          </div>

          <h2 className="text-2xl font-bold mb-2">¡Libro Creado!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            El libro se ha registrado correctamente en el sistema.
          </p>

          <div className="w-full p-4 mb-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Código Generado</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400 select-all">
                {book.code}
              </span>
              <button
                onClick={copyToClipboard}
                className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                title="Copiar código"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="w-full text-left space-y-3 mb-8">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Título</span>
              <span className="font-medium truncate max-w-[200px]">{book.title}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Autor</span>
              <span className="font-medium truncate max-w-[200px]">{book.author}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-500 dark:text-gray-400">Ubicación</span>
              <span className="font-medium">{book.ubicacion || 'N/A'}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
