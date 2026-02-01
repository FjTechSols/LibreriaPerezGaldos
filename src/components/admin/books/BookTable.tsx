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
        <div className="col-code">Cód</div>
        <div className="col-cover">Port</div>
        <div className="col-title text-left">Título</div>
        <div className="col-category text-left">Categoría</div>
        <div className="col-author text-left">Autor</div>
        <div className="col-publisher text-left">Editorial</div>
        <div className="col-pages text-center">Pág</div>
        <div className="col-price text-right">Precio</div>
        <div className="col-stock text-center">Stock</div>
        <div className="col-actions text-right">Acciones</div>
      </div>

      <div className="table-body">
        {books.map(book => {
          const stockStatus = 
            book.stock === 0 ? 'out' : 
            book.stock <= 2 ? 'low' : 'ok';

          return (
            <div key={book.id} className="admin-book-row">
              <div className="col-code text-center">
                  <span 
                      className="admin-book-code-badge"
                      onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCode({ code: book.code || 'N/A', top: rect.top, left: rect.left });
                      }}
                      onMouseLeave={() => setHoveredCode(null)}
                  >
                      {book.code || '---'}
                  </span>
              </div>

              <div className="col-cover">
                <div className="admin-book-thumbnail">
                  <img src={book.coverImage} alt={book.title || 'Sin Título'} />
                  <div className="badge-overlay">
                    {book.featured && <span className="badge-item featured" title="Destacado">📌</span>}
                    {book.isNew && <span className="badge-item new" title="Novedad">✨</span>}
                    {book.isOnSale && <span className="badge-item sale" title="Oferta">🏷️</span>}
                  </div>
                </div>
              </div>

              <div className="col-title">
                <div className="flex items-center gap-2">
                  {book.description && (
                    <button 
                        type="button"
                        className="info-trigger-btn"
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
                    >
                        <Info size={14} />
                    </button>
                  )}
                  <span className="book-title-main" title={book.title}>{book.title || 'Sin Título'}</span>
                </div>
              </div>

              <div className="col-category">
                <span className="category-text-main" title={book.category}>{book.category || 'N/A'}</span>
              </div>

              <div className="col-author">
                <span className="author-text-main" title={book.author}>{book.author || 'Anónimo'}</span>
              </div>

              <div className="col-publisher">
                <span className="publisher-text-main" title={book.publisher}>{book.publisher || 'N/A'}</span>
              </div>

              <div className="col-pages text-center">
                <span className="text-muted">{book.pages || '-'}</span>
              </div>

              <div className="col-price text-right">
                <div className="price-container">
                  <span className="price-value">{book.price.toFixed(2)}€</span>
                  {book.isOnSale && book.originalPrice && (
                    <span className="price-original">
                      {book.originalPrice.toFixed(2)}€
                    </span>
                  )}
                </div>
              </div>

              <div className="col-stock text-center flex items-center justify-center gap-2">
                <div className="stock-controls-vertical">
                    <button
                        onClick={() => onStockUpdate(book, 1)}
                        className="stock-btn-mini plus"
                        title="Aumentar Stock"
                    >
                        <Plus size={12} />
                    </button>
                    <button
                        onClick={() => onStockUpdate(book, -1)}
                        className="stock-btn-mini minus"
                        title="Reducir Stock"
                        disabled={book.stock <= 0}
                    >
                        <Minus size={12} />
                    </button>
                </div>
                <span className={`stock-badge is-${stockStatus}`}>
                  {book.stock}
                </span>
              </div>

              <div className="col-actions">
                <div className="actions-container">
                  <div className="main-btns-group">
                    <button 
                      onClick={() => onExpressOrder(book)}
                      className={`tool-btn zap ${orderMode === 'flash' ? 'flash active' : 'express'}`}
                      title={orderMode === 'flash' ? "Añadir a Pedido Flash" : "Pedido Express"}
                    >
                      <Zap size={14} className="fill-current" />
                    </button>
                    <button 
                      onClick={() => onEdit(book)}
                      className="tool-btn edit"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => onDelete(book.id)}
                      className="tool-btn delete"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
            className="fixed z-[9999] info-tooltip-overlay text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                top: hoveredDescription.top,
                left: hoveredDescription.left + 24, // Shift right of icon
            }}
        >
            <div className="info-tooltip-header">
                <span className="info-tooltip-title">Información del Libro</span>
                {hoveredDescription.year && (
                    <span className="info-tooltip-year">Año: {hoveredDescription.year}</span>
                )}
            </div>
            
            {hoveredDescription.isbn && (
                <div className="info-tooltip-item">
                    <span className="info-tooltip-label">ISBN:</span> 
                    <span className="info-tooltip-value">{hoveredDescription.isbn}</span>
                </div>
            )}

            <div className="info-tooltip-description">
                <span className="info-tooltip-description-label">Descripción:</span>
                <p className="leading-relaxed">{hoveredDescription.text || 'Sin descripción disponible.'}</p>
            </div>
        </div>
      )}
    </div>
  );
}
