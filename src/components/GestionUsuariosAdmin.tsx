import { useState, useEffect } from 'react';
import { Shield, UserPlus, Edit2, Trash2, Key, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  obtenerTodosLosUsuariosConRoles,
  obtenerTodosLosRoles,
  crearUsuarioAdministrativo,
  actualizarRolesUsuario,
  eliminarUsuario,
  cambiarPasswordUsuario,
  Rol,
  UsuarioConRoles
} from '../services/rolesService';
import { useAuth } from '../context/AuthContext';

export function GestionUsuariosAdmin() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConRoles[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioConRoles | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    rolId: 0,
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [usuariosData, rolesData] = await Promise.all([
        obtenerTodosLosUsuariosConRoles(),
        obtenerTodosLosRoles()
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
    } catch (err: any) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!formData.email || !formData.password || !formData.rolId) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      await crearUsuarioAdministrativo(
        formData.email,
        formData.password,
        formData.rolId,
        user?.id || '',
        formData.notas
      );

      setSuccess('Usuario creado exitosamente');
      setShowCreateModal(false);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        rolId: 0,
        notas: ''
      });
      await cargarDatos();
    } catch (err: any) {
      setError('Error al crear usuario: ' + err.message);
    }
  };

  const handleActualizarRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');
    setSuccess('');

    try {
      const rolesSeleccionados = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[name="roles"]:checked')
      ).map(input => parseInt(input.value));

      if (rolesSeleccionados.length === 0) {
        setError('Debes seleccionar al menos un rol');
        return;
      }

      await actualizarRolesUsuario(selectedUser.id, rolesSeleccionados, user?.id || '');
      setSuccess('Roles actualizados exitosamente');
      setShowEditModal(false);
      setSelectedUser(null);
      await cargarDatos();
    } catch (err: any) {
      setError('Error al actualizar roles: ' + err.message);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await cambiarPasswordUsuario(selectedUser.id, formData.password);
      setSuccess('Contraseña actualizada exitosamente');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setFormData({ ...formData, password: '', confirmPassword: '' });
    } catch (err: any) {
      setError('Error al cambiar contraseña: ' + err.message);
    }
  };

  const handleEliminarUsuario = async (usuario: UsuarioConRoles) => {
    if (usuario.id === user?.id) {
      setError('No puedes eliminarte a ti mismo');
      return;
    }

    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar al usuario ${usuario.email}? Esta acción no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      await eliminarUsuario(usuario.id);
      setSuccess('Usuario eliminado exitosamente');
      await cargarDatos();
    } catch (err: any) {
      setError('Error al eliminar usuario: ' + err.message);
    }
  };

  const getRolBadgeColor = (nivelJerarquia: number) => {
    switch (nivelJerarquia) {
      case 1: return '#dc2626';
      case 2: return '#2563eb';
      case 3: return '#16a34a';
      default: return '#64748b';
    }
  };

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>;
  }

  return (
    <div className="gestion-usuarios-admin">
      <div className="header-section">
        <div className="header-title">
          <Shield size={28} />
          <div>
            <h2>Gestión de Usuarios Administrativos</h2>
            <p>Administra usuarios y sus roles en el sistema</p>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setFormData({
              email: '',
              password: '',
              confirmPassword: '',
              rolId: '',
              notas: ''
            });
            setShowCreateModal(true);
          }}
        >
          <UserPlus size={20} />
          Crear Usuario
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="usuarios-table-container">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol Principal</th>
              <th>Roles</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id}>
                <td>
                  <div className="usuario-email">
                    {usuario.email}
                    {usuario.id === user?.id && (
                      <span className="badge-tu">(Tú)</span>
                    )}
                  </div>
                </td>
                <td>
                  {usuario.rol_principal && (
                    <span
                      className="rol-badge"
                      style={{
                        backgroundColor: getRolBadgeColor(usuario.rol_principal.nivel_jerarquia),
                        color: 'white'
                      }}
                    >
                      {usuario.rol_principal.display_name}
                    </span>
                  )}
                </td>
                <td>
                  <div className="roles-list">
                    {usuario.roles.map(rol => (
                      <span
                        key={rol.id}
                        className="rol-badge-small"
                        style={{
                          backgroundColor: getRolBadgeColor(rol.nivel_jerarquia) + '20',
                          color: getRolBadgeColor(rol.nivel_jerarquia),
                          border: `1px solid ${getRolBadgeColor(rol.nivel_jerarquia)}`
                        }}
                      >
                        {rol.display_name}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {new Date(usuario.created_at).toLocaleDateString('es-ES')}
                </td>
                <td>
                  <div className="acciones-btns">
                    <button
                      className="btn-icon"
                      title="Editar roles"
                      onClick={() => {
                        setSelectedUser(usuario);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon"
                      title="Cambiar contraseña"
                      onClick={() => {
                        setSelectedUser(usuario);
                        setFormData({ ...formData, password: '', confirmPassword: '' });
                        setShowPasswordModal(true);
                      }}
                    >
                      <Key size={16} />
                    </button>
                    {usuario.id !== user?.id && (
                      <button
                        className="btn-icon btn-danger"
                        title="Eliminar usuario"
                        onClick={() => handleEliminarUsuario(usuario)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Crear Nuevo Usuario Administrativo</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCrearUsuario} className="modal-form">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirmar Contraseña *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repite la contraseña"
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Rol *</label>
                <select
                  value={formData.rolId}
                  onChange={(e) => setFormData({ ...formData, rolId: parseInt(e.target.value) })}
                  required
                >
                  <option value="0">Selecciona un rol</option>
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.display_name} - {rol.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales sobre este usuario (opcional)"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Roles de {selectedUser.email}</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleActualizarRoles} className="modal-form">
              <div className="form-group">
                <label>Roles</label>
                <div className="roles-checkboxes">
                  {roles.map(rol => (
                    <label key={rol.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="roles"
                        value={rol.id}
                        defaultChecked={selectedUser.roles.some(r => r.id === rol.id)}
                      />
                      <div className="checkbox-content">
                        <strong>{rol.display_name}</strong>
                        <small>{rol.descripcion}</small>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Actualizar Roles
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cambiar Contraseña de {selectedUser.email}</h3>
              <button
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCambiarPassword} className="modal-form">
              <div className="form-group">
                <label>Nueva Contraseña *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirmar Nueva Contraseña *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repite la contraseña"
                  minLength={6}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .gestion-usuarios-admin {
          padding: 2rem;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .header-title h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .header-title p {
          margin: 0.5rem 0 0 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .alert-error {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-success {
          background-color: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .usuarios-table-container {
          background: white;
          border-radius: 8px;
          overflow-x: auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .usuarios-table {
          width: 100%;
          border-collapse: collapse;
        }

        .usuarios-table th,
        .usuarios-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .usuarios-table th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #475569;
          font-size: 0.875rem;
          text-transform: uppercase;
        }

        .usuario-email {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .badge-tu {
          background-color: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .rol-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .roles-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .rol-badge-small {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .acciones-btns {
          display: flex;
          gap: 0.5rem;
        }

        .btn-icon {
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.5rem;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background-color: #f1f5f9;
          color: #334155;
        }

        .btn-icon.btn-danger {
          color: #dc2626;
          border-color: #fecaca;
        }

        .btn-icon.btn-danger:hover {
          background-color: #fef2f2;
          border-color: #dc2626;
        }

        .btn-primary {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background-color: #1d4ed8;
        }

        .btn-secondary {
          background-color: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background-color: #f8fafc;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 0;
        }

        .modal-close:hover {
          color: #334155;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #334155;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .roles-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checkbox-label:hover {
          background-color: #f8fafc;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
          margin-top: 0.25rem;
        }

        .checkbox-content {
          flex: 1;
        }

        .checkbox-content strong {
          display: block;
          margin-bottom: 0.25rem;
        }

        .checkbox-content small {
          color: #64748b;
          font-size: 0.875rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
