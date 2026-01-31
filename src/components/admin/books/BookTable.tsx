import { useState } from 'react';
import { Edit, Trash2, Plus, Minus, Zap, Info } from 'lucide-react';
import { Book } from '../../../types';
import { useOrder } from '../../../context/OrderContext';

interface BookTableProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onStockUpdate: (book: Book, amount: number) => void;
  onExpressOrder: (book: Book) => void;
}

export function BookTable({ books, onEdit, onDelete, onStockUpdate, onExpressOrder }: BookTableProps) {
  const { orderMode } = useOrder();
  const [hoveredCode, setHoveredCode] = useState<{ code: string; top: number; left: number } | null>(null);
  const [hoveredDescription, setHoveredDescription] = useState<{ text: string; year?: number; isbn?: string; top: number; left: number } | null>(null);
  return (
    <div className="data-table admin-books-table">
      <div className="table-header">
        <span>Código</span>
        <span>Portada</span>
        <span>Título</span>
        <span>Autor</span>
        <span>Editorial</span>
        <span>Categoría</span>
        <span>Páginas</span>
        <span>Precio</span>
        <span>Stock</span>
        <span>Acciones</span>
      </div>

      {books.map(book => (
        <div key={book.id} className="admin-book-row">
          <div className="relative text-center">
              <span 
                  className="admin-book-code cursor-help border-b border-dotted border-gray-400 dark:border-gray-500 inline-block"
                  onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCode({ code: book.code || 'N/A', top: rect.top, left: rect.left });
                  }}
                  onMouseLeave={() => setHoveredCode(null)}
              >
                  {book.code || 'N/A'}
              </span>
          </div>
          <div className="admin-book-cover">
            <img src={book.coverImage} alt={book.title || 'Sin Título'} />
            {(book.featured || book.isNew || book.isOnSale) && (
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                {book.featured && <span title="Destacado">📌</span>}
                {book.isNew && <span title="Nuevo">✨</span>}
                {book.isOnSale && <span title="En Oferta">🏷️</span>}
              </div>
            )}
          </div>
          <span className="admin-book-title flex items-center gap-2">
            {book.description && (
                <div className="relative flex-shrink-0">
                    <Info 
                        size={16} 
                        className="text-gray-400 hover:text-blue-500 cursor-help"
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDescription({ 
                                text: book.description || '', 
                                year: book.publicationYear,
                                isbn: book.isbn,
                                top: rect.top, 
                                left: rect.left 
                            });
                        }}
                        onMouseLeave={() => setHoveredDescription(null)}
                    />
                </div>
            )}
            <span className="leading-tight" title={book.title}>{book.title || 'N/A'}</span>
            {(book.featured || book.isNew || book.isOnSale) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                {book.featured && <span style={{ color: '#f59e0b' }} title="Destacado">📌</span>}
                {book.isNew && <span style={{ color: '#10b981' }} title="Nuevo">✨</span>}
                {book.isOnSale && <span style={{ color: '#ef4444' }} title="En Oferta">🏷️</span>}
              </div>
            )}
          </span>
          <span className="admin-book-author">{book.author || 'N/A'}</span>
          <span className="admin-book-publisher">{book.publisher || 'N/A'}</span>
          <span className="admin-book-category">{book.category || 'N/A'}</span>
          <span className="admin-book-pages">{book.pages || 'N/A'}</span>
          <span className="admin-book-price">
            ${book.price}
            {book.isOnSale && book.originalPrice && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', textDecoration: 'line-through', marginTop: '0.25rem' }}>
                ${book.originalPrice}
              </span>
            )}
          </span>
          <span className={`admin-book-stock ${book.stock === 0 ? 'out-of-stock' : ''}`}>
            {book.stock}
          </span>
          <div className="admin-book-actions">
           <div className="admin-stock-actions">
              <button
                  onClick={() => onStockUpdate(book, 1)}
                  className="stock-btn increase"
                  title="Aumentar Stock"
              >
                  <Plus size={16} />
              </button>
              <button
                  onClick={() => onStockUpdate(book, -1)}
                  className="stock-btn decrease"
                  title="Reducir Stock"
                  disabled={book.stock <= 0}
              >
                  <Minus size={16} />
              </button>
           </div>
            <button 
              onClick={() => onExpressOrder(book)}
              className={orderMode === 'flash' 
                ? "p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                : "express-btn"
              }
              title={orderMode === 'flash' ? "Añadir a Pedido Flash" : "Pedido Express"}
              aria-label={orderMode === 'flash' ? "Añadir a pedido flash" : "Crear pedido express"}
            >
              <Zap size={16} className={orderMode === 'flash' ? "text-white fill-current" : ""} />
            </button>
            <button 
              onClick={() => onEdit(book)}
              className="edit-btn"
              aria-label="Editar libro"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={() => onDelete(book.id)}
              className="delete-btn"
              aria-label="Eliminar libro"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      {/* Fixed Code Projection Overlay */}
      {hoveredCode && (
        <div 
            className="fixed z-[9999] bg-white dark:bg-gray-900 border-2 border-blue-600 shadow-2xl rounded-2xl p-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200 pb-8 pr-12 min-w-[max-content] text-left"
            style={{ 
                top: hoveredCode.top - 10,
                left: hoveredCode.left,
            }}
        >
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-1.5 block">Código Legacy</span>
            <span className="text-6xl font-black text-gray-900 dark:text-white tracking-widest font-mono leading-none block">
                {hoveredCode.code}
            </span>
        </div>
      )}

      {/* Fixed Description Tooltip Overlay */}
      {hoveredDescription && (
        <div 
            className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 max-w-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                top: hoveredDescription.top,
                left: hoveredDescription.left + 24, // Shift right of icon
            }}
        >
            <div className="font-semibold mb-2 border-b border-gray-700 pb-1 flex justify-between items-center gap-4">
                <span>Información del Libro</span>
                {hoveredDescription.year && (
                    <span className="text-blue-400">Año: {hoveredDescription.year}</span>
                )}
            </div>
            
            {hoveredDescription.isbn && (
                <div className="mb-2 text-gray-400">
                    <span className="font-medium text-gray-300">ISBN:</span> {hoveredDescription.isbn}
                </div>
            )}

            <div className="text-gray-300 font-medium mb-1">Descripción:</div>
            <p className="leading-relaxed">{hoveredDescription.text || 'Sin descripción disponible.'}</p>
        </div>
      )}
    </div>
  );
}
``