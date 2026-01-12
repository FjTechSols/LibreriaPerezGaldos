import { Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message }: AccessDeniedProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Generic message if none provided or if it contains technical role names
  // This logic is simple: if the message contains "rol:", replace it with generic.
  // Ideally, the caller should send a generic message, but this is a safety net.
  const displayMessage = message && !message.toLowerCase().includes('rol:') 
    ? message 
    : 'No tienes los permisos necesarios para acceder a esta sección.';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '3rem',
        maxWidth: '500px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
           display: 'inline-flex',
           padding: '1rem',
           borderRadius: '50%',
           backgroundColor: 'rgba(239, 68, 68, 0.1)',
           marginBottom: '1.5rem'
        }}>
           <Lock size={48} className="text-red-500" />
        </div>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          Acceso Restringido
        </h2>
        
        <p style={{
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          {displayMessage}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Volver Atrás
          </button>
          
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.95rem',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
