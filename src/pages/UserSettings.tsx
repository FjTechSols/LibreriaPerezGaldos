import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Bell, Globe, Moon, Sun, Shield, Key, Calendar } from 'lucide-react';
import '../styles/pages/UserSettings.css';

export function UserSettings() {
  const { user, refreshUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'notifications'>('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    fullName: '',
    birthDate: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    newEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user data when it changes
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        fullName: user.fullName || '',
        birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        postalCode: user.postalCode || ''
      }));
    }
  }, [user]);

  const toggleEdit = () => {
    if (isEditing) {
      // Cancel editing: revert form data to user data
      if (user) {
        setFormData(prev => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          fullName: user.fullName || '',
          birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
          phone: user.phone || '',
          address: user.address || '',
          city: user.city || '',
          postalCode: user.postalCode || ''
        }));
      }
    }
    setIsEditing(!isEditing);
    setMessage('');
    setError('');
  };

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const [preferences, setPreferences] = useState({
    language: language,
    theme: theme,
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
    newsletter: true
  });

  // Sync local preferences with global context updates
  React.useEffect(() => {
    setPreferences(prev => ({
      ...prev,
      language: language,
      theme: theme
    }));
  }, [language, theme]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // If just toggling to edit mode, do nothing here (handled by button)
    // This function handles the SAVE action
    try {
      if (!user) return;

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: formData.fullName,
          fecha_nacimiento: formData.birthDate || null,
          telefono: formData.phone || null,
          direccion: formData.address || null,
          ciudad: formData.city || null,
          codigo_postal: formData.postalCode || null
        })
        .eq('id', user.id);

      if (error) {
        setError('Error al actualizar el perfil.');
        console.error('Profile update error:', error);
      } else {
        await refreshUser(); // Reload user data from DB
        setMessage('Perfil actualizado correctamente.');
        setIsEditing(false); // Exit edit mode on success
      }
    } catch (err) {
      setError('Error inesperado.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.newEmail
      });

      if (error) {
        setError('Error al cambiar el email. Verifica que sea válido.');
        console.error('Email change error:', error);
      } else {
        setMessage('Se ha enviado un email de confirmación a tu nuevo correo.');
        setFormData({ ...formData, newEmail: '' });
      }
    } catch (err) {
      setError('Error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) {
        setError('Error al cambiar la contraseña.');
        console.error('Password change error:', error);
      } else {
        setMessage('Contraseña actualizada exitosamente.');
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      setError('Error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  const handleEnable2FA = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });

      if (error) {
        setError('Error al habilitar 2FA.');
        console.error('2FA enroll error:', error);
      } else if (data) {
        setMessage('2FA habilitado. Usa una app como Google Authenticator.');
        setShowOtpInput(true);
      }
    } catch (err) {
      setError('Error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  const handleVerify2FA = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.data && factors.data.totp && factors.data.totp.length > 0) {
        const factorId = factors.data.totp[0].id;

        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: factorId,
          code: otpCode
        });

        if (error) {
          setError('Código OTP inválido.');
          console.error('2FA verify error:', error);
        } else {
          setMessage('2FA verificado exitosamente.');
          setTwoFactorEnabled(true);
          setShowOtpInput(false);
          setOtpCode('');
        }
      }
    } catch (err) {
      setError('Error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.data && factors.data.totp && factors.data.totp.length > 0) {
        const factorId = factors.data.totp[0].id;

        const { error } = await supabase.auth.mfa.unenroll({
          factorId: factorId
        });

        if (error) {
          setError('Error al deshabilitar 2FA.');
          console.error('2FA unenroll error:', error);
        } else {
          setMessage('2FA deshabilitado exitosamente.');
          setTwoFactorEnabled(false);
        }
      }
    } catch (err) {
      setError('Error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  const handlePreferencesUpdate = () => {
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
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab);
                    setMessage(''); // Clear messages when switching tabs
                    setError('');
                  }}
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
                
                {message && <div className="success-message-box mb-4">{message}</div>}
                {error && <div className="error-message-box mb-4">{error}</div>}

                <form onSubmit={handleProfileUpdate} className="settings-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="username">
                        <User size={16} />
                        Nombre de usuario
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={user?.username || ''}
                        disabled
                        className="bg-gray-100 dark:bg-slate-700 cursor-not-allowed input-readonly"
                        title="El nombre de usuario no se puede cambiar"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="fecha_registro">
                        <Globe size={16} />
                        Fecha de Registro
                      </label>
                      <input
                        id="fecha_registro"
                        type="text"
                        value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Desconocida'}
                        disabled
                        className="bg-gray-100 dark:bg-slate-700 cursor-not-allowed input-readonly"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fullName">
                      <User size={16} />
                      Nombre completo
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={isEditing ? "Tu nombre real completo" : "No especificado"}
                      disabled={!isEditing}
                      className={!isEditing ? "input-readonly" : ""}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="birthDate">
                      <Calendar size={16} />
                      Fecha de Nacimiento
                    </label>
                    <input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      disabled={!isEditing}
                      className={!isEditing ? "input-readonly" : ""}
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
                      disabled // Email is typically handled in security or requires special flow
                      className="bg-gray-100 dark:bg-slate-700 cursor-not-allowed input-readonly"
                      title="Para cambiar tu email ve a la pestaña Seguridad"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">
                      <Mail size={16} />
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={isEditing ? "Tu número de teléfono" : "No especificado"}
                      disabled={!isEditing}
                      className={!isEditing ? "input-readonly" : ""}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">
                      <Mail size={16} />
                      Dirección
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={isEditing ? "Tu dirección completa" : "No especificado"}
                      disabled={!isEditing}
                      className={!isEditing ? "input-readonly" : ""}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="city">
                        <Mail size={16} />
                        Ciudad
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder={isEditing ? "Tu ciudad" : "No especificado"}
                        disabled={!isEditing}
                        className={!isEditing ? "input-readonly" : ""}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="postalCode">
                        <Mail size={16} />
                        Código Postal
                      </label>
                      <input
                        id="postalCode"
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder={isEditing ? "Tu código postal" : "No especificado"}
                        disabled={!isEditing}
                        className={!isEditing ? "input-readonly" : ""}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    {isEditing ? (
                      <>
                        <button type="button" onClick={toggleEdit} className="btn-secondary flex-1">
                          Cancelar
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                          Guardar cambios
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={toggleEdit} className="btn-primary w-full">
                        Editar información
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="settings-section">
                <h2>Seguridad de la cuenta</h2>

                {message && <div className="success-message-box">{message}</div>}
                {error && <div className="error-message-box">{error}</div>}

                <div className="security-subsection">
                  <h3>Cambiar Email</h3>
                  <form onSubmit={handleEmailChange} className="settings-form">
                    <div className="form-group">
                      <label htmlFor="newEmail">
                        <Mail size={16} />
                        Nuevo correo electrónico
                      </label>
                      <input
                        id="newEmail"
                        type="email"
                        value={formData.newEmail}
                        onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                        placeholder="nuevo@email.com"
                        disabled={isLoading}
                      />
                      <p className="form-hint">
                        Recibirás un email de confirmación en tu nueva dirección
                      </p>
                    </div>
                    <button type="submit" className="btn-secondary" disabled={isLoading}>
                      {isLoading ? 'Enviando...' : 'Cambiar Email'}
                    </button>
                  </form>
                </div>

                <div className="security-subsection">
                  <h3>Cambiar Contraseña</h3>
                  <form onSubmit={handlePasswordChange} className="settings-form">
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
                        minLength={8}
                        disabled={isLoading}
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
                        minLength={8}
                        disabled={isLoading}
                      />
                    </div>

                    <button type="submit" className="btn-secondary" disabled={isLoading}>
                      {isLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                  </form>
                </div>

                <div className="security-subsection">
                  <h3>Autenticación de Dos Factores (2FA)</h3>
                  <p className="security-description">
                    Agrega una capa adicional de seguridad a tu cuenta usando códigos OTP
                  </p>

                  {!twoFactorEnabled && !showOtpInput && (
                    <button
                      onClick={handleEnable2FA}
                      className="btn-primary"
                      disabled={isLoading}
                    >
                      <Key size={16} />
                      {isLoading ? 'Habilitando...' : 'Habilitar 2FA'}
                    </button>
                  )}

                  {showOtpInput && (
                    <div className="otp-verification">
                      <div className="form-group">
                        <label htmlFor="otpCode">
                          Código de Verificación
                        </label>
                        <input
                          id="otpCode"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          disabled={isLoading}
                        />
                        <p className="form-hint">
                          Ingresa el código de 6 dígitos de tu app autenticadora
                        </p>
                      </div>
                      <button
                        onClick={handleVerify2FA}
                        className="btn-primary"
                        disabled={isLoading || otpCode.length !== 6}
                      >
                        {isLoading ? 'Verificando...' : 'Verificar Código'}
                      </button>
                    </div>
                  )}

                  {twoFactorEnabled && (
                    <div className="2fa-enabled">
                      <p className="success-text">✓ 2FA está activo en tu cuenta</p>
                      <button
                        onClick={handleDisable2FA}
                        className="btn-danger"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Deshabilitando...' : 'Deshabilitar 2FA'}
                      </button>
                    </div>
                  )}
                </div>
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
                      onChange={(e) => setPreferences({ ...preferences, language: e.target.value as 'es' | 'en' })}
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
                      onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'auto' })}
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
