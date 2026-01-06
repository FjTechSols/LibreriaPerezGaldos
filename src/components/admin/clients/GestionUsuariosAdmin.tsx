import { useState, useEffect } from 'react';
import { Shield, UserPlus, Edit2, Trash2, Key, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import '../../../styles/components/GestionUsuariosAdmin.css';
import {
  obtenerTodosLosUsuariosConRoles,
  obtenerTodosLosRoles,
  crearUsuarioAdministrativo,
  actualizarRolesUsuario,
  eliminarUsuario,
  cambiarPasswordUsuario,
  Rol,
  UsuarioConRoles
} from '../../../services/rolesService';
import { useAuth } from '../../../context/AuthContext';
import { MessageModal } from '../../MessageModal';

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
        user?.id || null,
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

  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  // Update selectedRoles when modal opens
  useEffect(() => {
    if (showEditModal && selectedUser) {
      setSelectedRoles(selectedUser.roles.map(r => r.id));
    }
  }, [showEditModal, selectedUser]);

  const handleCheckboxChange = (rolId: number) => {
    setSelectedRoles(prev => {
      if (prev.includes(rolId)) {
        return prev.filter(id => id !== rolId);
      } else {
        return [...prev, rolId];
      }
    });
  };

  const handleActualizarRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');
    setSuccess('');

    try {
      if (selectedRoles.length === 0) {
        setError('Debes seleccionar al menos un rol');
        return;
      }

      await actualizarRolesUsuario(selectedUser.id, selectedRoles, null);
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

  const handleEliminarUsuario = (usuario: UsuarioConRoles) => {
    if (usuario.id === user?.id) {
      showModal('Error', 'No puedes eliminarte a ti mismo', 'error');
      return;
    }

    const esSuperAdmin = usuario.roles.some(r => r.nombre === 'super_admin');
    const usuarioActualEsAdmin = usuarios.find(u => u.id === user?.id)?.roles.some(r => r.nombre === 'admin');

    if (esSuperAdmin && usuarioActualEsAdmin) {
      showModal('Error', 'Los administradores no pueden eliminar super administradores', 'error');
      return;
    }

    showModal(
        'Confirmar Eliminación',
        `¿Estás seguro de eliminar al usuario ${usuario.email}? Esta acción no se puede deshacer.`,
        'warning',
        async () => {
            try {
                await eliminarUsuario(usuario.id);
                showModal('Éxito', 'Usuario eliminado exitosamente', 'success');
                await cargarDatos();
            } catch (err: any) {
                showModal('Error', 'Error al eliminar usuario: ' + err.message, 'error');
            }
        }
    );
  };

  const getRolBadgeColor = (nivelJerarquia: number) => {
    switch (nivelJerarquia) {
      case 1: return '#dc2626';
      case 2: return '#ea580c';
      case 3: return '#2563eb';
      case 4: return '#16a34a';
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
              rolId: 0,
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
            {usuarios
              .filter(usuario =>
                usuario.roles.some(r =>
                  ['super_admin', 'admin', 'editor', 'visualizador'].includes(r.nombre)
                )
              )
              .map(usuario => (
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
                    {(() => {
                      const esSuperAdmin = usuario.roles.some(r => r.nombre === 'super_admin');
                      const usuarioActualEsAdmin = usuarios.find(u => u.id === user?.id)?.roles.some(r => r.nombre === 'admin' && !r.nombre.includes('super'));
                      const puedeEliminar = usuario.id !== user?.id && !(esSuperAdmin && usuarioActualEsAdmin);
                      return puedeEliminar && (
                      <button
                        className="btn-icon btn-danger"
                        title="Eliminar usuario"
                        onClick={() => handleEliminarUsuario(usuario)}
                      >
                        <Trash2 size={16} />
                      </button>
                    );
                    })()}
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
                        checked={selectedRoles.includes(rol.id)}
                        onChange={() => handleCheckboxChange(rol.id)}
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
