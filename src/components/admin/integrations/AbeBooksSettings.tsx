import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { ArrowLeft, RefreshCw, Upload, CheckCircle2, AlertCircle, PackageSearch, ShieldAlert, ListChecks } from 'lucide-react';
import { fetchAbeBooksOrders } from '../../../services/abeBooksOrdersService';
import { supabase } from '../../../lib/supabase';
import { ConnectionStatus } from './shared/ConnectionStatus';
import { SyncMonitor } from './shared/SyncMonitor';
import { ToggleSwitch } from './shared/ToggleSwitch';

interface AbeBooksSettingsProps {
  onBack: () => void;
}

interface InventoryDiagnostics {
  exportable: number;
  zeroStockWithLegacy: number;
  lowPriceWithStock: number;
  missingLegacyId: number;
}

interface RiskyOrderItem {
  orderId: string;
  orderDate: string;
  sku: string;
  title: string;
  bookId: number;
  localTitle: string;
  stock: number;
  price: number;
}

interface InventorySyncLog {
  id: string;
  sync_date: string;
  status: 'success' | 'error' | 'running';
  books_exported: number;
  error_message?: string | null;
}

export const AbeBooksSettings: React.FC<AbeBooksSettingsProps> = ({ onBack }) => {
  const { settings, updateIntegrationsSettings } = useSettings();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error' | 'testing'>('unknown');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'ftps' | 'inventory'>('ftps');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryDiagnostics, setInventoryDiagnostics] = useState<InventoryDiagnostics | null>(null);
  const [riskyOrders, setRiskyOrders] = useState<RiskyOrderItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventorySyncLog[]>([]);
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  
  // UI States for saving FTPS settings
  const [isSavingFtps, setIsSavingFtps] = useState(false);
  const [ftpsSaveSuccess, setFtpsSaveSuccess] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const abeSettings = settings.integrations.abeBooks;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Local state for Min Price interaction
  const [localMinPrice, setLocalMinPrice] = useState(abeSettings.ftps?.minPrice || 12);

  useEffect(() => {
     setLocalMinPrice(abeSettings.ftps?.minPrice || 12);
  }, [abeSettings.ftps?.minPrice]);

  useEffect(() => {
    if (activeTab === 'inventory' && !inventoryDiagnostics && !inventoryLoading) {
      loadInventoryDiagnostics();
    }
  }, [activeTab]);

  // Handle trigger FTPS sync
  const handleTriggerSync = async (isPurge = false) => {
    try {
      setTestingConnection(true);
      setSyncResult(null);
      
      const payload = isPurge ? { purge: true } : {};

      const response = await fetch(`${supabaseUrl}/functions/v1/trigger-ftps-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncResult({
          success: true,
          message: data.status || `Sincronización ${isPurge ? 'de PUESTA A CERO ' : ''}iniciada correctamente. Puedes ver el progreso en el monitor.`
        });
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Error desconocido al iniciar la sincronización.'
        });
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      setSyncResult({
        success: false,
        message: 'Error al conectar con el servidor. Verifica tu conexión e intenta de nuevo.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

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

  const saveFtpsSettings = async () => {
    setIsSavingFtps(true);
    setFtpsSaveSuccess(false);
    try {
      await handleFtpsUpdate('minPrice', localMinPrice);
      setFtpsSaveSuccess(true);
      setTimeout(() => setFtpsSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingFtps(false);
    }
  };

  const countBooks = async (applyFilters: (query: any) => any) => {
    const query = supabase
      .from('libros')
      .select('id', { count: 'exact', head: true });
    const { count, error } = await applyFilters(query);
    if (error) throw error;
    return count || 0;
  };

  const loadInventoryDiagnostics = async () => {
    setInventoryLoading(true);
    setInventoryError('');

    try {
      const minPrice = Number(abeSettings.ftps?.minPrice || 12);
      const [exportable, zeroStockWithLegacy, lowPriceWithStock, missingLegacyNull, missingLegacyEmpty] = await Promise.all([
        countBooks(query => query.not('legacy_id', 'is', null).neq('legacy_id', '').gt('stock', 0).gte('precio', minPrice)),
        countBooks(query => query.not('legacy_id', 'is', null).neq('legacy_id', '').lte('stock', 0)),
        countBooks(query => query.not('legacy_id', 'is', null).neq('legacy_id', '').gt('stock', 0).lt('precio', minPrice)),
        countBooks(query => query.is('legacy_id', null).gt('stock', 0).gte('precio', minPrice)),
        countBooks(query => query.eq('legacy_id', '').gt('stock', 0).gte('precio', minPrice)),
      ]);

      setInventoryDiagnostics({
        exportable,
        zeroStockWithLegacy,
        lowPriceWithStock,
        missingLegacyId: missingLegacyNull + missingLegacyEmpty,
      });

      const { data: orderRows, error: ordersError } = await supabase
        .from('abebooks_orders_cache')
        .select('abebooks_order_id, order_date, items')
        .order('order_date', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      const orderItems = (orderRows || []).flatMap((order: any) => {
        const items = Array.isArray(order.items) ? order.items : [];
        return items
          .filter((item: any) => item?.sku)
          .map((item: any) => ({
            orderId: order.abebooks_order_id,
            orderDate: order.order_date,
            sku: String(item.sku),
            title: item.title || '',
          }));
      });

      const skus = [...new Set(orderItems.map(item => item.sku))];
      if (skus.length > 0) {
        const { data: books, error: booksError } = await supabase
          .from('libros')
          .select('id, legacy_id, titulo, stock, precio')
          .in('legacy_id', skus);

        if (booksError) throw booksError;

        const booksBySku = new Map((books || []).map((book: any) => [String(book.legacy_id), book]));
        const risky = orderItems
          .map(item => ({ item, book: booksBySku.get(item.sku) }))
          .filter(({ book }) => book && Number(book.stock) <= 0)
          .map(({ item, book }: any) => ({
            orderId: item.orderId,
            orderDate: item.orderDate,
            sku: item.sku,
            title: item.title,
            bookId: book.id,
            localTitle: book.titulo,
            stock: Number(book.stock || 0),
            price: Number(book.precio || 0),
          }));

        setRiskyOrders(risky);
      } else {
        setRiskyOrders([]);
      }

      const { data: logs, error: logsError } = await supabase
        .from('abebooks_sync_log')
        .select('id, sync_date, status, books_exported, error_message')
        .order('sync_date', { ascending: false })
        .limit(5);

      if (!logsError) {
        setInventoryLogs((logs || []) as InventorySyncLog[]);
      } else {
        setInventoryLogs([]);
      }
    } catch (error: any) {
      console.error('Error loading AbeBooks inventory diagnostics:', error);
      setInventoryError(error.message || 'No se pudo cargar el diagnóstico de inventario.');
    } finally {
      setInventoryLoading(false);
    }
  };

  const sendDeleteToAbeBooks = async (bookId: number, sku: string) => {
    setDeletingSku(sku);
    try {
      const { data, error } = await supabase.functions.invoke('upload-to-abebooks', {
        body: { bookId, action: 'delete' },
      });

      if (error || data?.success === false || data?.error) {
        throw new Error(error?.message || data?.message || data?.error || 'AbeBooks rechazó la baja.');
      }

      setRiskyOrders(prev => prev.filter(item => item.sku !== sku));
    } catch (error: any) {
      setInventoryError(`No se pudo enviar la baja de ${sku}: ${error.message}`);
    } finally {
      setDeletingSku(null);
    }
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
          onClick={() => setActiveTab('ftps')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ftps'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          FTPS
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'inventory'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Inventario
        </button>
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
                  label='Habilitar Pestaña "IberLibro"'
                  description="Muestra la sección dedicada a pedidos de AbeBooks en el menú lateral."
                />

                <ToggleSwitch
                  checked={abeSettings.api?.orders?.download || false}
                  onChange={(val) => handleApiUpdate('orders', 'download', val)}
                  disabled={!abeSettings.enabled}
                  label="Sincronización Automática de Pedidos"
                  description="Descarga y actualiza automáticamente los pedidos desde AbeBooks cada 15 minutos."
                />

                <ToggleSwitch
                  checked={abeSettings.api?.orders?.manage || false}
                  onChange={(val) => handleApiUpdate('orders', 'manage', val)}
                  disabled={!abeSettings.enabled}
                  label="Gestión de Estados y Envíos (API)"
                  description="Permite confirmar disponibilidad, rechazar pedidos y añadir datos de seguimiento desde el panel."
                />
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

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="form-section">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <PackageSearch size={20} />
                  Diagnóstico de Inventario AbeBooks
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Revisa riesgos de catálogo antes de sincronizar y corrige bajas urgentes.
                </p>
              </div>
              <button
                onClick={loadInventoryDiagnostics}
                disabled={inventoryLoading}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} className={inventoryLoading ? 'animate-spin' : ''} />
                {inventoryLoading ? 'Revisando...' : 'Revisar ahora'}
              </button>
            </div>

            {inventoryError && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                {inventoryError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase">Exportables</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">
                  {inventoryDiagnostics?.exportable.toLocaleString('es-ES') || '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-xs font-medium text-red-700 dark:text-red-300 uppercase">Stock 0 con SKU</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-2">
                  {inventoryDiagnostics?.zeroStockWithLegacy.toLocaleString('es-ES') || '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">Precio bajo</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-2">
                  {inventoryDiagnostics?.lowPriceWithStock.toLocaleString('es-ES') || '-'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Sin legacy_id</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {inventoryDiagnostics?.missingLegacyId.toLocaleString('es-ES') || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <ShieldAlert size={20} />
              Pedidos AbeBooks con Stock Local 0
            </h3>

            {inventoryLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Cargando pedidos recientes...</div>
            ) : riskyOrders.length === 0 ? (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                No hay pedidos recientes en caché que apunten a libros con stock local 0.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-3">Pedido</th>
                      <th className="py-2 pr-3">SKU</th>
                      <th className="py-2 pr-3">Libro</th>
                      <th className="py-2 pr-3">Stock</th>
                      <th className="py-2 pr-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskyOrders.map(item => (
                      <tr key={`${item.orderId}-${item.sku}`} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 pr-3 font-medium text-gray-900 dark:text-white">{item.orderId}</td>
                        <td className="py-3 pr-3 text-gray-700 dark:text-gray-300">{item.sku}</td>
                        <td className="py-3 pr-3 text-gray-700 dark:text-gray-300 max-w-md">
                          <span className="line-clamp-2">{item.localTitle || item.title}</span>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold">
                            {item.stock}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <button
                            onClick={() => sendDeleteToAbeBooks(item.bookId, item.sku)}
                            disabled={deletingSku === item.sku}
                            className="btn-secondary text-xs flex items-center gap-2"
                          >
                            {deletingSku === item.sku && <RefreshCw size={14} className="animate-spin" />}
                            Enviar baja
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <ListChecks size={20} />
              Logs de Sincronización
            </h3>

            {inventoryLogs.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No hay logs disponibles desde la tabla `abebooks_sync_log`.
              </div>
            ) : (
              <div className="space-y-3">
                {inventoryLogs.map(log => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(log.sync_date).toLocaleString('es-ES')}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{log.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${
                        log.status === 'success' ? 'text-green-600 dark:text-green-400' :
                        log.status === 'error' ? 'text-red-600 dark:text-red-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Number(log.books_exported || 0).toLocaleString('es-ES')} libros
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FTPS Tab Content */}
      {activeTab === 'ftps' && (
        <>
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Sincronización Masiva de Catálogo (FTPS)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Sube automáticamente todo el catálogo cada 12 horas mediante FTPS (FTP Seguro).
            </p>

            <div className="integration-toggles">
              <ToggleSwitch
                checked={abeSettings.ftps?.autoSync || false}
                onChange={(val) => handleFtpsUpdate('autoSync', val)}
                disabled={!abeSettings.enabled}
                label="Sincronización Automática de Catálogo"
                description="Sube automáticamente el catálogo completo cada 12 horas vía FTPS (recomendado)."
              />

              <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

            {/* FTPS Settings */}
              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 border-b pb-2">
                  Configuración de Exportación
                </h4>

                {/* Minimum Price */}
                <div className="toggle-group mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Precio Mínimo de Exportación (€)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={localMinPrice}
                      onChange={(e) => setLocalMinPrice(parseFloat(e.target.value))}
                      disabled={!abeSettings.enabled || isSavingFtps}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <button
                      onClick={saveFtpsSettings}
                      disabled={!abeSettings.enabled || isSavingFtps}
                      className="btn-primary py-2 px-4 flex items-center gap-2"
                    >
                      {isSavingFtps ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : ftpsSaveSuccess ? (
                        <CheckCircle2 size={16} />
                      ) : null}
                      {isSavingFtps ? 'Guardando...' : ftpsSaveSuccess ? 'Guardado' : 'Guardar Ajustes'}
                    </button>
                  </div>
                  <p className="toggle-description mt-2">
                    Solo se publicarán en AbeBooks los libros con precio igual o superior a este valor. Los que no lleguen a este precio se marcarán como agotados (borrado de AbeBooks).
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

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setShowSyncModal(true); setIsPurging(false); }}
                  disabled={!abeSettings.enabled || testingConnection}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {testingConnection && !isPurging ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Iniciando sincronización...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Forzar Subida FTPS
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setShowSyncModal(true); setIsPurging(true); }}
                  disabled={!abeSettings.enabled || testingConnection}
                  className="btn-primary !bg-red-600 hover:!bg-red-700 !border-red-600 flex items-center justify-center gap-2"
                >
                   {testingConnection && isPurging ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                       Poniendo a Cero...
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      Vaciar Inventario
                    </>
                  )}
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

      {/* Modal de Confirmación de Sincronización */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Upload size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Forzar Sincronización FTPS
                </h3>
              </div>

              {!syncResult ? (
                <>
                   {isPurging ? (
                      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
                        <p className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={20} /> ¡Peligro de Destrucción!</p>
                        <p className="text-sm">¿Estás completamente seguro de que quieres lanzar una actualización masiva poniendo la cantidad de <strong>TODOS tus libros a 0</strong> en AbeBooks? Tu catálogo desaparecerá del mercado público.</p>
                      </div>
                   ) : (
                      <p className="text-gray-600 dark:text-gray-300 mb-6">
                        ¿Quieres subir el catálogo ahora vía FTPS? Esto iniciará la sincronización inmediatamente.
                      </p>
                   )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowSyncModal(false)}
                      disabled={testingConnection}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleTriggerSync(isPurging)}
                      disabled={testingConnection}
                      className={`px-4 py-2 text-white rounded-md flex items-center gap-2 disabled:opacity-50 transition-colors ${
                          isPurging ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {testingConnection ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          {isPurging ? <AlertCircle size={16} /> : <Upload size={16} />}
                          {isPurging ? 'Purgar Ahora' : 'Iniciar Sincronización'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-4 rounded-lg mb-6 ${
                    syncResult.success 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      {syncResult.success ? (
                        <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${
                          syncResult.success 
                            ? 'text-green-800 dark:text-green-300' 
                            : 'text-red-800 dark:text-red-300'
                        }`}>
                          {syncResult.success ? '¡Sincronización Iniciada!' : 'Error al Iniciar'}
                        </p>
                        <p className={`text-sm mt-1 ${
                          syncResult.success 
                            ? 'text-green-700 dark:text-green-400' 
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {syncResult.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowSyncModal(false);
                        setSyncResult(null);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
