import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../styles/pages/ForgotPassword.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError('Ha ocurrido un error. Verifica que el email sea correcto.');
        console.error('Reset password error:', error);
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      setError('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
      console.error('Unexpected error:', err);
    }

    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="forgot-password">
        <div className="forgot-password-container">
          <div className="forgot-password-card">
            <div className="success-icon-container">
              <div className="success-icon">✓</div>
            </div>

            <h1 className="forgot-password-title">¡Email Enviado!</h1>

            <p className="success-message">
              Hemos enviado un enlace de recuperación a <strong>{email}</strong>
            </p>

            <p className="success-instructions">
              Por favor, revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>

            <div className="success-notice">
              <p>⚠️ El enlace expirará en 1 hora.</p>
              <p>Si no ves el email, revisa tu carpeta de spam.</p>
            </div>

            <div className="action-buttons">
              <Link to="/login" className="btn-back-to-login">
                <ArrowLeft size={16} />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password">
      <div className="forgot-password-container">
        <div className="forgot-password-card">
          <div className="forgot-password-header">
            <h1 className="forgot-password-title">¿Olvidaste tu contraseña?</h1>
            <p className="forgot-password-subtitle">
              No te preocupes. Te enviaremos un enlace para restablecerla.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={16} />
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                placeholder="tu@email.com"
                disabled={isLoading}
              />
              <p className="input-hint">
                Ingresa el email con el que te registraste
              </p>
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
              {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="forgot-password-footer">
            <Link to="/login" className="back-link">
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
