// Reusable Component: SyncMonitor
// Displays last sync information and next scheduled sync for FTPS

import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';

interface SyncLog {
  id: string;
  sync_date: string;
  status: 'success' | 'error' | 'running';
  books_exported: number;
  error_message?: string;
  duration_seconds?: number;
}

interface SyncMonitorProps {
  supabaseUrl: string;
  supabaseKey: string;
}

export const SyncMonitor: React.FC<SyncMonitorProps> = ({ supabaseUrl, supabaseKey }) => {
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [nextSync, setNextSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLastSync();
    // Refresh every minute
    const interval = setInterval(fetchLastSync, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLastSync = async () => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/get-last-ftps-sync`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLastSync(data.lastSync);
        setNextSync(data.nextSync);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusIcon = () => {
    if (!lastSync) return <Clock className="text-gray-400" size={20} />;
    
    switch (lastSync.status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'running':
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getStatusText = () => {
    if (!lastSync) return 'Sin sincronizaciones registradas';
    
    switch (lastSync.status) {
      case 'success':
        return '✅ Completada';
      case 'error':
        return '❌ Error';
      case 'running':
        return '⏳ En progreso';
      default:
        return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm">Cargando estado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="space-y-3">
        {/* Last Sync */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getStatusIcon()}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Última sincronización
              </span>
              <span className={`text-xs font-medium ${
                lastSync?.status === 'success' ? 'text-green-600 dark:text-green-400' :
                lastSync?.status === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-gray-500'
              }`}>
                {getStatusText()}
              </span>
            </div>
            
            {lastSync ? (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(lastSync.sync_date)}
                </p>
                
                {lastSync.status === 'success' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    📚 {lastSync.books_exported.toLocaleString()} libros exportados
                    {lastSync.duration_seconds && ` en ${lastSync.duration_seconds}s`}
                  </p>
                )}
                
                {lastSync.status === 'error' && lastSync.error_message && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {lastSync.error_message}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No hay sincronizaciones registradas
              </p>
            )}
          </div>
        </div>

        {/* Next Sync */}
        {nextSync && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Próxima sincronización:
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                  {formatDate(nextSync)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
