import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import '../styles/pages/Register.css';

export function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (!settings.system.allowRegistration) {
      navigate('/');
    }
  }, [settings.system.allowRegistration, navigate]);

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
    const success = await register(formData.email, formData.password, formData.name);
    if (success) {
      navigate('/');
    } else {
      setError('Este email ya está registrado');
    }
    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

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
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                <User size={16} />
                {t('fullName')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={16} />
                {t('email')}
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
              <a href="/terminos" className="terms-link">Términos de Servicio</a>{' '}
              y{' '}
              <a href="/privacidad" className="privacy-link">Política de Privacidad</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}