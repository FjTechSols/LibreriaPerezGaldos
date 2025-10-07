import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Lock, Bell, Globe, Moon, Sun, Shield } from 'lucide-react';
import '../styles/pages/UserSettings.css';

export function UserSettings() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'notifications'>('profile');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    language: language,
    theme: theme,
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
    newsletter: true
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Actualizar perfil:', formData);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    console.log('Cambiar contraseña');
  };

  const handlePreferencesUpdate = () => {
    console.log('Actualizar preferencias:', preferences);
    setLanguage(preferences.language as 'es' | 'en');
    setTheme(preferences.theme as 'light' | 'dark' | 'auto');
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'preferences', label: 'Preferencias', icon: Globe },
    { id: 'notifications', label: 'Notificaciones', icon: Bell }
  ];

  return (
    <div className="user-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Configuración</h1>
          <p>Administra tu cuenta y preferencias</p>
        </div>

        <div className="settings-layout">
          <nav className="settings-nav">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="settings-content">
            {activeTab === 'profile' && (
              <div className="settings-section">
                <h2>Información Personal</h2>
                <form onSubmit={handleProfileUpdate} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="name">
                      <User size={16} />
                      Nombre completo
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <Mail size={16} />
                      Correo electrónico
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Guardar cambios
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="settings-section">
                <h2>Seguridad de la cuenta</h2>
                <form onSubmit={handlePasswordChange} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">
                      <Lock size={16} />
                      Contraseña actual
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">
                      <Lock size={16} />
                      Nueva contraseña
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <Lock size={16} />
                      Confirmar nueva contraseña
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    Cambiar contraseña
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="settings-section">
                <h2>Preferencias de la aplicación</h2>
                <div className="settings-form">
                  <div className="form-group">
                    <label htmlFor="language">
                      <Globe size={16} />
                      Idioma
                    </label>
                    <select
                      id="language"
                      value={preferences.language}
                      onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="theme">
                      {preferences.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                      Tema
                    </label>
                    <select
                      id="theme"
                      value={preferences.theme}
                      onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Oscuro</option>
                      <option value="auto">Automático</option>
                    </select>
                  </div>

                  <button onClick={handlePreferencesUpdate} className="btn-primary">
                    Guardar preferencias
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h2>Notificaciones</h2>
                <div className="settings-form">
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                      />
                      <div>
                        <strong>Notificaciones por email</strong>
                        <p>Recibir actualizaciones importantes por correo</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={preferences.orderUpdates}
                        onChange={(e) => setPreferences({ ...preferences, orderUpdates: e.target.checked })}
                      />
                      <div>
                        <strong>Actualizaciones de pedidos</strong>
                        <p>Notificaciones sobre el estado de tus pedidos</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={preferences.promotions}
                        onChange={(e) => setPreferences({ ...preferences, promotions: e.target.checked })}
                      />
                      <div>
                        <strong>Promociones y ofertas</strong>
                        <p>Recibir información sobre descuentos y ofertas especiales</p>
                      </div>
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={preferences.newsletter}
                        onChange={(e) => setPreferences({ ...preferences, newsletter: e.target.checked })}
                      />
                      <div>
                        <strong>Newsletter</strong>
                        <p>Recibir noticias y novedades de la librería</p>
                      </div>
                    </label>
                  </div>

                  <button onClick={handlePreferencesUpdate} className="btn-primary">
                    Guardar preferencias
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
