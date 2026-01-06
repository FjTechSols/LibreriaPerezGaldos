import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

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
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">Escanear Código de Barras</h3>
          <button onClick={handleClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
            {/* Viewfinder Area */}
            <div style={{ position: 'relative', width: '100%', minHeight: '250px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', background: '#000' }}>
                {/* 1. The Container for html5-qrcode (Must be empty of React children) */}
                <div id={regionId} style={{ width: '100%', height: '100%' }}></div>

                {/* 2. React-managed Placeholder Overlay */}
                {!isScanning && !loading && !error && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', zIndex: 10, background: '#000' }}>
                        <Camera size={48} opacity={0.5} />
                    </div>
                )}
            </div>

            {error ? (
                 <div style={{ textAlign: 'center', color: '#dc2626' }}>
                    {error === 'permisos' ? (
                        <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#b91c1c', textAlign: 'left' }}>
                            <strong>⚠️ Permiso Denegado</strong>
                            <p style={{ margin: '0.5rem 0' }}>Para escanear, necesitas dar acceso a la cámara:</p>
                            <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Toca el candado 🔒 en la barra de dirección.</li>
                                <li>Activa "Cámara" o "Permisos".</li>
                                <li>Vuelve aquí y recarga.</li>
                            </ol>
                            <button 
                                onClick={() => window.location.reload()}
                                style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Recargar Página
                            </button>
                        </div>
                    ) : (
                        <div>⚠️ {error}</div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center' }}>Buscando cámaras...</p>
                    ) : (
                        <>
                             {!isScanning && (
                                <>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Seleccionar Cámara</label>
                                        <select 
                                            value={selectedCameraId} 
                                            onChange={(e) => setSelectedCameraId(e.target.value)}
                                            className="form-select" // Uses global styles for dark mode support
                                            style={{ width: '100%' }}
                                        >
                                            {cameras.map(cam => (
                                                <option key={cam.id} value={cam.id}>
                                                    {cam.label || `Cámara ${cam.id.substring(0, 5)}...`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        className="save-btn" // Reuse primary button style
                                        onClick={startScanning}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
                                    >
                                        <Camera size={18} />
                                        Iniciar Escáner
                                    </button>
                                </>
                             )}
                             
                             {isScanning && (
                                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
