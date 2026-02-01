import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Home, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import '../styles/components/NotFound.css';

interface NotFoundProps {
  type?: 'book' | 'page';
}

export const NotFound: React.FC<NotFoundProps> = ({ type = 'page' }) => {
  const { resolvedTheme } = useTheme();

  const messages = {
    book: {
      title: 'Libro No Encontrado',
      subtitle: 'Lo sentimos, no pudimos encontrar el libro que buscas.',
      description: 'Es posible que haya sido vendido o que el enlace sea incorrecto.'
    },
    page: {
      title: 'Página No Encontrada',
      subtitle: 'Parece que te has perdido entre nuestros estantes.',
      description: 'La página que buscas no existe o ha sido movida.'
    }
  };

  const content = messages[type];

  return (
    <div className={`not-found-container ${resolvedTheme}`}>
      <div className="not-found-content">
        <div className="not-found-logo-wrapper">
          <img 
            src="/Logo Exlibris Perez Galdos.png" 
            alt="Librería Pérez Galdós" 
            className="not-found-logo"
          />
        </div>
        
        <div className="not-found-icon">
          <BookOpen size={80} strokeWidth={1.5} />
        </div>

        <h1 className="not-found-title">{content.title}</h1>
        <p className="not-found-subtitle">{content.subtitle}</p>
        <p className="not-found-description">{content.description}</p>

        <div className="not-found-actions">
          {type === 'book' ? (
            <Link to="/catalogo" className="not-found-btn primary">
              <ArrowLeft size={20} />
              Volver al Catálogo
            </Link>
          ) : (
            <Link to="/catalogo" className="not-found-btn primary">
              <BookOpen size={20} />
              Explorar Catálogo
            </Link>
          )}
          
          <Link to="/" className="not-found-btn secondary">
            <Home size={20} />
            Ir a Inicio
          </Link>
        </div>
      </div>
    </div>
  );
};
