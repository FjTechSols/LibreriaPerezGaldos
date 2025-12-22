import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const regionId = 'html5qr-code-full-region';
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
            // Clean up previous instance if any (handling strict mode double-mount)
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }

            const scanner = new Html5QrcodeScanner(
              regionId,
              { 
                fps: 10, 
                qrbox: { width: 250, height: 150 }, // Rectangular for EAN barcodes
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                rememberLastUsedCamera: true
              },
              /* verbose= */ false
            );
            
            scannerRef.current = scanner;

            scanner.render(
              (decodedText) => {
                // Success callback
                onScanSuccess(decodedText);
                onClose(); // Close immediately on success
              },
              (errorMessage) => {
                // Ignore transient errors
                // console.log(errorMessage);
              }
            );
        } catch (e) {
            console.error("Error initializing scanner", e);
            setError("No se pudo iniciar la cámara. Verifica los permisos.");
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        }
      };
    }
  }, [isOpen]); // Only re-run if isOpen changes

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      {/* Higher z-index to sit on top of BookForm (which is usually z-50) */}
      <div className="modal" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-header">
          <h3 className="modal-title">Escanear Código de Barras</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
            {error ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                    <div id={regionId} style={{ width: '100%' }}></div>
                    <p style={{ marginTop: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                        Apunta la cámara al código de barras del libro (EAN/ISBN).
                    </p>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
