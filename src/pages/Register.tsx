import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import '../styles/pages/Register.css';

export function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthenticated && user) {
      navigate('/', { replace: true });
      return;
    }
    
    // Redirect if registration is disabled
    if (!settings.system.allowRegistration) {
      navigate('/');
    }
  }, [isAuthenticated, user, settings.system.allowRegistration, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    if (formData.password.length < settings.security.passwordMinLength) {
      setError(`La contraseña debe tener al menos ${settings.security.passwordMinLength} caracteres`);
      return;
    }

    setIsLoading(true);
    // Combine names for fallback if needed, or pass explicitly if register supports it
    // We will update AuthContext to handle this better, but for now pass object or args
    // Assuming we'll update register signature to: register(email, password, username, firstName, lastName)
    // But currently it is (email, password, name).
    // I'll send username as 'name' for now to match interface, but I need to update AuthContext first or simultaneously.
    // Let's assume I'll update AuthContext to accept an object or more args.
    const success = await register(formData.email, formData.password, formData.username, formData.firstName, formData.lastName);
    setIsLoading(false);

    if (success) {
      setRegistrationSuccess(true);
    } else {
      setError('Este email o usuario ya está registrado o ha ocurrido un error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

// Helper to get email provider URL
  const getEmailProviderUrl = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    if (domain.includes('gmail')) return 'https://mail.google.com';
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'https://outlook.live.com';
    if (domain.includes('yahoo')) return 'https://mail.yahoo.com';
    if (domain.includes('proton') || domain.includes('pm.me')) return 'https://mail.proton.me';
    if (domain.includes('icloud')) return 'https://www.icloud.com/mail';
    
    return null;
  };

  if (registrationSuccess) {
    const providerUrl = getEmailProviderUrl(formData.email);

    return (
      <div className="register">
        <div className="register-container">
          <div className="register-card">
            <div className="success-message-container">
              <div className="success-icon">✓</div>
              <h1 className="register-title">¡Casi listo!</h1>
              <p className="success-message">
                Hemos enviado un email de confirmación a:<br/>
                <strong>{formData.email}</strong>
              </p>
              
              <div className="success-notice" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <p style={{ color: '#1e40af', fontSize: '1rem' }}>
                  <strong>Importante:</strong> Debes confirmar tu cuenta haciendo clic en el enlace que te enviamos antes de poder iniciar sesión.
                </p>
              </div>

              {providerUrl && (
                <a 
                  href={providerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-back-to-login"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.5rem', 
                    textDecoration: 'none',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Green distinct from login blue
                  }}
                >
                  <Mail size={20} />
                  Abrir mi correo ({formData.email.split('@')[1]})
                </a>
              )}

              <p className="success-instructions">
                ¿No recibiste el correo? Revisa tu carpeta de Spam o Correo no deseado.
              </p>
            </div>
             <button
                onClick={() => navigate('/login')}
                className="btn-back-to-login"
                style={providerUrl ? { background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', marginTop: '0' } : {}}
              >
                Volver al inicio de sesión
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">{t('registerTitle')}</h1>
            <p className="register-subtitle">
              {t('registerSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">
                  <User size={16} />
                  Nombre *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName" className="form-label">
                  <User size={16} />
                  Apellidos *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Tues apellidos"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  <User size={16} />
                  Usuario *
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Nombre de usuario"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <Mail size={16} />
                  {t('email')} *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} />
                {t('password')}
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="password-hint">Mínimo 6 caracteres</p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <Lock size={16} />
                {t('confirmPassword')}
              </label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="register-btn"
            >
              {isLoading ? t('creating') : t('registerTitle')}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="register-footer">
            <div className="login-prompt">
              <span>{t('alreadyHaveAccount')} </span>
              <Link to="/login" className="login-link-register">{t('loginHere')}</Link>
            </div>
          </div>

          <div className="terms-notice">
            <p>
              Al crear una cuenta, aceptas nuestros{' '}
              <Link to="/terms" className="terms-link">Términos de Servicio</Link>{' '}
              y{' '}
              <Link to="/privacy" className="privacy-link">Política de Privacidad</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}