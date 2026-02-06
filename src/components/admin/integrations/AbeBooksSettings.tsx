import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchAbeBooksOrders } from '../../../services/abeBooksOrdersService';
import { ConnectionStatus } from './shared/ConnectionStatus';
import { SyncMonitor } from './shared/SyncMonitor';
import { ToggleSwitch } from './shared/ToggleSwitch';

interface AbeBooksSettingsProps {
  onBack: () => void;
}

export const AbeBooksSettings: React.FC<AbeBooksSettingsProps> = ({ onBack }) => {
  const { settings, updateIntegrationsSettings } = useSettings();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error' | 'testing'>('unknown');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'ftps'>('ftps');

  const abeSettings = settings.integrations.abeBooks;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Helper to update API settings
  const handleApiUpdate = async (section: 'orders' | 'inventory' | 'root', key: string, value: any) => {
    const current = settings.integrations.abeBooks;
    let newAbeBooks = { ...current };

    if (section === 'root') {
      newAbeBooks.api = { ...newAbeBooks.api, [key]: value };
    } else if (section === 'orders') {
      newAbeBooks.api = {
        ...newAbeBooks.api,
        orders: { ...newAbeBooks.api.orders, [key]: value }
      };
    } else if (section === 'inventory') {
      newAbeBooks.api = {
        ...newAbeBooks.api,
        inventory: { ...newAbeBooks.api.inventory, [key]: value }
      };
    }

    await updateIntegrationsSettings({
      ...settings.integrations,
      abeBooks: newAbeBooks
    });
  };

  // Helper to update FTPS settings
  const handleFtpsUpdate = async (key: string, value: any) => {
    const current = settings.integrations.abeBooks;
    const newAbeBooks = {
      ...current,
      ftps: { ...current.ftps, [key]: value }
    };

    await updateIntegrationsSettings({
      ...settings.integrations,
      abeBooks: newAbeBooks
    });
  };

  // Helper to update master switch
  const handleMasterToggle = async (value: boolean) => {
    const current = settings.integrations.abeBooks;
    const newAbeBooks = { ...current, enabled: value };

    await updateIntegrationsSettings({
      ...settings.integrations,
      abeBooks: newAbeBooks
    });
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('testing');
    setConnectionMessage('Verificando conexión con Edge Function...');

    try {
      await fetchAbeBooksOrders({});
      setConnectionStatus('success');
      setConnectionMessage('Conexión establecida correctamente. Las credenciales son válidas.');
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus('error');
      setConnectionMessage('Error al conectar. Verifica las credenciales en las variables de entorno.');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="btn-secondary p-2">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuración de AbeBooks
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona la integración con AbeBooks (API y FTPS)
          </p>
        </div>
      </div>

      {/* Master Switch */}
      <div className="form-section">
        <ToggleSwitch
          checked={abeSettings.enabled}
          onChange={handleMasterToggle}
          label="Activar Integración con AbeBooks"
          description="Habilita o deshabilita toda la comunicación con AbeBooks (API y FTPS)."
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'api'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          API
        </button>
        <button
          onClick={() => setActiveTab('ftps')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ftps'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          FTPS
        </button>
      </div>

      {/* API Tab Content */}
      {activeTab === 'api' && (
        <>
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Operaciones Individuales (API)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gestiona operaciones libro por libro y descarga de pedidos mediante la API de AbeBooks.
            </p>

            <div className="integration-toggles">
              {/* Orders Section */}
              <div className="mt-6 mb-6">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                  Gestión de Pedidos
                </h4>

                <ToggleSwitch
                  checked={abeSettings.api?.orders?.showTab || false}
                  onChange={(val) => handleApiUpdate('orders', 'showTab', val)}
                  disabled={!abeSettings.enabled}
                  label='Mostrar Pestaña "IberLibro"'
                  description="Habilita la pestaña en la sección de Pedidos para ver listados específicos."
                />

                <ToggleSwitch
                  checked={abeSettings.api?.orders?.download || false}
                  onChange={(val) => handleApiUpdate('orders', 'download', val)}
                  disabled={!abeSettings.enabled}
                  label="Sincronizar Pedidos (Descarga)"
                  description="Descarga automáticamente nuevos pedidos desde AbeBooks a la plataforma."
                />

                <div className="toggle-group opacity-60">
                  <label className="toggle-label cursor-not-allowed">
                    <label className="switch">
                      <input type="checkbox" disabled checked={false} />
                      <span className="slider round" style={{ backgroundColor: '#ccc' }}></span>
                    </label>
                    <span className="text-gray-500">Gestionar Pedidos (Próximamente)</span>
                  </label>
                  <p className="toggle-description">Gestión integral de estados y envíos desde aquí.</p>
                </div>
              </div>

              {/* Inventory Section */}
              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                  Gestión de Inventario (Libro por Libro)
                </h4>

                <ToggleSwitch
                  checked={abeSettings.api?.inventory?.upload || false}
                  onChange={(val) => handleApiUpdate('inventory', 'upload', val)}
                  disabled={!abeSettings.enabled}
                  label="Enviar Libros a AbeBooks"
                  description='Muestra la opción "Publicar en AbeBooks" al crear o editar libros individualmente.'
                />

                <ToggleSwitch
                  checked={abeSettings.api?.inventory?.syncStock || false}
                  onChange={(val) => handleApiUpdate('inventory', 'syncStock', val)}
                  disabled={!abeSettings.enabled}
                  label="Sincronizar Stock (Reducción)"
                  description="Actualiza el stock en AbeBooks cuando se vende un libro individual en la tienda."
                />

                <ToggleSwitch
                  checked={abeSettings.api?.inventory?.syncDeletions || false}
                  onChange={(val) => handleApiUpdate('inventory', 'syncDeletions', val)}
                  disabled={!abeSettings.enabled}
                  label="Eliminar libros de AbeBooks"
                  description="Borrados locales eliminan el libro específico en AbeBooks."
                />
              </div>
            </div>
          </div>

          {/* Connection Test */}
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Estado de la Conexión API
            </h3>

            <div className="connection-test-section">
              <ConnectionStatus
                status={connectionStatus}
                message={connectionMessage}
                type="API"
              />

              <button
                onClick={testConnection}
                disabled={testingConnection || !abeSettings.enabled}
                className="btn-primary mt-4"
              >
                {testingConnection ? 'Verificando...' : 'Verificar Conexión API'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* FTPS Tab Content */}
      {activeTab === 'ftps' && (
        <>
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Sincronización Masiva de Catálogo (FTPS)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Sube automáticamente todo el catálogo cada 6 horas mediante FTPS (FTP Seguro).
            </p>

            <div className="integration-toggles">
              <ToggleSwitch
                checked={abeSettings.ftps?.autoSync || false}
                onChange={(val) => handleFtpsUpdate('autoSync', val)}
                disabled={!abeSettings.enabled}
                label="Sincronización Automática de Catálogo"
                description="Sube automáticamente el catálogo completo cada 6 horas vía FTPS (recomendado)."
              />

              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

              {/* FTPS Settings */}
              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                  Configuración de Exportación
                </h4>

                {/* Minimum Price */}
                <div className="toggle-group mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Precio Mínimo de Exportación (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={abeSettings.ftps?.minPrice || 12}
                    onChange={(e) => handleFtpsUpdate('minPrice', parseFloat(e.target.value))}
                    disabled={!abeSettings.enabled}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-32"
                  />
                  <p className="toggle-description mt-2">
                    Solo se subirán libros con precio igual o superior a este valor.
                  </p>
                </div>

                {/* Stock Filter (Always Active) */}
                <ToggleSwitch
                  checked={true}
                  onChange={() => {}}
                  disabled={true}
                  label="Filtrar por Stock Disponible"
                  description="Solo se suben libros con stock mayor a 0 (siempre activo)."
                />
              </div>
            </div>

            {/* Sync Monitor */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
                <RefreshCw size={18} />
                Monitor de Sincronización
              </h4>

              <SyncMonitor supabaseUrl={supabaseUrl} supabaseKey={supabaseKey} />

              <div className="mt-4">
                <button
                  onClick={() => {
                    if (confirm('¿Quieres subir el catálogo ahora vía FTPS? Esto iniciará el workflow en GitHub.')) {
                      window.open('https://github.com/FjTechSols/LibreriaPerezGaldos/actions/workflows/abebooks-sync.yml', '_blank');
                      alert("Abriendo panel de GitHub Actions...\nEl proceso tardará 1-2 minutos en completarse.");
                    }
                  }}
                  disabled={!abeSettings.enabled}
                  className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Forzar Subida FTPS
                </button>
              </div>
            </div>
          </div>

          {/* FTPS Connection Status */}
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Estado de la Conexión FTPS
            </h3>

            <div className="connection-test-section">
              <ConnectionStatus
                status={connectionStatus}
                message={connectionMessage}
                type="FTPS"
                serverInfo="Servidor: ftp.abebooks.com | Protocolo: FTPS (TLS 1.2)"
              />

              <button
                onClick={testConnection}
                disabled={testingConnection || !abeSettings.enabled}
                className="btn-primary mt-4"
              >
                {testingConnection ? 'Verificando...' : 'Verificar Conexión FTPS'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
