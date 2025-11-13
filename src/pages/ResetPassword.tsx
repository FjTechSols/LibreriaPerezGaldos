import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../styles/pages/ResetPassword.css';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        setError('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.');
      }
    } catch (err) {
      console.error('Error checking session:', err);
      setError('Ha ocurrido un error. Inténtalo de nuevo.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
        console.error('Update password error:', error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  if (isChecking) {
    return (
      <div className="reset-password">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="loading-spinner"></div>
            <p className="loading-text">Verificando enlace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="success-icon-container">
              <CheckCircle className="success-icon" size={64} />
            </div>

            <h1 className="reset-password-title">¡Contraseña Actualizada!</h1>

            <p className="success-message">
              Tu contraseña ha sido restablecida exitosamente.
            </p>

            <p className="success-instructions">
              Serás redirigido al inicio de sesión en unos segundos...
            </p>

            <button
              onClick={() => navigate('/login')}
              className="btn-go-to-login"
            >
              Ir al inicio de sesión ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="reset-password">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="error-icon-container">
              <XCircle className="error-icon" size={64} />
            </div>

            <h1 className="reset-password-title">Enlace Inválido</h1>

            <p className="error-message">
              {error}
            </p>

            <div className="action-buttons">
              <button
                onClick={() => navigate('/recuperar')}
                className="btn-request-new"
              >
                Solicitar nuevo enlace
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-back-to-login"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <h1 className="reset-password-title">Restablecer Contraseña</h1>
            <p className="reset-password-subtitle">
              Ingresa tu nueva contraseña
            </p>
          </div>

          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} />
                Nueva Contraseña
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="input-hint">
                Mínimo 8 caracteres
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <Lock size={16} />
                Confirmar Contraseña
              </label>
              <div className="password-input-container">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input"
                  placeholder="••••••••"
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
              className="submit-btn"
            >
              {isLoading ? 'Actualizando...' : 'Restablecer Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
