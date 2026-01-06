
import { useState } from 'react';
import { CategoryManager } from './CategoryManager';
import { PublisherManager } from './PublisherManager';
import { CategoryStandardizer } from './CategoryStandardizer';
import '../../../styles/components/MetadataManager.css';

export function MetadataManager() {
  const [activeTab, setActiveTab] = useState<'categories' | 'publishers' | 'standardization'>('categories');

  return (
    <div className="metadata-container">
      <div className="metadata-header">
        <h2 className="metadata-title">Gestión de Metadatos</h2>
        <p className="metadata-subtitle">Administra las categorías y editoriales del sistema</p>
      </div>

      <div className="metadata-tabs">
        <button 
          className={`metadata-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categorías
        </button>
        <button 
          className={`metadata-tab ${activeTab === 'publishers' ? 'active' : ''}`}
          onClick={() => setActiveTab('publishers')}
        >
          Editoriales
        </button>
        <button 
          className={`metadata-tab ${activeTab === 'standardization' ? 'active' : ''}`}
          onClick={() => setActiveTab('standardization')}
        >
          Normalización (Manual)
        </button>
      </div>

      <div className="metadata-body">
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'publishers' && <PublisherManager />}
        {activeTab === 'standardization' && <CategoryStandardizer />}
      </div>
    </div>
  );
}
