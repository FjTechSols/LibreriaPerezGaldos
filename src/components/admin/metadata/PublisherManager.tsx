import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { getEditoriales, createEditorial, updateEditorial, deleteEditorial } from '../../../services/editorialService';
import { Editorial } from '../../../types';
import '../../../styles/components/MetadataManager.css';

export function PublisherManager() {
  const [publishers, setPublishers] = useState<Editorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Editorial | null>(null);
  const [formData, setFormData] = useState({ nombre: '', direccion: '', telefono: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPublishers();
  }, []);

  const loadPublishers = async () => {
    setLoading(true);
    const data = await getEditoriales();
    setPublishers(data);
    setLoading(false);
  };

  const filteredPublishers = publishers.filter(pub => 
    pub.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setSubmitting(true);
    try {
      if (editingPublisher) {
        await updateEditorial(editingPublisher.id, formData);
      } else {
        await createEditorial(formData);
      }
      await loadPublishers();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert('Error al guardar la editorial');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta editorial?')) return;
    
    try {
        const success = await deleteEditorial(id);
        if (success) {
            setPublishers(prev => prev.filter(p => p.id !== id));
        } else {
            alert('No se pudo eliminar. Puede que esté en uso por algunos libros.');
        }
    } catch (error) {
        console.error(error);
    }
  };

  const handleOpenModal = (publisher?: Editorial) => {
    if (publisher) {
      setEditingPublisher(publisher);
      setFormData({ 
        nombre: publisher.nombre, 
        direccion: publisher.direccion || '',
        telefono: publisher.telefono || ''
      });
    } else {
      setEditingPublisher(null);
      setFormData({ nombre: '', direccion: '', telefono: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPublisher(null);
    setFormData({ nombre: '', direccion: '', telefono: '' });
  };

  return (
    <div className="metadata-content">
      <div className="metadata-actions-header">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar editoriales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nueva Editorial
        </button>
      </div>

      <div className="metadata-table-container">
        <table className="metadata-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th style={{ width: '100px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>Cargando...</td>
              </tr>
            ) : filteredPublishers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>No se encontraron editoriales</td>
              </tr>
            ) : (
              filteredPublishers.map((publisher) => (
                <tr key={publisher.id}>
                  <td>{publisher.nombre}</td>
                  <td>{publisher.direccion || '-'}</td>
                  <td>{publisher.telefono || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon" 
                        title="Editar"
                        onClick={() => handleOpenModal(publisher)}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        title="Eliminar"
                        onClick={() => handleDelete(publisher.id)}
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
                {editingPublisher ? 'Editar Editorial' : 'Nueva Editorial'}
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
                <label className="form-label">Dirección</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.direccion}
                  onChange={e => setFormData({...formData, direccion: e.target.value})}
                />
              </div>

               <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.telefono}
                  onChange={e => setFormData({...formData, telefono: e.target.value})}
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
