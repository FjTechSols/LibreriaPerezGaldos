import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { ArrowLeft, RefreshCw, Server, AlertTriangle } from 'lucide-react';
import { fetchAbeBooksOrders } from '../../../services/abeBooksOrdersService';

interface AbeBooksSettingsProps {
  onBack: () => void;
}

export const AbeBooksSettings: React.FC<AbeBooksSettingsProps> = ({ onBack }) => {
  const { settings, updateIntegrationsSettings } = useSettings();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'ftps'>('ftps'); // Default to FTPS tab

  const abeSettings = settings.integrations.abeBooks;

  // Helper to update AbeBooks settings preserving nested structure
  const handleUpdate = async (section: 'orders' | 'inventory' | 'root', key: string, value: any) => {
      const current = settings.integrations.abeBooks;
      let newAbeBooks = { ...current };

      if (section === 'root') {
          newAbeBooks = { ...newAbeBooks, [key]: value };
      } else if (section === 'orders') {
          newAbeBooks.orders = { ...newAbeBooks.orders, [key]: value };
      } else if (section === 'inventory') {
          newAbeBooks.inventory = { ...newAbeBooks.inventory, [key]: value };
      }

      await updateIntegrationsSettings({
          ...settings.integrations,
          abeBooks: newAbeBooks
      });
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('unknown');
    setConnectionMessage('Verificando conexión con Edge Function...');

    try {
      // Intentamos obtener pedidos para verificar que la key funciona (sin filtros)
      await fetchAbeBooksOrders({});
      
      setConnectionStatus('success');
      setConnectionMessage('Conexión establecida correctamente. Las credenciales son válidas.');
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus('error');
      setConnectionMessage('Error de conexión. Verifica las variables de entorno en el servidor.');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="integration-settings-container">
      <div className="settings-header-nav">
        <button onClick={onBack} className="btn-back-nav">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <img 
              src="/src/assets/integrations/abebooks-icon.png" 
              alt="AbeBooks" 
              className="w-8 h-8 rounded bg-gray-200" 
              onError={(e) => {
                e.currentTarget.style.display = 'none'; // Hide if fails
              }} 
            />
            {/* Fallback Icon if Image Hidden via CSS or logic */}
            <span className="hidden">Configuración de AbeBooks</span>
            Configuración de AbeBooks
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona la sincronización con tu cuenta de IberLibro/AbeBooks</p>
        </div>
      </div>

      <div className="info-banner mb-6">
        <AlertTriangle size={20} />
        <div>
          <strong>Información de Seguridad</strong>
          <p>Las credenciales (User ID y API Key) están configuradas de forma segura en las variables de entorno del servidor. No es necesario introducirlas aquí.</p>
        </div>
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
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sincronización y Funcionalidades (API)</h3>
            
            <div className="integration-toggles">
              {/* Master Switch */}
              <div className="toggle-group">
                <label className="toggle-label">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={abeSettings.enabled}
                      onChange={(e) => handleUpdate('root', 'enabled', e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span>Activar Integración API</span>
                </label>
                <p className="toggle-description">Habilita o deshabilita toda la comunicación con AbeBooks vía API.</p>
              </div>

              {/* Auto Full Sync (Scheduled) */}
              <div className="toggle-group mt-4">
                <label className="toggle-label">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={abeSettings.inventory?.autoFullSync || false}
                      onChange={(e) => handleUpdate('inventory', 'autoFullSync', e.target.checked)}
                      disabled={!abeSettings.enabled}
                    />
                    <span className={`slider round ${!abeSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></span>
                  </label>
                  <span className={!abeSettings.enabled ? 'text-gray-400' : ''}>Sincronización Automática Global</span>
                </label>
                <p className="toggle-description">Permite que el sistema actualice todo el catálogo periódicamente (recomendado activarlo solo tras verificar credenciales).</p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

              {/* Subfeatures */}
              <div className={`transition-opacity duration-200 ${!abeSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                 
                {/* --- SECCIÓN 1: GESTIÓN DE PEDIDOS --- */}
                <div className="mt-6 mb-6">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                        Gestión de Pedidos
                    </h4>
                    
                    {/* Show Tab */}
                    <div className="toggle-group mb-4">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={abeSettings.orders?.showTab || false}
                            onChange={(e) => handleUpdate('orders', 'showTab', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span>Mostrar Pestaña "IberLibro"</span>
                      </label>
                      <p className="toggle-description">Habilita la pestaña en la sección de Pedidos para ver listados específicos.</p>
                    </div>

                    {/* Download Orders */}
                    <div className="toggle-group mb-4">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={abeSettings.orders?.download || false}
                            onChange={(e) => handleUpdate('orders', 'download', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span>Sincronizar Pedidos (Descarga)</span>
                      </label>
                      <p className="toggle-description">Descarga automáticamente nuevos pedidos desde AbeBooks a la plataforma.</p>
                    </div>

                    {/* Manage Orders (Future) */}
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

                {/* --- SECCIÓN 2: GESTIÓN DE INVENTARIO --- */}
                <div className="mt-6">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                        Gestión de Inventario (Libros)
                    </h4>

                    {/* Upload Book */}
                    <div className="toggle-group mb-4">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={abeSettings.inventory?.upload || false}
                            onChange={(e) => handleUpdate('inventory', 'upload', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span>Enviar Libros a AbeBooks</span>
                      </label>
                      <p className="toggle-description">Muestra la opción "Publicar en AbeBooks" al crear o editar libros.</p>
                    </div>

                    {/* Sync Stock */}
                    <div className="toggle-group mb-4">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={abeSettings.inventory?.syncStock || false}
                            onChange={(e) => handleUpdate('inventory', 'syncStock', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span>Sincronizar Stock (Reducción)</span>
                      </label>
                      <p className="toggle-description">Actualiza el stock en AbeBooks cuando se vende un libro en la tienda.</p>
                    </div>

                    {/* Sync Deletions */}
                    <div className="toggle-group">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={abeSettings.inventory?.syncDeletions || false}
                            onChange={(e) => handleUpdate('inventory', 'syncDeletions', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span>Eliminar libros de AbeBooks</span>
                      </label>
                      <p className="toggle-description">Borrados locales eliminan el libro en AbeBooks.</p>
                    </div>
                </div>
              </div>
            </div>

            {/* Force Sync Automation Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                 <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
                     <RefreshCw size={18} />
                     Sincronización Automática (GitHub Actions)
                 </h4>
                 <p className="text-sm text-gray-500 mb-4">
                     Si necesitas actualizar AbeBooks inmediatamente sin esperar a la tarea programada (cada 6h), puedes forzar el inicio del proceso aquí.
                     <br />
                     <span className="text-xs italic">(Esto disparará la automatización en la nube. Puede tardar unos minutos en completarse).</span>
                 </p>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Estado:</span>
                        <span className="text-sm text-gray-500">
                             Gestionado externamente por GitHub Actions
                        </span>
                    </div>
                    
                    <button 
                        onClick={async () => {
                            if (confirm('¿Quieres iniciar la sincronización ahora? Esto enviará una orden a GitHub para ejecutar la tarea.')) {
                                setTestingConnection(true); 
                                try {
                                    window.open('https://github.com/FjTechSols/LibreriaPerezGaldos/actions/workflows/abebooks-sync.yml', '_blank');
                                    alert("Abriendo panel de estado de GitHub Actions...\nPuedes ver el progreso de la sincronización allí.");
                                } catch (e: any) {
                                    alert("Error: " + e.message);
                                } finally {
                                    setTestingConnection(false);
                                }
                            }
                        }}
                        disabled={!abeSettings.enabled || testingConnection}
                        className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={testingConnection ? "animate-spin" : ""} />
                        {testingConnection ? 'Abriendo...' : 'Forzar Sincronización (Ver Estado)'}
                    </button>
                </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Estado de la Conexión</h3>
            
            <div className="connection-test-section">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                        connectionStatus === 'success' ? 'bg-green-100 text-green-600' :
                        connectionStatus === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        <Server size={20} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-800 dark:text-white">
                            {connectionStatus === 'unknown' && 'Conexión no verificada'}
                            {connectionStatus === 'success' && 'Conexión establecida'}
                            {connectionStatus === 'error' && 'Error de conexión'}
                        </p>
                        {connectionMessage && (
                            <p className="text-sm text-gray-500">{connectionMessage}</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={testConnection}
                    disabled={testingConnection || !abeSettings.enabled}
                    className="btn-primary mt-4"
                >
                    {testingConnection ? 'Verificando...' : 'Verificar Conexión'}
                </button>
            </div>
          </div>
        </>
      )}

      {/* FTPS Tab Content */}
      {activeTab === 'ftps' && (
        <>
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sincronización y Funcionalidades (FTPS)</h3>
            
            <div className="integration-toggles">
              {/* Master Switch for FTPS */}
              <div className="toggle-group">
                <label className="toggle-label">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={abeSettings.enabled}
                      onChange={(e) => handleUpdate('root', 'enabled', e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span>Activar Integración FTPS</span>
                </label>
                <p className="toggle-description">Habilita o deshabilita la subida de inventario vía FTPS (FTP Seguro).</p>
              </div>

              {/* Auto Full Sync via FTPS */}
              <div className="toggle-group mt-4">
                <label className="toggle-label">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={abeSettings.inventory?.autoFullSync || false}
                      onChange={(e) => handleUpdate('inventory', 'autoFullSync', e.target.checked)}
                      disabled={!abeSettings.enabled}
                    />
                    <span className={`slider round ${!abeSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}></span>
                  </label>
                  <span className={!abeSettings.enabled ? 'text-gray-400' : ''}>Sincronización Automática de Catálogo</span>
                </label>
                <p className="toggle-description">Sube automáticamente el catálogo completo cada 6 horas vía FTPS (recomendado).</p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

              {/* Subfeatures */}
              <div className={`transition-opacity duration-200 ${!abeSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                 
                {/* --- SECCIÓN: GESTIÓN DE INVENTARIO FTPS --- */}
                <div className="mt-6">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                        Gestión de Inventario (FTPS)
                    </h4>

                    {/* Upload via FTPS */}
                    <div className="toggle-group mb-4">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={abeSettings.inventory?.upload || false}
                            onChange={(e) => handleUpdate('inventory', 'upload', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span>Subir Catálogo vía FTPS</span>
                      </label>
                      <p className="toggle-description">Genera y sube automáticamente el archivo CSV del catálogo al servidor FTP de AbeBooks.</p>
                    </div>

                    {/* Minimum Price Filter */}
                    <div className="toggle-group mb-4">
                      <label className="toggle-label">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Precio Mínimo de Exportación</span>
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        defaultValue="12.00"
                        className="mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        disabled={!abeSettings.enabled}
                      />
                      <p className="toggle-description">Solo se subirán libros con precio igual o superior a este valor (€).</p>
                    </div>

                    {/* Stock Filter */}
                    <div className="toggle-group">
                      <label className="toggle-label">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={true}
                            disabled
                          />
                          <span className="slider round opacity-50"></span>
                        </label>
                        <span className="text-gray-500">Filtrar por Stock Disponible</span>
                      </label>
                      <p className="toggle-description">Solo se suben libros con stock mayor a 0 (siempre activo).</p>
                    </div>
                </div>
              </div>
            </div>

            {/* Force Sync FTPS Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                 <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
                     <RefreshCw size={18} />
                     Sincronización Manual (FTPS)
                 </h4>
                 <p className="text-sm text-gray-500 mb-4">
                     Fuerza una subida inmediata del catálogo vía FTPS sin esperar a la sincronización programada.
                     <br />
                     <span className="text-xs italic">(Esto ejecutará el workflow de GitHub Actions que genera el CSV y lo sube al servidor FTP).</span>
                 </p>

                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Estado:</span>
                        <span className="text-sm text-gray-500">
                             Última sincronización: Gestionado por GitHub Actions
                        </span>
                    </div>
                    
                    <button 
                        onClick={async () => {
                            if (confirm('¿Quieres subir el catálogo ahora vía FTPS? Esto iniciará el workflow en GitHub.')) {
                                setTestingConnection(true); 
                                try {
                                    window.open('https://github.com/FjTechSols/LibreriaPerezGaldos/actions/workflows/abebooks-sync.yml', '_blank');
                                    alert("Abriendo panel de GitHub Actions...\nEl proceso tardará 1-2 minutos en completarse.");
                                } catch (e: any) {
                                    alert("Error: " + e.message);
                                } finally {
                                    setTestingConnection(false);
                                }
                            }
                        }}
                        disabled={!abeSettings.enabled || testingConnection}
                        className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={testingConnection ? "animate-spin" : ""} />
                        {testingConnection ? 'Abriendo...' : 'Forzar Subida FTPS'}
                    </button>
                </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Estado de la Conexión FTPS</h3>
            
            <div className="connection-test-section">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                        connectionStatus === 'success' ? 'bg-green-100 text-green-600' :
                        connectionStatus === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        <Server size={20} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-800 dark:text-white">
                            {connectionStatus === 'unknown' && 'Conexión FTPS no verificada'}
                            {connectionStatus === 'success' && 'Conexión FTPS establecida'}
                            {connectionStatus === 'error' && 'Error de conexión FTPS'}
                        </p>
                        {connectionMessage && (
                            <p className="text-sm text-gray-500">{connectionMessage}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Servidor: ftp.abebooks.com | Protocolo: FTPS (TLS 1.2)
                        </p>
                    </div>
                </div>

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
