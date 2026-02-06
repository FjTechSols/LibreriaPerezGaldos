import { useState } from 'react';
import { X, Package, Truck } from 'lucide-react';

interface GLSLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: number;
  onGenerate: (data: GLSLabelData) => void;
}

export interface GLSLabelData {
  observaciones: string;
  bultos: number;
  peso: number;
}

export function GLSLabelModal({ isOpen, onClose, pedidoId, onGenerate }: GLSLabelModalProps) {
  const [observaciones, setObservaciones] = useState('');
  const [bultos, setBultos] = useState(1);
  const [peso, setPeso] = useState(0);
  const [generando, setGenerando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerando(true);
    
    try {
      await onGenerate({
        observaciones,
        bultos,
        peso
      });
      
      // Reset form
      setObservaciones('');
      setBultos(1);
      setPeso(0);
      onClose();
    } catch (error) {
      console.error('Error generating GLS label:', error);
    } finally {
      setGenerando(false);
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
          maxWidth: '500px',
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
            <Truck size={24} style={{ color: 'var(--accent)' }} />
            <h2 style={{ 
              margin: 0, 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-main)'
            }}>
              Etiqueta GLS del Pedido #{pedidoId}
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

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--spacing-6)' }}>
            {/* Observaciones de Entrega */}
            <div style={{ marginBottom: 'var(--spacing-5)' }}>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-main)'
              }}>
                Observaciones de Entrega
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales para el transportista..."
                rows={3}
                maxLength={200}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--input-text)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'var(--transition-base)',
                  outline: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-active)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              />
              <div style={{
                marginTop: 'var(--spacing-1)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
                textAlign: 'right'
              }}>
                {observaciones.length}/200
              </div>
            </div>

            {/* Bultos y Peso */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-5)'
            }}>
              {/* Bultos */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  marginBottom: 'var(--spacing-2)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-main)'
                }}>
                  <Package size={16} />
                  Bultos *
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={bultos}
                  onChange={(e) => setBultos(Number(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    transition: 'var(--transition-base)',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-active)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                />
              </div>

              {/* Peso */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-2)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-main)'
                }}>
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="999"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(Number(e.target.value))}
                  required
                  placeholder="0.0"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    transition: 'var(--transition-base)',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-active)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                />
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
              <strong style={{ color: 'var(--accent)' }}>Nota:</strong> La etiqueta GLS se generará en formato PDF 
              listo para imprimir. Asegúrate de que los datos de envío del pedido estén completos.
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
              disabled={generando}
              style={{
                padding: 'var(--spacing-3) var(--spacing-5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                cursor: generando ? 'not-allowed' : 'pointer',
                opacity: generando ? 0.5 : 1,
                transition: 'var(--transition-base)'
              }}
              onMouseEnter={(e) => !generando && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={generando || bultos < 1 || peso <= 0}
              style={{
                padding: 'var(--spacing-3) var(--spacing-5)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
                cursor: (generando || bultos < 1 || peso <= 0) ? 'not-allowed' : 'pointer',
                opacity: (generando || bultos < 1 || peso <= 0) ? 0.5 : 1,
                transition: 'var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)'
              }}
              onMouseEnter={(e) => !(generando || bultos < 1 || peso <= 0) && (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              <Truck size={16} />
              {generando ? 'Generando...' : 'Generar Etiqueta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
