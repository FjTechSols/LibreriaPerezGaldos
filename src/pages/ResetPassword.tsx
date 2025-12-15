import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Clock } from 'lucide-react';
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
  const [timeRemaining, setTimeRemaining] = useState<number>(3600);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isValidSession && timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      setError('El enlace ha expirado. Solicita uno nuevo.');
      setIsValidSession(false);
    }
  }, [timeRemaining, isValidSession]);

  const checkSession = async () => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          const { error: authError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || ''
          });

          if (authError) {
            setError('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.');
          } else {
            setIsValidSession(true);
          }
        } else {
          setIsValidSession(true);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setIsValidSession(true);
        } else {
          setError('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.');
        }
      }
    } catch (err) {
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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

          {timeRemaining > 0 && (
            <div className="countdown-timer">
              <Clock size={16} />
              <span>Enlace válido por: <strong>{formatTime(timeRemaining)}</strong></span>
            </div>
          )}

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
