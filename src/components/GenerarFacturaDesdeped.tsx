import { useState, useEffect } from 'react';
import { FileText, X, AlertCircle, Check, Receipt, Zap } from 'lucide-react';
import { Pedido } from '../types';
import { crearFactura, calcularTotalesFactura } from '../services/facturaService';
import { supabase } from '../lib/supabase';
import '../styles/components/GenerarFacturaModal.css';

interface GenerarFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GenerarFacturaModal({
  isOpen,
  onClose,
  onSuccess
}: GenerarFacturaModalProps) {
  const [step, setStep] = useState<'select-type' | 'select-order' | 'form-electronic'>('select-type');
  const [tipoFactura, setTipoFactura] = useState<'normal' | 'electronica' | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [facturaElectronicaData, setFacturaElectronicaData] = useState({
    nif_emisor: '',
    nombre_emisor: '',
    direccion_emisor: '',
    nif_receptor: '',
    nombre_receptor: '',
    direccion_receptor: '',
    metodo_pago: 'transferencia',
    forma_pago: 'contado',
    observaciones: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep('select-type');
      setTipoFactura(null);
      setPedidoSeleccionado(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'select-order') {
      cargarPedidosSinFactura();
    }
  }, [step]);

  const cargarPedidosSinFactura = async () => {
    const { data: todosPedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select(`
        *,
        usuario:usuarios(*),
        detalles:pedido_detalles(
          *,
          libro:libros(*)
        )
      `)
      .in('estado', ['completado', 'enviado'])
      .order('fecha_pedido', { ascending: false });

    if (pedidosError) {
      console.error('Error al cargar pedidos:', pedidosError);
      return;
    }

    const { data: facturas } = await supabase
      .from('facturas')
      .select('pedido_id');

    const pedidosConFactura = new Set(facturas?.map(f => f.pedido_id) || []);

    const pedidosSinFactura = todosPedidos?.filter(
      p => !pedidosConFactura.has(p.id)
    ) || [];

    setPedidos(pedidosSinFactura);
  };

  const handleGenerarFactura = async () => {
    if (!pedidoSeleccionado) {
      alert('Debe seleccionar un pedido');
      return;
    }

    setLoading(true);

    try {
      const result = await crearFactura({
        pedido_id: pedidoSeleccionado
      });

      if (result) {
        alert(`Factura ${result.numero_factura} generada correctamente`);
        onSuccess?.();
        onClose();
      } else {
        alert('Error al generar la factura');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarFacturaElectronica = () => {
    alert('Funcionalidad en desarrollo. Los datos no se procesarán todavía.');
  };

  const pedidosFiltrados = pedidos.filter(pedido =>
    pedido.id.toString().includes(searchTerm) ||
    pedido.usuario?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.usuario?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pedidoActual = pedidos.find(p => p.id === pedidoSeleccionado);
  let totales = null;
  if (pedidoActual?.detalles) {
    calcularTotalesFactura(pedidoActual.detalles).then(t => { totales = t; });
  }

  if (!isOpen) return null;

  const renderSelectType = () => (
    <div className="select-type-container">
      <h4 className="section-title">Selecciona el tipo de factura</h4>
      <div className="factura-types">
        <div
          className="factura-type-card"
          onClick={() => {
            setTipoFactura('normal');
            setStep('select-order');
          }}
        >
          <div className="type-icon">
            <Receipt size={48} />
          </div>
          <h3>Factura Normal</h3>
          <p>Factura tradicional en PDF con todos los detalles del pedido</p>
          <ul className="type-features">
            <li>Generación automática desde pedido</li>
            <li>Descarga en formato PDF</li>
            <li>Cálculo automático de IVA</li>
            <li>Numeración correlativa</li>
          </ul>
        </div>

        <div
          className="factura-type-card electronic"
          onClick={() => {
            setTipoFactura('electronica');
            setStep('form-electronic');
          }}
        >
          <div className="type-icon electronic">
            <Zap size={48} />
          </div>
          <h3>Factura Electrónica</h3>
          <p>Factura digital compatible con normativa fiscal</p>
          <ul className="type-features">
            <li>Formato electrónico certificado</li>
            <li>Firma digital</li>
            <li>Envío automático</li>
            <li>Integración con AEAT</li>
          </ul>
          <div className="coming-soon-badge">En desarrollo</div>
        </div>
      </div>
    </div>
  );

  const renderFormElectronic = () => (
    <div className="form-electronic-container">
      <div className="form-header">
        <button onClick={() => setStep('select-type')} className="btn-back">
          ← Volver
        </button>
        <h4>Datos de Factura Electrónica</h4>
      </div>

      <div className="form-sections">
        <div className="form-section">
          <h5>Datos del Emisor</h5>
          <div className="form-grid">
            <div className="form-group">
              <label>NIF/CIF *</label>
              <input
                type="text"
                placeholder="B12345678"
                value={facturaElectronicaData.nif_emisor}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  nif_emisor: e.target.value
                }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Razón Social *</label>
              <input
                type="text"
                placeholder="Nombre de la empresa"
                value={facturaElectronicaData.nombre_emisor}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  nombre_emisor: e.target.value
                }))}
                className="form-input"
              />
            </div>
            <div className="form-group full-width">
              <label>Dirección Fiscal *</label>
              <input
                type="text"
                placeholder="Calle, número, código postal, ciudad"
                value={facturaElectronicaData.direccion_emisor}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  direccion_emisor: e.target.value
                }))}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h5>Datos del Receptor</h5>
          <div className="form-grid">
            <div className="form-group">
              <label>NIF/CIF *</label>
              <input
                type="text"
                placeholder="12345678A"
                value={facturaElectronicaData.nif_receptor}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  nif_receptor: e.target.value
                }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Nombre/Razón Social *</label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={facturaElectronicaData.nombre_receptor}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  nombre_receptor: e.target.value
                }))}
                className="form-input"
              />
            </div>
            <div className="form-group full-width">
              <label>Dirección Fiscal *</label>
              <input
                type="text"
                placeholder="Calle, número, código postal, ciudad"
                value={facturaElectronicaData.direccion_receptor}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  direccion_receptor: e.target.value
                }))}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h5>Condiciones de Pago</h5>
          <div className="form-grid">
            <div className="form-group">
              <label>Método de Pago *</label>
              <select
                value={facturaElectronicaData.metodo_pago}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  metodo_pago: e.target.value
                }))}
                className="form-select"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="tarjeta">Tarjeta de Crédito</option>
                <option value="efectivo">Efectivo</option>
                <option value="domiciliacion">Domiciliación Bancaria</option>
              </select>
            </div>
            <div className="form-group">
              <label>Forma de Pago *</label>
              <select
                value={facturaElectronicaData.forma_pago}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  forma_pago: e.target.value
                }))}
                className="form-select"
              >
                <option value="contado">Al Contado</option>
                <option value="30dias">A 30 días</option>
                <option value="60dias">A 60 días</option>
                <option value="90dias">A 90 días</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Observaciones</label>
              <textarea
                placeholder="Información adicional para la factura..."
                value={facturaElectronicaData.observaciones}
                onChange={(e) => setFacturaElectronicaData(prev => ({
                  ...prev,
                  observaciones: e.target.value
                }))}
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="info-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Funcionalidad en desarrollo</strong>
            <p>Este formulario está preparado para la futura implementación de facturación electrónica. Los datos no se procesarán hasta que la funcionalidad esté completa.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-generar-factura" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FileText size={24} />
            {step === 'select-type' && 'Nueva Factura'}
            {step === 'select-order' && 'Seleccionar Pedido - Factura Normal'}
            {step === 'form-electronic' && 'Factura Electrónica'}
          </h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'select-type' && renderSelectType()}

          {step === 'select-order' && (
            pedidos.length === 0 ? (
              <div className="no-pedidos">
                <AlertCircle size={48} />
                <p>No hay pedidos pendientes de facturar</p>
                <p className="hint">
                  Solo se pueden facturar pedidos en estado "Completado" o "Enviado"
                </p>
              </div>
            ) : (
              <>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Buscar pedido por ID, cliente o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>

                <div className="pedidos-list">
                  {pedidosFiltrados.map(pedido => {
                    const isSelected = pedido.id === pedidoSeleccionado;
                    return (
                      <div
                        key={pedido.id}
                        className={`pedido-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setPedidoSeleccionado(pedido.id)}
                      >
                        <div className="pedido-check">
                          {isSelected && <Check size={18} />}
                        </div>
                        <div className="pedido-info">
                          <div className="pedido-header">
                            <span className="pedido-id">Pedido #{pedido.id}</span>
                            <span className={`pedido-estado ${pedido.estado}`}>
                              {pedido.estado}
                            </span>
                          </div>
                          <div className="pedido-details">
                            <span className="cliente-name">
                              {pedido.usuario?.username}
                            </span>
                            <span className="pedido-fecha">
                              {pedido.fecha_pedido
                                ? new Date(pedido.fecha_pedido).toLocaleDateString('es-ES')
                                : '-'}
                            </span>
                          </div>
                          <div className="pedido-total">
                            Total: <strong>{pedido.total?.toFixed(2) || '0.00'} €</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {pedidoActual && (
                  <div className="factura-preview">
                    <h4>Vista previa de la factura</h4>
                    <div className="preview-details">
                      <div className="detail-row">
                        <span>Cliente:</span>
                        <strong>{pedidoActual.usuario?.username}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Email:</span>
                        <strong>{pedidoActual.usuario?.email}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Artículos:</span>
                        <strong>{pedidoActual.detalles?.length || 0}</strong>
                      </div>
                      <div className="detail-divider"></div>
                      <div className="detail-row">
                        <span>Subtotal:</span>
                        <strong>{pedidoActual.total?.toFixed(2) || '0.00'} €</strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          )}

          {step === 'form-electronic' && renderFormElectronic()}
        </div>

        <div className="modal-actions">
          {step === 'select-type' && (
            <button onClick={onClose} className="btn-cancelar">
              Cancelar
            </button>
          )}

          {step === 'select-order' && (
            <>
              <button onClick={() => setStep('select-type')} className="btn-cancelar">
                ← Atrás
              </button>
              <button
                onClick={handleGenerarFactura}
                className="btn-generar"
                disabled={!pedidoSeleccionado || loading}
              >
                {loading ? 'Generando...' : 'Generar Factura'}
              </button>
            </>
          )}

          {step === 'form-electronic' && (
            <>
              <button onClick={() => setStep('select-type')} className="btn-cancelar">
                ← Atrás
              </button>
              <button
                onClick={handleGuardarFacturaElectronica}
                className="btn-generar"
                disabled
              >
                Generar Factura Electrónica (Próximamente)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
