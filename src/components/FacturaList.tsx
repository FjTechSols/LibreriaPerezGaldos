import { useState, useEffect } from 'react';
import { FileText, Download, X as XIcon, AlertCircle, Eye, Plus } from 'lucide-react';
import { Factura } from '../types';
import {
  obtenerFacturas,
  anularFactura,
  descargarFacturaPDF,
  obtenerEstadisticasFacturacion
} from '../services/facturaService';
import '../styles/components/FacturaList.css';

interface FacturaListProps {
  onSelectFactura?: (factura: Factura) => void;
  onCrearFactura?: () => void;
}

export default function FacturaList({ onSelectFactura, onCrearFactura }: FacturaListProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'all' | 'normal' | 'rectificativa'>('all');
  const [filterAnulada, setFilterAnulada] = useState<'all' | 'activa' | 'anulada'>('all');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [facturaToAnular, setFacturaToAnular] = useState<Factura | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  useEffect(() => {
    cargarFacturas();
    cargarEstadisticas();
  }, []);

  const cargarFacturas = async () => {
    setLoading(true);
    const data = await obtenerFacturas();
    setFacturas(data);
    setLoading(false);
  };

  const cargarEstadisticas = async () => {
    const estadisticas = await obtenerEstadisticasFacturacion();
    setStats(estadisticas);
  };

  const handleAnularFactura = async () => {
    if (!facturaToAnular || !motivoAnulacion.trim()) {
      alert('Debe proporcionar un motivo para anular la factura');
      return;
    }

    const result = await anularFactura(facturaToAnular.id, motivoAnulacion);

    if (result) {
      alert('Factura anulada correctamente. Se ha generado una factura rectificativa.');
      setAnularModalOpen(false);
      setFacturaToAnular(null);
      setMotivoAnulacion('');
      cargarFacturas();
      cargarEstadisticas();
    } else {
      alert('Error al anular la factura');
    }
  };

  const handleDescargarPDF = async (facturaId: number) => {
    await descargarFacturaPDF(facturaId);
  };

  const facturasFiltradas = facturas.filter(factura => {
    const matchSearch = factura.numero_factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       factura.pedido?.usuario?.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = filterTipo === 'all' || factura.tipo === filterTipo;

    const matchAnulada = filterAnulada === 'all' ||
                        (filterAnulada === 'activa' && !factura.anulada) ||
                        (filterAnulada === 'anulada' && factura.anulada);

    const matchFechaDesde = !filterFechaDesde ||
                           (factura.fecha && new Date(factura.fecha) >= new Date(filterFechaDesde));

    const matchFechaHasta = !filterFechaHasta ||
                           (factura.fecha && new Date(factura.fecha) <= new Date(filterFechaHasta));

    return matchSearch && matchTipo && matchAnulada && matchFechaDesde && matchFechaHasta;
  });

  if (loading) {
    return <div className="factura-loading">Cargando facturas...</div>;
  }

  return (
    <div className="factura-list-container">
      {stats && (
        <div className="factura-stats">
          <div className="stat-card">
            <span className="stat-label">Total Facturas</span>
            <span className="stat-value">{stats.totalFacturas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Facturado</span>
            <span className="stat-value">{stats.totalFacturado.toFixed(2)} €</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">IVA Total</span>
            <span className="stat-value">{stats.totalIVA.toFixed(2)} €</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Base Imponible</span>
            <span className="stat-value">{stats.totalSinIVA.toFixed(2)} €</span>
          </div>
        </div>
      )}

      <div className="factura-filters">
        <input
          type="text"
          placeholder="Buscar por número o cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-input"
        />

        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as any)}
          className="filter-select"
        >
          <option value="all">Todos los tipos</option>
          <option value="normal">Normal</option>
          <option value="rectificativa">Rectificativa</option>
        </select>

        <select
          value={filterAnulada}
          onChange={(e) => setFilterAnulada(e.target.value as any)}
          className="filter-select"
        >
          <option value="all">Todas</option>
          <option value="activa">Activas</option>
          <option value="anulada">Anuladas</option>
        </select>

        <input
          type="date"
          value={filterFechaDesde}
          onChange={(e) => setFilterFechaDesde(e.target.value)}
          className="filter-input"
          placeholder="Desde"
        />

        <input
          type="date"
          value={filterFechaHasta}
          onChange={(e) => setFilterFechaHasta(e.target.value)}
          className="filter-input"
          placeholder="Hasta"
        />

        {onCrearFactura && (
          <button onClick={onCrearFactura} className="btn-crear-factura">
            <Plus size={20} />
            Facturar Pedido
          </button>
        )}
      </div>

      <div className="factura-table">
        <div className="table-header">
          <span>Número</span>
          <span>Fecha</span>
          <span>Cliente</span>
          <span>Tipo</span>
          <span>Subtotal</span>
          <span>IVA</span>
          <span>Total</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {facturasFiltradas.map(factura => (
          <div
            key={factura.id}
            className={`table-row ${factura.anulada ? 'anulada' : ''} ${factura.tipo === 'rectificativa' ? 'rectificativa' : ''}`}
          >
            <span className="factura-numero">
              <FileText size={16} />
              {factura.numero_factura}
            </span>
            <span>
              {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : '-'}
            </span>
            <span>{factura.pedido?.usuario?.username || '-'}</span>
            <span className={`tipo-badge ${factura.tipo}`}>
              {factura.tipo === 'normal' ? 'Normal' : 'Rectificativa'}
            </span>
            <span>{factura.subtotal.toFixed(2)} €</span>
            <span>{factura.iva.toFixed(2)} €</span>
            <span className="total-amount">{factura.total.toFixed(2)} €</span>
            <span>
              {factura.anulada ? (
                <span className="estado-badge anulada">
                  <AlertCircle size={14} />
                  Anulada
                </span>
              ) : (
                <span className="estado-badge activa">Activa</span>
              )}
            </span>
            <div className="factura-actions">
              {onSelectFactura && (
                <button
                  onClick={() => onSelectFactura(factura)}
                  className="btn-action ver"
                  title="Ver detalles"
                >
                  <Eye size={16} />
                </button>
              )}
              <button
                onClick={() => handleDescargarPDF(factura.id)}
                className="btn-action descargar"
                title="Descargar PDF"
              >
                <Download size={16} />
              </button>
              {!factura.anulada && factura.tipo !== 'rectificativa' && (
                <button
                  onClick={() => {
                    setFacturaToAnular(factura);
                    setAnularModalOpen(true);
                  }}
                  className="btn-action anular"
                  title="Anular y crear rectificativa"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
          </div>
        ))}

        {facturasFiltradas.length === 0 && (
          <div className="no-facturas">
            No se encontraron facturas que coincidan con los filtros.
          </div>
        )}
      </div>

      {anularModalOpen && facturaToAnular && (
        <div className="modal-overlay" onClick={() => setAnularModalOpen(false)}>
          <div className="modal-anular" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Anular Factura {facturaToAnular.numero_factura}</h3>
              <button
                onClick={() => setAnularModalOpen(false)}
                className="close-btn"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="warning-text">
                <AlertCircle size={20} />
                Esta acción anulará la factura actual y generará automáticamente una factura rectificativa.
              </p>

              <div className="form-group">
                <label>Motivo de la anulación *</label>
                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  className="form-textarea"
                  rows={4}
                  placeholder="Explique el motivo de la anulación..."
                  required
                />
              </div>

              <div className="factura-info">
                <p><strong>Cliente:</strong> {facturaToAnular.pedido?.usuario?.username}</p>
                <p><strong>Total:</strong> {facturaToAnular.total.toFixed(2)} €</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setAnularModalOpen(false)}
                className="btn-cancelar"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnularFactura}
                className="btn-confirmar"
                disabled={!motivoAnulacion.trim()}
              >
                Anular y Crear Rectificativa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
