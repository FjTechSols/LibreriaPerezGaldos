import { X, Download, Printer, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: any; // jsPDF instance
  filename: string;
}

export function InvoicePreviewModal({ isOpen, onClose, pdfDoc, filename }: InvoicePreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pdfDoc) {
      try {
        const blob = pdfDoc.output('bloburl');
        setBlobUrl(blob);
      } catch (error) {
        console.error('Error generating PDF blob for preview:', error);
      }
    } else {
      // Cleanup blob url when closed to avoid memory leaks
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    }
    
    return () => {
      if (blobUrl) {
         URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, pdfDoc]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfDoc) {
      pdfDoc.save(filename);
      // Optional: Close modal after download? No, user might want to keep it open.
    }
  };

  const handlePrint = () => {
    if (blobUrl) {
      // Open blob in new window for printing
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        // printWindow.print(); // Often blocked or runs before load. 
        // Best to let user use the browser's PDF viewer print button.
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '90%',
          maxWidth: '900px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-4) var(--spacing-6)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ 
              margin: 0, 
              fontSize: 'var(--font-size-lg)', 
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-main)'
            }}>
              Vista Previa del Albarán
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--spacing-2)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'var(--transition-base)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Iframe Preview */}
        <div style={{ 
          flex: 1, 
          backgroundColor: '#525659', // Neutral dark grey often used for PDF viewers backing
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {blobUrl ? (
            <iframe 
              src={blobUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title="PDF Preview"
            />
          ) : (
             <div style={{ color: '#fff' }}>Generando visualización...</div>
          )}
        </div>

        {/* Footer - Actions */}
        <div style={{
          padding: 'var(--spacing-4) var(--spacing-6)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between', // Align close to left, actions to right? Or all right?
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)'
        }}>
           <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              {filename}
           </div>

           <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Printer size={16} />
                Imprimir
              </button>
              
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: 'var(--spacing-2) var(--spacing-4)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
                cursor: 'pointer',
                transition: 'var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              <Download size={16} />
              Descargar PDF
            </button>
           </div>
        </div>
      </div>
    </div>
  );
}
