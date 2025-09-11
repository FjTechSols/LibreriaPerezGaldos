import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, BarChart3, Book, Users, DollarSign } from 'lucide-react';
import { Book as BookType } from '../../types';
import { mockBooks, categories } from '../../data/mockBooks';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';

export function AdminDashboard() {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookType[]>(mockBooks);
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'books' | 'stats'>('books');

  const [newBook, setNewBook] = useState<Partial<BookType>>({
    title: '',
    author: '',
    publisher: '',
    pages: 0,
    publicationYear: new Date().getFullYear(),
    isbn: '',
    price: 0,
    stock: 0,
    category: categories[1],
    description: '',
    coverImage: '',
    rating: 0,
    reviews: []
  });

  if (user?.role !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="access-denied">
            <h1>Acceso Denegado</h1>
            <p>No tienes permisos para acceder a esta página</p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateBook = () => {
    if (newBook.title && newBook.author && newBook.publisher && newBook.isbn && newBook.price) {
      const bookToAdd: BookType = {
        id: Date.now().toString(),
        title: newBook.title,
        author: newBook.author,
        publisher: newBook.publisher,
        pages: newBook.pages || 0,
        publicationYear: newBook.publicationYear || new Date().getFullYear(),
        isbn: newBook.isbn,
        price: newBook.price,
        stock: newBook.stock || 0,
        category: newBook.category || categories[1],
        description: newBook.description || '',
        coverImage: newBook.coverImage || 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: newBook.rating || 0,
        reviews: []
      };

      setBooks(prev => [...prev, bookToAdd]);
      setNewBook({
        title: '',
        author: '',
        publisher: '',
        pages: 0,
        publicationYear: new Date().getFullYear(),
        isbn: '',
        price: 0,
        stock: 0,
        category: categories[1],
        description: '',
        coverImage: '',
        rating: 0,
        reviews: []
      });
      setIsCreating(false);
    }
  };

  const handleEditBook = (book: BookType) => {
    setEditingBook({ ...book });
  };

  const handleSaveEdit = () => {
    if (editingBook) {
      setBooks(prev => prev.map(book => 
        book.id === editingBook.id ? editingBook : book
      ));
      setEditingBook(null);
    }
  };

  const handleDeleteBook = (bookId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este libro?')) {
      setBooks(prev => prev.filter(book => book.id !== bookId));
    }
  };

  const stats = {
    totalBooks: books.length,
    totalValue: books.reduce((sum, book) => sum + book.price * book.stock, 0),
    inStock: books.filter(book => book.stock > 0).length,
    outOfStock: books.filter(book => book.stock === 0).length,
    avgRating: books.reduce((sum, book) => sum + book.rating, 0) / books.length
  };

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Panel de Administrador</h1>
          <p className="dashboard-subtitle">Gestión de libros y estadísticas</p>
        </div>

        <div className="dashboard-tabs">
          <button 
            onClick={() => setActiveTab('books')}
            className={`tab-btn ${activeTab === 'books' ? 'active' : ''}`}
          >
            <Book size={20} />
            Gestión de Libros
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            Estadísticas
          </button>
        </div>

        {activeTab === 'stats' && (
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon books">
                  <Book size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{stats.totalBooks}</span>
                  <span className="stat-label">Total Libros</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon value">
                  <DollarSign size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">${stats.totalValue.toFixed(0)}</span>
                  <span className="stat-label">Valor Inventario</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stock">
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{stats.inStock}</span>
                  <span className="stat-label">En Stock</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon rating">
                  <BarChart3 size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{stats.avgRating.toFixed(1)}</span>
                  <span className="stat-label">Rating Promedio</span>
                </div>
              </div>
            </div>

            <div className="detailed-stats">
              <h3>Estadísticas Detalladas</h3>
              <div className="stats-details-grid">
                <div className="detail-item">
                  <span>Libros con stock:</span>
                  <span>{stats.inStock} ({Math.round((stats.inStock / stats.totalBooks) * 100)}%)</span>
                </div>
                <div className="detail-item">
                  <span>Libros agotados:</span>
                  <span>{stats.outOfStock} ({Math.round((stats.outOfStock / stats.totalBooks) * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div className="books-section">
            <div className="books-header">
              <h2 className="books-title">Gestión de Libros</h2>
              <button 
                onClick={() => setIsCreating(true)}
                className="create-btn"
              >
                <Plus size={20} />
                Nuevo Libro
              </button>
            </div>

            {(isCreating || editingBook) && (
              <div className="book-form-modal">
                <div className="book-form">
                  <div className="form-header">
                    <h3>{isCreating ? 'Crear Nuevo Libro' : 'Editar Libro'}</h3>
                    <button 
                      onClick={() => {
                        setIsCreating(false);
                        setEditingBook(null);
                      }}
                      className="close-btn"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Título</label>
                      <input
                        type="text"
                        value={isCreating ? newBook.title : editingBook?.title}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, title: e.target.value }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, title: e.target.value } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="Título del libro"
                      />
                    </div>

                    <div className="form-group">
                      <label>Autor</label>
                      <input
                        type="text"
                        value={isCreating ? newBook.author : editingBook?.author}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, author: e.target.value }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, author: e.target.value } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="Autor del libro"
                      />
                    </div>

                    <div className="form-group">
                      <label>Editorial</label>
                      <input
                        type="text"
                        value={isCreating ? newBook.publisher : editingBook?.publisher}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, publisher: e.target.value }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, publisher: e.target.value } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="Editorial del libro"
                      />
                    </div>

                    <div className="form-group">
                      <label>Páginas</label>
                      <input
                        type="number"
                        value={isCreating ? newBook.pages : editingBook?.pages}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, pages: Number(e.target.value) }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, pages: Number(e.target.value) } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Año de Publicación</label>
                      <input
                        type="number"
                        value={isCreating ? newBook.publicationYear : editingBook?.publicationYear}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, publicationYear: Number(e.target.value) }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, publicationYear: Number(e.target.value) } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="2024"
                      />
                    </div>

                    <div className="form-group">
                      <label>ISBN</label>
                      <input
                        type="text"
                        value={isCreating ? newBook.isbn : editingBook?.isbn}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, isbn: e.target.value }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, isbn: e.target.value } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="ISBN del libro"
                      />
                    </div>

                    <div className="form-group">
                      <label>Precio (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={isCreating ? newBook.price : editingBook?.price}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, price: Number(e.target.value) }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, price: Number(e.target.value) } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group">
                      <label>Stock</label>
                      <input
                        type="number"
                        value={isCreating ? newBook.stock : editingBook?.stock}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, stock: Number(e.target.value) }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, stock: Number(e.target.value) } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Categoría</label>
                      <select
                        value={isCreating ? newBook.category : editingBook?.category}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, category: e.target.value }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, category: e.target.value } : null);
                          }
                        }}
                        className="form-select"
                      >
                        {categories.slice(1).map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>URL de Portada</label>
                      <input
                        type="url"
                        value={isCreating ? newBook.coverImage : editingBook?.coverImage}
                        onChange={(e) => {
                          if (isCreating) {
                            setNewBook(prev => ({ ...prev, coverImage: e.target.value }));
                          } else {
                            setEditingBook(prev => prev ? { ...prev, coverImage: e.target.value } : null);
                          }
                        }}
                        className="form-input"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Descripción</label>
                    <textarea
                      value={isCreating ? newBook.description : editingBook?.description}
                      onChange={(e) => {
                        if (isCreating) {
                          setNewBook(prev => ({ ...prev, description: e.target.value }));
                        } else {
                          setEditingBook(prev => prev ? { ...prev, description: e.target.value } : null);
                        }
                      }}
                      className="form-textarea"
                      placeholder="Descripción del libro..."
                      rows={4}
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      onClick={isCreating ? handleCreateBook : handleSaveEdit}
                      className="save-btn"
                    >
                      <Save size={16} />
                      {isCreating ? 'Crear Libro' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              </div>
            )}

           <div className="books-table">
              <div className="table-header">
                <div>Portada</div>
                <div>Título</div>
                <div>Autor</div>
                <div>Editorial</div>
                <div>Categoría</div>
                <div>Páginas</div>
                <div>Precio</div>
                <div>Stock</div>
                <div>Acciones</div>
              </div>

                {books.map((book) => (
                  <div key={book.id} className="table-row">
                    <div className="book-cover">
                      <img src={book.coverImage} alt={book.title} />
                    </div>
                    <div className="book-title-cell">{book.title}</div>
                    <div className="book-author-cell">{book.author}</div>
                    <div className="book-publisher-cell">{book.publisher}</div>
                    <div className="book-category-cell">{book.category}</div>
                    <div className="book-pages-cell">{book.pages}</div>
                    <div className="book-price-cell">{book.price}€</div>
                    <div
                      className={`book-stock-cell ${
                        book.stock === 0 ? "out-of-stock" : ""
                      }`}
                    >
                      {book.stock}
                    </div>
                    <div className="book-actions">
                      <button
                        onClick={() => handleEditBook(book)}
                        className="edit-btn"
                        aria-label="Editar libro"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="delete-btn"
                        aria-label="Eliminar libro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}