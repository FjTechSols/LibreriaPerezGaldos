// Reusable Component: ConnectionStatus
// Displays connection status for AbeBooks (API or FTPS)

import React from 'react';
import { Server, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export type ConnectionStatusType = 'unknown' | 'success' | 'error' | 'testing';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  message?: string;
  type: 'API' | 'FTPS';
  serverInfo?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  message,
  type,
  serverInfo
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-600 dark:text-green-400',
          icon: CheckCircle,
          label: `Conexión ${type} establecida`
        };
      case 'error':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-600 dark:text-red-400',
          icon: XCircle,
          label: `Error de conexión ${type}`
        };
      case 'testing':
        return {
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: Server,
          label: `Verificando conexión ${type}...`
        };
      default:
        return {
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-600 dark:text-gray-400',
          icon: AlertCircle,
          label: `Conexión ${type} no verificada`
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon size={20} className={config.textColor} />
      </div>
      <div className="flex-1">
        <p className={`font-medium text-sm ${config.textColor}`}>
          {config.label}
        </p>
        {message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {message}
          </p>
        )}
        {serverInfo && status === 'success' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {serverInfo}
          </p>
        )}
      </div>
    </div>
  );
};
