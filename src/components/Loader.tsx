
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import '../styles/components/Loader.css';

export const Loader: React.FC = () => {
  const { resolvedTheme } = useTheme();

  return (
    <div className={`loader-container ${resolvedTheme}`}>
      <div className="loader-content">
        <div className="loader-logo-wrapper">
          <div className="loader-ring"></div>
          <img 
            src="/Logo Exlibris Perez Galdos.png" 
            alt="Librería Pérez Galdós" 
            className="loader-logo"
          />
        </div>
        <div className="loader-text-wrapper">
          <h2 className="loader-welcome">Bienvenido</h2>
          <p className="loader-status">Cargando...</p>
        </div>
      </div>
    </div>
  );
};

export const TableLoader: React.FC<{ text?: string }> = ({ text = "Cargando..." }) => {
  return (
    <div className="table-loader-container">
      <div className="table-loader-spinner"></div>
      <p className="table-loader-text">{text}</p>
    </div>
  );
};
