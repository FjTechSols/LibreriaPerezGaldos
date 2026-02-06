import { X, Printer, Package } from 'lucide-react';
import { Cliente } from '../../../types';

interface AdhesiveCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: number;
  cliente: Cliente | null;
  onPrint: () => void;
}

export function AdhesiveCardModal({ isOpen, onClose, pedidoId, cliente, onPrint }: AdhesiveCardModalProps) {
  if (!isOpen || !cliente) return null;

  const nombreCompleto = cliente.tipo === 'particular' 
    ? `${cliente.nombre} ${cliente.apellidos || ''}`.trim()
    : cliente.nombre;

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
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-6)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <Package size={24} style={{ color: 'var(--accent)' }} />
            <h2 style={{ 
              margin: 0, 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-main)'
            }}>
              Tarjeta Adhesiva del Pedido #{pedidoId}
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

        {/* Body - Preview */}
        <div style={{ padding: 'var(--spacing-6)' }}>
          {/* Preview Card */}
          <div style={{
            border: '2px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-5)',
            backgroundColor: 'var(--bg-page)',
            marginBottom: 'var(--spacing-5)'
          }}>
            {/* Store Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--spacing-4)',
              paddingBottom: 'var(--spacing-4)',
              borderBottom: '2px solid var(--border-strong)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'var(--bg-muted)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <img 
                  src="/Logo Exlibris Perez Galdos.png" 
                  alt="Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-main)',
                lineHeight: 1.4
              }}>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: '0.25rem' }}>
                  Librería Pérez Galdós
                </div>
                <div>Hortaleza, 5</div>
                <div>28004 Madrid</div>
                <div>www.perezgaldos.com</div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <div style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--text-main)',
                marginBottom: 'var(--spacing-3)',
                textTransform: 'uppercase'
              }}>
                {nombreCompleto}
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-main)',
                lineHeight: 1.6
              }}>
                {cliente.direccion && <div>{cliente.direccion}</div>}
                {(cliente.codigo_postal || cliente.ciudad) && (
                  <div>{cliente.codigo_postal} {cliente.ciudad}</div>
                )}
                {cliente.provincia && <div>{cliente.provincia}</div>}
                {cliente.pais && <div>{cliente.pais}</div>}
                {cliente.telefono && <div style={{ marginTop: 'var(--spacing-2)' }}>{cliente.telefono}</div>}
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div style={{
            padding: 'var(--spacing-3)',
            backgroundColor: 'var(--bg-accent-subtle)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}>
            <strong style={{ color: 'var(--accent)' }}>Nota:</strong> La tarjeta se abrirá en una nueva ventana 
            lista para imprimir en formato 10x15cm. Asegúrate de tener configurada tu impresora de tarjetas adhesivas.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--spacing-6)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--spacing-3)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 'var(--spacing-3) var(--spacing-5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'var(--transition-base)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onPrint();
              onClose();
            }}
            style={{
              padding: 'var(--spacing-3) var(--spacing-5)',
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
            <Printer size={16} />
            Imprimir Tarjeta
          </button>
        </div>
      </div>
    </div>
  );
}
