import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import '../../../styles/components/BarcodeScannerModal.css';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
  const regionId = 'html5qr-code-full-region';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Initial setup and camera listing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen) {
      setLoading(true);
      setError('');

      // Small delay to ensure DOM element with regionId is mounted
      timer = setTimeout(() => {
        try {
            const html5QrCode = new Html5Qrcode(regionId);
            scannerRef.current = html5QrCode;

            Html5Qrcode.getCameras()
                .then((devices) => {
                if (devices && devices.length) {
                    setCameras(devices);
                    // Default to the last one (often the back camera on mobile) or the first one
                    setSelectedCameraId(devices[devices.length - 1].id);
                } else {
                    setError('No se detectaron cámaras.');
                }
                })
                .catch((err) => {
                console.error("Error getting cameras", err);
                let msg = "No se pudo acceder a la cámara.";
                // Check multiple error formats
                const strErr = err?.toString() || '';
                if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || strErr.includes('Permission') || strErr.includes('denied')) {
                    msg = "permisos"; // Keyword for UI handler
                }
                setError(msg);
                })
                .finally(() => {
                    setLoading(false);
                });
        } catch (e) {
            console.error("Error creating Html5Qrcode instance", e);
            setError("Error interno al inicializar el escáner.");
            setLoading(false);
        }
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
           scannerRef.current.stop().catch(e => console.error("Error stopping scanner", e));
        }
        // Clearing logic if needed
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!scannerRef.current || !selectedCameraId) return;

    try {
        setIsScanning(true);
        setError('');
        const config: Html5QrcodeCameraScanConfig = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0
        };

        await scannerRef.current.start(
            selectedCameraId,
            config,
            (decodedText) => {
                onScanSuccess(decodedText);
                handleClose();
            },
            () => { 
                // Scan failure (normal frame skipping)
            }
        );
    } catch (err) {
        console.error("Error starting scanner", err);
        setIsScanning(false);
        setError("Error al iniciar el escaneo.");
    }
  };

  const handleClose = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch(e) {
              console.error(e);
          }
      }
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="barcode-scanner-modal__overlay">
      <div className="barcode-scanner-modal">
        <div className="barcode-scanner-modal__header">
          <h3 className="barcode-scanner-modal__title">Escanear Código de Barras</h3>
          <button onClick={handleClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="barcode-scanner-modal__body">
            {/* Viewfinder Area */}
            <div className="barcode-scanner-modal__viewfinder">
                {/* 1. The Container for html5-qrcode (Must be empty of React children) */}
                <div id={regionId} style={{ width: '100%', height: '100%' }}></div>

                {/* 2. React-managed Placeholder Overlay */}
                {!isScanning && !loading && !error && (
                    <div className="barcode-scanner-modal__placeholder">
                        <Camera size={48} opacity={0.5} />
                    </div>
                )}
            </div>

            {error ? (
                 <div className="barcode-scanner-modal__error-wrapper">
                    {error === 'permisos' ? (
                        <div className="barcode-scanner-modal__error-container">
                            <strong>⚠️ Permiso Denegado</strong>
                            <p className="my-2">Para escanear, necesitas dar acceso a la cámara:</p>
                            <ol className="pl-6 space-y-2 flex flex-col">
                                <li>Toca el candado 🔒 en la barra de dirección.</li>
                                <li>Activa "Cámara" o "Permisos".</li>
                                <li>Vuelve aquí y recarga.</li>
                            </ol>
                            <button 
                                onClick={() => window.location.reload()}
                                className="barcode-scanner-modal__error-button"
                            >
                                Recargar Página
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-[var(--danger)]">⚠️ {error}</div>
                    )}
                </div>
            ) : (
                <div className="barcode-scanner-modal__content">
                    {loading ? (
                        <p className="text-center">Buscando cámaras...</p>
                    ) : (
                        <>
                             {!isScanning && (
                                <>
                                    <div>
                                        <label className="barcode-scanner-modal__label">Seleccionar Cámara</label>
                                        <select 
                                            value={selectedCameraId} 
                                            onChange={(e) => setSelectedCameraId(e.target.value)}
                                            className="form-select barcode-scanner-modal__select"
                                        >
                                            {cameras.map(cam => (
                                                <option key={cam.id} value={cam.id}>
                                                    {cam.label || `Cámara ${cam.id.substring(0, 5)}...`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        className="btn-primary barcode-scanner-modal__scan-button"
                                        onClick={startScanning}
                                    >
                                        <Camera size={18} />
                                        Iniciar Escáner
                                    </button>
                                </>
                             )}
                             
                             {isScanning && (
                                <p className="barcode-scanner-modal__help-text">
                                    Apunta al código de barras.
                                </p>
                             )}
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
