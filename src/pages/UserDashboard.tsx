import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Save, Package, FileText, Heart, ShoppingCart } from 'lucide-react';
import '../styles/pages/UserDashboard.css';

interface UserProfile {
  username: string;
  email: string;
  fecha_registro: string;
}

interface UserStats {
  pedidos: number;
  facturas: number;
  favoritos: number;
}

export function UserDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ pedidos: 0, facturas: 0, favoritos: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('username, email, fecha_registro')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setEditForm({ username: data.username, currentPassword: '', newPassword: '' });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { count: pedidosCount } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user?.id);

      const { count: facturasCount } = await supabase
        .from('facturas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user?.id);

      setStats({
        pedidos: pedidosCount || 0,
        facturas: facturasCount || 0,
        favoritos: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      if (editForm.username !== profile?.username) {
        const { error } = await supabase
          .from('usuarios')
          .update({ username: editForm.username })
          .eq('id', user?.id);

        if (error) throw error;
      }

      if (editForm.newPassword && editForm.currentPassword) {
        const { error } = await supabase.auth.updateUser({
          password: editForm.newPassword
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      setIsEditing(false);
      loadProfile();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar perfil' });
    }
  };

  if (loading) {
    return (
      <div className="user-dashboard">
        <div className="loading">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Mi Cuenta</h1>
          <p>Gestiona tu información personal y preferencias</p>
        </div>

        <div className="dashboard-grid">
          <div className="stats-card">
            <div className="stat-item">
              <div className="stat-icon">
                <Package size={24} />
              </div>
              <div className="stat-content">
                <h3>{stats.pedidos}</h3>
                <p>Pedidos</p>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">
                <FileText size={24} />
              </div>
              <div className="stat-content">
                <h3>{stats.facturas}</h3>
                <p>Facturas</p>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-icon">
                <Heart size={24} />
              </div>
              <div className="stat-content">
                <h3>{stats.favoritos}</h3>
                <p>Favoritos</p>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <div className="card-header">
              <h2>Información Personal</h2>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                  Editar
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="profile-info">
                <div className="info-item">
                  <User size={20} />
                  <div>
                    <label>Nombre de usuario</label>
                    <p>{profile?.username}</p>
                  </div>
                </div>

                <div className="info-item">
                  <Mail size={20} />
                  <div>
                    <label>Email</label>
                    <p>{profile?.email}</p>
                  </div>
                </div>

                <div className="info-item">
                  <Package size={20} />
                  <div>
                    <label>Miembro desde</label>
                    <p>{new Date(profile?.fecha_registro || '').toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-group">
                  <label>
                    <User size={16} />
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email}
                    disabled
                    className="disabled"
                  />
                  <small>El email no se puede cambiar</small>
                </div>

                <div className="form-divider">
                  <span>Cambiar contraseña (opcional)</span>
                </div>

                <div className="form-group">
                  <label>
                    <Lock size={16} />
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={editForm.currentPassword}
                    onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                    placeholder="Dejar vacío para no cambiar"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Lock size={16} />
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {message.text && (
                  <div className={`message ${message.type}`}>
                    {message.text}
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">
                    Cancelar
                  </button>
                  <button type="submit" className="save-btn">
                    <Save size={16} />
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="quick-links-card">
            <h2>Accesos Rápidos</h2>
            <div className="quick-links">
              <Link to="/wishlist" className="quick-link">
                <Heart size={20} />
                <span>Mis Favoritos</span>
              </Link>
              <Link to="/carrito" className="quick-link">
                <ShoppingCart size={20} />
                <span>Mi Carrito</span>
              </Link>
              <Link to="/catalogo" className="quick-link">
                <Package size={20} />
                <span>Ver Catálogo</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
