import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, RefreshCw, Layers } from 'lucide-react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria, findDuplicates, mergeCategories, normalizeCategoryName } from '../../../services/categoriaService';
import { Categoria } from '../../../types';
import '../../../styles/components/MetadataManager.css';

export function CategoryManager() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Normalization State
  const [duplicates, setDuplicates] = useState<[string, Categoria[]][]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [processingMerge, setProcessingMerge] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await getCategorias();
    setCategories(data);
    setLoading(false);
  };

  const handleScanDuplicates = () => {
    const dups = findDuplicates(categories);
    setDuplicates(dups);
    setShowDuplicates(true);
  };

  const handleMergeGroup = async (name: string, group: Categoria[]) => {
    if (!window.confirm(`¿Fusionar ${group.length} categorías en una sola llamada "${normalizeCategoryName(name)}"?`)) return;
    
    setProcessingMerge(true);
    try {
        // 1. Determine Master (Prefer shortest valid ID or one with description)
        // For simplicity, pick the first one as master, or create a new clean one? 
        // Better: Pick the one that matches normalized name exactly if exists, or just first one.
        
        let master = group.find(c => c.nombre === normalizeCategoryName(name));
        if (!master) master = group[0];

        // 2. Ensure master has the normalized name if needed
        if (master.nombre !== normalizeCategoryName(name)) {
            await updateCategoria(master.id, { nombre: normalizeCategoryName(name) });
        }

        const masterId = master.id;
        const others = group.filter(c => c.id !== masterId).map(c => c.id);

        if (others.length > 0) {
            const result = await mergeCategories(masterId, others);
            if (result.success) {
               // Update local state
               await loadCategories();
               // Re-scan or remove from local duplicates list
               setDuplicates(prev => prev.filter(([n]) => n !== name));
            } else {
                alert('Error: ' + result.message);
            }
        }
    } catch (error) {
        console.error(error);
        alert('Error al fusionar');
    } finally {
        setProcessingMerge(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.descripcion && cat.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategoria(editingCategory.id, formData);
      } else {
        await createCategoria(formData);
      }
      await loadCategories();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert('Error al guardar la categoría');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;
    
    try {
        const success = await deleteCategoria(id);
        if (success) {
            setCategories(prev => prev.filter(c => c.id !== id));
        } else {
            alert('No se pudo eliminar. Puede que esté en uso por algunos libros.');
        }
    } catch (error) {
        console.error(error);
    }
  };

  const handleOpenModal = (category?: Categoria) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ 
        nombre: category.nombre, 
        descripcion: category.descripcion || '' 
      });
    } else {
      setEditingCategory(null);
      setFormData({ nombre: '', descripcion: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ nombre: '', descripcion: '' });
  };

  return (
    <div className="metadata-content">
      <div className="metadata-actions-header">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={handleScanDuplicates} title="Buscar categorías duplicadas">
            <Layers size={18} /> Normalizar
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Nueva Categoría
          </button>
        </div>
      </div>

      {showDuplicates && duplicates.length > 0 && (
        <div className="duplicates-panel">
            <div className="duplicates-header">
                <h3>Categorías Duplicadas ({duplicates.length} grupos)</h3>
                <button 
                  onClick={() => setShowDuplicates(false)}
                  className="btn-icon"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="duplicates-list">
                {duplicates.map(([name, group]) => (
                    <div key={name} className="duplicate-item">
                        <div className="duplicate-info">
                            <span className="duplicate-name">"{normalizeCategoryName(name)}"</span>
                            <span className="duplicate-details">
                                se creará fusionando: {group.map(c => c.nombre).join(', ')}
                            </span>
                        </div>
                        <button 
                            className="btn-primary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => handleMergeGroup(name, group)}
                            disabled={processingMerge}
                        >
                            <RefreshCw size={14} style={{ marginRight: '4px' }} />
                            Fusionar ({group.length})
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {showDuplicates && duplicates.length === 0 && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '8px' }}>
              ¡Todo limpio! No se encontraron duplicados obvios.
          </div>
      )}

      <div className="metadata-table-container">
        <table className="metadata-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center' }}>Cargando...</td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center' }}>No se encontraron categorías</td>
              </tr>
            ) : (
              filteredCategories.map((category) => (
                <tr key={category.id}>
                  <td>{category.nombre}</td>
                  <td>{category.descripcion || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon" 
                        title="Editar"
                        onClick={() => handleOpenModal(category)}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        title="Eliminar"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  required
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
