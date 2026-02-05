import React, { useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { exportUniliberToZip } from '../../../services/backupService';

interface UniliberSettingsProps {
    onBack: () => void;
}

export const UniliberSettings: React.FC<UniliberSettingsProps> = ({ onBack }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleExport = async () => {
        setIsExporting(true);
        setExportMessage(null);
        try {
            const result = await exportUniliberToZip(() => {
                // Progress callback intentionally empty for now
            });

            if (result.success) {
                setExportMessage({ type: 'success', text: 'Catálogo exportado correctamente.' });
            } else {
                setExportMessage({ type: 'error', text: result.error || 'Error al exportar el catálogo.' });
            }
        } catch (error: any) {
            setExportMessage({ type: 'error', text: `Error inesperado: ${error.message}` });
        } finally {
            setIsExporting(false);
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
                        Uniliber
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configuración de integración con Uniliber</p>
                </div>
            </div>

            <div className="space-y-6 mt-6">
                {/* Manual Export Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <FileSpreadsheet className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Exportación Manual del Catálogo</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Genera un archivo ZIP con el inventario completo en formato compatible con Uniliber (TSV Legacy).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download size={18} />
                            {isExporting ? 'Exportando...' : 'Exportar Catálogo'}
                        </button>

                        {exportMessage && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                                exportMessage.type === 'success' 
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                                {exportMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                <span className="text-sm font-medium">{exportMessage.text}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Coming Soon Section */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <h3 className="text-md font-medium text-gray-500 dark:text-gray-400 mb-2">Sincronización Automática</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        La funcionalidad para sincronizar el inventario en tiempo real vía API estará disponible próximamente.
                    </p>
                </div>
            </div>
        </div>
    );
};
