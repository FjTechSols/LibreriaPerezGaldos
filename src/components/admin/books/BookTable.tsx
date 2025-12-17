import { Edit, Trash2, Plus, Minus } from 'lucide-react';
import { Book } from '../../../types';

interface BookTableProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onStockUpdate: (book: Book, amount: number) => void;
}

export function BookTable({ books, onEdit, onDelete, onStockUpdate }: BookTableProps) {
  return (
    <div className="data-table books-table">
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
        <div key={book.id} className="table-row">
          <span className="book-code-cell">{book.code || 'N/A'}</span>
          <div className="book-cover">
            <img src={book.coverImage} alt={book.title || 'Sin Título'} />
            {(book.featured || book.isNew || book.isOnSale) && (
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', fontSize: '0.7rem' }}>
                {book.featured && <span title="Destacado">📌</span>}
                {book.isNew && <span title="Nuevo">✨</span>}
                {book.isOnSale && <span title="En Oferta">🏷️</span>}
              </div>
            )}
          </div>
          <span className="book-title-cell">
            {book.title || 'N/A'}
            {(book.featured || book.isNew || book.isOnSale) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                {book.featured && <span style={{ color: '#f59e0b' }} title="Destacado">📌</span>}
                {book.isNew && <span style={{ color: '#10b981' }} title="Nuevo">✨</span>}
                {book.isOnSale && <span style={{ color: '#ef4444' }} title="En Oferta">🏷️</span>}
              </div>
            )}
          </span>
          <span className="book-author-cell">{book.author || 'N/A'}</span>
          <span className="book-publisher-cell">{book.publisher || 'N/A'}</span>
          <span className="book-category-cell">{book.category || 'N/A'}</span>
          <span className="book-pages-cell">{book.pages || 'N/A'}</span>
          <span className="book-price-cell">
            ${book.price}
            {book.isOnSale && book.originalPrice && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', textDecoration: 'line-through', marginTop: '0.25rem' }}>
                ${book.originalPrice}
              </span>
            )}
          </span>
          <span className={`book-stock-cell ${book.stock === 0 ? 'out-of-stock' : ''}`}>
            {book.stock}
          </span>
          <div className="book-actions">
           <div className="stock-actions">
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
    </div>
  );
}
