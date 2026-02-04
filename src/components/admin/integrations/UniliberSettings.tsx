import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';

interface UniliberSettingsProps {
    onBack: () => void;
  }
  
  export const UniliberSettings: React.FC<UniliberSettingsProps> = ({ onBack }) => {
    return (
      <div className="integration-settings-container">
        <div className="settings-header-nav">
          <button onClick={onBack} className="btn-back-nav">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Uniliber
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configuración de integración con Uniliber</p>
          </div>
        </div>
  
        <div className="coming-soon-placeholder">
          <Clock size={64} />
          <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800 dark:text-white">Próximamente</h3>
          <p>La integración automática con Uniliber está en desarrollo.<br/>Por el momento, utiliza la función de exportación manual de CSV.</p>
        </div>
      </div>
    );
  };
