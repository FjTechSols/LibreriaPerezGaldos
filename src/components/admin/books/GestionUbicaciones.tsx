import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, MapPin } from 'lucide-react';
import { Ubicacion } from '../../../types';
import {
  obtenerTodasUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion
} from '../../../services/ubicacionService';
import '../../../styles/components/GestionUbicaciones.css';
import { MessageModal } from '../../MessageModal';

export function GestionUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activa: true
  });

  // MessageModal State
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    onConfirm?: () => void;
    showCancel?: boolean;
    buttonText?: string;
  }>({ title: '', message: '', type: 'info' });

  const showModal = (
      title: string, 
      message: string, 
      type: 'info' | 'error' | 'success' | 'warning' = 'info',
      onConfirm?: () => void
  ) => {
    setMessageModalConfig({ 
        title, 
        message, 
        type, 
        onConfirm,
        showCancel: !!onConfirm,
        buttonText: onConfirm ? 'Aceptar' : 'Cerrar'
    });
    setShowMessageModal(true);
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  const cargarUbicaciones = async () => {
    setLoading(true);
    const data = await obtenerTodasUbicaciones();
    setUbicaciones(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      showModal('Error', 'El nombre de la ubicación es obligatorio', 'error');
      return;
    }

    const nueva = await crearUbicacion(formData);
    if (nueva) {
      await cargarUbicaciones();
      setIsCreating(false);
      setFormData({ nombre: '', descripcion: '', activa: true });
      showModal('Éxito', 'Ubicación creada correctamente', 'success');
    } else {
      showModal('Error', 'Error al crear ubicación', 'error');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!formData.nombre.trim()) {
      showModal('Error', 'El nombre de la ubicación es obligatorio', 'error');
      return;
    }

    const actualizada = await actualizarUbicacion(id, formData);
    if (actualizada) {
      await cargarUbicaciones();
      setEditingId(null);
      setFormData({ nombre: '', descripcion: '', activa: true });
      showModal('Éxito', 'Ubicación actualizada correctamente', 'success');
    } else {
      showModal('Error', 'Error al actualizar ubicación', 'error');
    }
  };

  const handleDelete = (id: number) => {
    showModal(
        'Confirmar Desactivación',
        '¿Estás seguro de desactivar esta ubicación?',
        'warning',
        async () => {
            const success = await eliminarUbicacion(id);
            if (success) {
                await cargarUbicaciones();
                showModal('Éxito', 'Ubicación desactivada correctamente', 'success');
            } else {
                showModal('Error', 'Error al desactivar ubicación', 'error');
            }
        }
    );
  };

  const startEdit = (ubicacion: Ubicacion) => {
    setEditingId(ubicacion.id);
    setFormData({
      nombre: ubicacion.nombre,
      descripcion: ubicacion.descripcion || '',
      activa: ubicacion.activa
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ nombre: '', descripcion: '', activa: true });
  };

  if (loading) {
    return <div className="loading">Cargando ubicaciones...</div>;
  }

  return (
    <div className="gestion-ubicaciones">
      <div className="header-section">
        <div className="header-title">
          <MapPin size={32} />
          <div>
            <h2>Gestión de Ubicaciones</h2>
            <p>Administra las ubicaciones físicas de los libros en el almacén</p>
          </div>
        </div>
        {!isCreating && (
          <button
            className="btn-primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={20} />
            Nueva Ubicación
          </button>
        )}
      </div>

      {isCreating && (
        <div className="form-card">
          <h4>Nueva Ubicación</h4>
          <div className="form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Almacén, H20006547, A123456789"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción opcional de la ubicación"
              className="form-input"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={formData.activa}
                onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
              />
              Ubicación activa
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-success" onClick={handleCreate}>
              <Save size={18} />
              Guardar
            </button>
            <button className="btn-secondary" onClick={cancelEdit}>
              <X size={18} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="ubicaciones-list">
        {ubicaciones.length === 0 ? (
          <div className="empty-state">
            <MapPin size={48} />
            <p>No hay ubicaciones registradas</p>
            <p className="text-muted">Crea tu primera ubicación para comenzar</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ubicaciones.map((ubicacion) => (
                  <tr key={ubicacion.id} className={!ubicacion.activa ? 'inactive-row' : ''}>
                    {editingId === ubicacion.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="form-input"
                          />
                        </td>
                        <td>
                          <textarea
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="form-input"
                            rows={2}
                          />
                        </td>
                        <td>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={formData.activa}
                              onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                            />
                            {formData.activa ? 'Activa' : 'Inactiva'}
                          </label>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-icon btn-success"
                              onClick={() => handleUpdate(ubicacion.id)}
                              title="Guardar"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              className="btn-icon btn-secondary"
                              onClick={cancelEdit}
                              title="Cancelar"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="gu-col-name">
                          <strong>{ubicacion.nombre}</strong>
                        </td>
                        <td className="gu-col-desc">{ubicacion.descripcion || '-'}</td>
                        <td className="gu-col-status">
                          <span className={`badge ${ubicacion.activa ? 'badge-success' : 'badge-danger'}`}>
                            {ubicacion.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="gu-col-actions">
                          <div className="action-buttons">
                            <button
                              className="btn-icon btn-primary"
                              onClick={() => startEdit(ubicacion)}
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            {ubicacion.activa && (
                              <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDelete(ubicacion.id)}
                                title="Desactivar"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type as any}
        onConfirm={messageModalConfig.onConfirm}
        showCancel={messageModalConfig.showCancel}
        buttonText={messageModalConfig.buttonText}
      />
    </div>
  );
}
