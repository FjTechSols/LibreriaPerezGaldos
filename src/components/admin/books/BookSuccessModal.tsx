
import { Book } from '../../../types';
import { Check, Copy, X } from 'lucide-react';

interface BookSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

export function BookSuccessModal({ isOpen, onClose, book }: BookSuccessModalProps) {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(book.code || '');
    // You could show a toast here, but for now the button feedback is enough
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md p-6 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200 bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-subtle)]"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
            <Check size={32} strokeWidth={3} />
          </div>

          <h2 className="text-2xl font-bold mb-2">¡Libro Creado!</h2>
          <p className="text-[var(--text-muted)] mb-6">
            El libro se ha registrado correctamente en el sistema.
          </p>

          <div className="w-full p-4 mb-6 rounded-xl bg-[var(--bg-page)]/50 border border-[var(--border-subtle)]">
            <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Código Generado</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-wider text-[var(--accent)] select-all">
                {book.code}
              </span>
              <button
                onClick={copyToClipboard}
                className="p-2 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--accent)] transition-colors"
                title="Copiar código"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div className="w-full text-left space-y-3 mb-8">
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
              <span className="text-sm text-[var(--text-muted)]">Título</span>
              <span className="font-medium truncate max-w-[200px]">{book.title}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
              <span className="text-sm text-[var(--text-muted)]">Autor</span>
              <span className="font-medium truncate max-w-[200px]">{book.author}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
              <span className="text-sm text-[var(--text-muted)]">Ubicación</span>
              <span className="font-medium">{book.ubicacion || 'N/A'}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--text-inverse)] font-bold transition-all shadow-lg"
          >
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
