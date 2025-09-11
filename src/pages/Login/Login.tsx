import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const success = await login(email, password);
    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('Email o contraseña incorrectos');
    }
    setIsLoading(false);
  };

  return (
    <div className="login">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Iniciar Sesión</h1>
            <p className="login-subtitle">
              Accede a tu cuenta para continuar con tu experiencia de lectura
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} />
                Contraseña
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
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="login-btn"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="login-footer">
            <Link to="/recuperar" className="forgot-link">
              ¿Olvidaste tu contraseña?
            </Link>
            <div className="signup-prompt">
              <span>¿No tienes cuenta? </span>
              <Link to="/register" className="signup-link">Regístrate aquí</Link>
            </div>
          </div>

          <div className="demo-accounts">
            <h3 className="demo-title">Cuentas de Prueba</h3>
            <div className="demo-list">
              <div className="demo-account">
                <strong>Administrador:</strong> admin@libreria.com / admin123
              </div>
              <div className="demo-account">
                <strong>Usuario:</strong> user@libreria.com / user123
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}