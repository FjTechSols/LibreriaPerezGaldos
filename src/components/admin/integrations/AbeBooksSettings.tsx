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

      <div className="form-section">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Sincronización y Funcionalidades</h3>
        
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
              <span>Activar Integración</span>
            </label>
            <p className="toggle-description">Habilita o deshabilita toda la comunicación con AbeBooks.</p>
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

        {/* Full Sync Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
             <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
                 <RefreshCw size={18} />
                 Sincronización Completa del Catálogo
             </h4>
             <p className="text-sm text-gray-500 mb-4">
                 Esta herramienta verifica todo tu inventario local y actualiza AbeBooks: sube los libros con stock y elimina los que no tienen.
                 <br />
                 <span className="text-xs italic">(Se ejecuta automáticamente todas las noches si la integración está activa).</span>
             </p>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Última actualización completa:</span>
                    <span className="text-sm text-gray-500">
                        {abeSettings.lastFullSync && !isNaN(new Date(abeSettings.lastFullSync).getTime())
                            ? new Date(abeSettings.lastFullSync).toLocaleString() 
                            : 'Nunca / Pendiente'}
                    </span>
                </div>
                
                <button 
                    onClick={async () => {
                        if (confirm('¿Estás seguro? Esto revisará todo el catálogo y puede tardar unos minutos.')) {
                            setTestingConnection(true); // Reusing state for loading spinner
                            try {
                                // Dynamic import to avoid circular dependencies if any, or just direct import
                                const { abeBooksService } = await import('../../../services/abeBooksService');
                                const result = await abeBooksService.triggerFullSync();
                                if (result.success) {
                                    alert(result.message + "\nLa fecha se actualizará cuando termine el proceso en segundo plano.");
                                } else {
                                    alert("Error: " + result.message);
                                }
                            } catch (e: any) {
                                alert("Error inesperado: " + e.message);
                            } finally {
                                setTestingConnection(false);
                            }
                        }
                    }}
                    disabled={!abeSettings.enabled || testingConnection}
                    className="btn-secondary px-4 py-2 text-sm"
                >
                    {testingConnection ? 'Iniciando...' : 'Actualizar Catálogo Ahora'}
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
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white">Prueba de Conectividad</h4>
                    <p className={`text-xs ${
                        connectionStatus === 'success' ? 'text-green-600' :
                        connectionStatus === 'error' ? 'text-red-500' :
                        'text-gray-500'
                    }`}>
                        {connectionMessage || 'Verifica que el servidor pueda conectar con la API de AbeBooks.'}
                    </p>
                </div>
            </div>

            <button 
                onClick={testConnection} 
                disabled={testingConnection || !abeSettings.enabled}
                className="btn-secondary flex items-center gap-2 px-4 py-2"
            >
                {testingConnection ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {testingConnection ? 'Probando...' : 'Probar Conexión'}
            </button>
        </div>
      </div>
    </div>
  );
};
