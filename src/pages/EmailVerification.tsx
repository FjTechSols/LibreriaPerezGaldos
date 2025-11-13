import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../styles/pages/EmailVerification.css';

export default function EmailVerification() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    verifyEmail();
  }, []);

  const verifyEmail = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage('Error al verificar el email. El enlace puede haber expirado.');
        return;
      }

      if (session?.user) {
        setStatus('success');
        setMessage('¡Tu email ha sido verificado correctamente!');

        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setStatus('error');
        setMessage('No se pudo verificar tu email. Por favor, intenta de nuevo.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setMessage('Ha ocurrido un error inesperado.');
    }
  };

  return (
    <div className="email-verification-container">
      <div className="verification-card">
        {status === 'loading' && (
          <>
            <div className="verification-icon loading">
              <Loader size={64} />
            </div>
            <h1>Verificando tu email...</h1>
            <p>Por favor espera un momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verification-icon success">
              <CheckCircle size={64} />
            </div>
            <h1>¡Email Verificado!</h1>
            <p>{message}</p>
            <p className="redirect-message">Redirigiendo al inicio...</p>
            <button onClick={() => navigate('/')} className="btn-continue">
              Ir al Inicio
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verification-icon error">
              <XCircle size={64} />
            </div>
            <h1>Error de Verificación</h1>
            <p>{message}</p>
            <div className="error-actions">
              <button onClick={() => navigate('/register')} className="btn-secondary">
                Registrarse de nuevo
              </button>
              <button onClick={() => navigate('/login')} className="btn-primary">
                Ir a Inicio de Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
