import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { AbeBooksSettings } from './AbeBooksSettings';
import { UniliberSettings } from './UniliberSettings';
import '../../../styles/components/Integrations.css';

type IntegrationType = 'abebooks' | 'uniliber' | null;

export const IntegrationsManager: React.FC = () => {
    const { settings } = useSettings();
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType>(null);
    const integrations = settings.integrations;

    // View: List of Integrations
    if (!selectedIntegration) {
        return (
            <div className="settings-section">
                <div className="mb-6">
                    <h2>Integraciones de Terceros</h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Gestiona la conexión y sincronización con plataformas externas de venta de libros.
                    </p>
                </div>

                <div className="integrations-grid">
                    {/* AbeBooks Card */}
                    <div 
                        className={`integration-card cursor-pointer`}
                        onClick={() => setSelectedIntegration('abebooks')}
                    >
                        <div className="integration-header">
                            <div className="integration-title">
                                <div className="integration-icon">
                                    {/* Fallback icon if image fails, or use Lucide icon */}
                                    <span className="text-xl font-bold text-red-600">A</span>
                                </div>
                                <h3 className="integration-name">AbeBooks / IberLibro</h3>
                            </div>
                            <span className={`integration-status ${integrations.abeBooks.enabled ? 'active' : 'inactive'}`}>
                                {integrations.abeBooks.enabled ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div className="integration-body">
                            <p>Sincronización automática de inventario, pedidos y bajas con la plataforma de AbeBooks.</p>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                             <span className="text-blue-600 text-sm font-medium hover:underline">Configurar &rarr;</span>
                        </div>
                    </div>

                    {/* Uniliber Card */}
                    <div 
                        className={`integration-card cursor-pointer`}
                        onClick={() => setSelectedIntegration('uniliber')}
                    >
                         <div className="integration-header">
                            <div className="integration-title">
                                <div className="integration-icon">
                                    <span className="text-xl font-bold text-blue-800">U</span>
                                </div>
                                <h3 className="integration-name">Uniliber</h3>
                            </div>
                            <span className={`integration-status ${integrations.uniliber.enabled ? 'active' : 'inactive'}`}>
                                {integrations.uniliber.enabled ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div className="integration-body">
                            <p>Conexión con el mercado de Uniliber. Actualmente en desarrollo.</p>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                             <span className="text-blue-600 text-sm font-medium hover:underline">Configurar &rarr;</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // View: Selected Integration Details
    return (
        <div className="settings-section">
            {selectedIntegration === 'abebooks' && (
                <AbeBooksSettings onBack={() => setSelectedIntegration(null)} />
            )}
            {selectedIntegration === 'uniliber' && (
               <UniliberSettings onBack={() => setSelectedIntegration(null)} />
            )}
        </div>
    );
};
