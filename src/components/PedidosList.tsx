import { useState, useEffect } from 'react';
import { Eye, Package, Filter, TrendingUp } from 'lucide-react';
import { Pedido, EstadoPedido } from '../types';
import { obtenerPedidos, actualizarEstadoPedido, obtenerEstadisticasPedidos } from '../services/pedidoService';
import '../styles/components/PedidosList.css';

interface PedidosListProps {
  onVerDetalle: (pedido: Pedido) => void;
  refreshTrigger?: number;
}

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado'];

const ESTADO_COLORES: Record<EstadoPedido, string> = {
  pendiente: 'amarillo',
  procesando: 'azul',
  enviado: 'morado',
  completado: 'verde',
  cancelado: 'rojo'
};

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

export default function PedidosList({ onVerDetalle, refreshTrigger }: PedidosListProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [estadisticas, setEstadisticas] = useState<any>(null);

  useEffect(() => {
    cargarPedidos();
    cargarEstadisticas();
  }, [refreshTrigger, filtroEstado]);

  const cargarPedidos = async () => {
    setLoading(true);
    const filtros: any = {};

    if (filtroEstado) {
      filtros.estado = filtroEstado;
    }

    const data = await obtenerPedidos(filtros);
    setPedidos(data);
    setLoading(false);
  };

  const cargarEstadisticas = async () => {
    const stats = await obtenerEstadisticasPedidos();
    setEstadisticas(stats);
  };

  const handleCambiarEstado = async (pedidoId: number, nuevoEstado: EstadoPedido) => {
    const exito = await actualizarEstadoPedido(pedidoId, nuevoEstado);

    if (exito) {
      cargarPedidos();
      cargarEstadisticas();
    } else {
      alert('Error al actualizar el estado del pedido');
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch =
      pedido.id.toString().includes(searchTerm) ||
      pedido.usuario?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.usuario?.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchSearch;
  });

  if (loading) {
    return <div className="pedidos-loading">Cargando pedidos...</div>;
  }

  return (
    <div className="pedidos-list-container">
      {estadisticas && (
        <div className="pedidos-stats">
          <div className="stat-card total">
            <div className="stat-icon">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{estadisticas.total}</span>
              <span className="stat-label">Total Pedidos</span>
            </div>
          </div>

          <div className="stat-card pendiente">
            <div className="stat-info">
              <span className="stat-value">{estadisticas.pendientes}</span>
              <span className="stat-label">Pendientes</span>
            </div>
          </div>

          <div className="stat-card procesando">
            <div className="stat-info">
              <span className="stat-value">{estadisticas.procesando}</span>
              <span className="stat-label">Procesando</span>
            </div>
          </div>

          <div className="stat-card enviado">
            <div className="stat-info">
              <span className="stat-value">{estadisticas.enviados}</span>
              <span className="stat-label">Enviados</span>
            </div>
          </div>

          <div className="stat-card completado">
            <div className="stat-info">
              <span className="stat-value">{estadisticas.completados}</span>
              <span className="stat-label">Completados</span>
            </div>
          </div>

          <div className="stat-card ventas">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{estadisticas.totalVentas.toFixed(2)} €</span>
              <span className="stat-label">Ventas Totales</span>
            </div>
          </div>
        </div>
      )}

      <div className="pedidos-filters">
        <div className="filter-group">
          <Filter size={18} />
          <input
            type="text"
            placeholder="Buscar por Nº, usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoPedido | '')}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(estado => (
            <option key={estado} value={estado}>
              {ESTADO_LABELS[estado]}
            </option>
          ))}
        </select>
      </div>

      <div className="pedidos-table">
        <div className="table-header">
          <span>Nº Pedido</span>
          <span>Usuario</span>
          <span>Fecha</span>
          <span>Estado</span>
          <span>Total</span>
          <span>Método de Pago</span>
          <span>Transportista</span>
          <span>Acciones</span>
        </div>

        {pedidosFiltrados.map(pedido => (
          <div key={pedido.id} className="table-row">
            <span className="pedido-numero">
              <Package size={16} />
              #{pedido.id}
            </span>
            <span className="pedido-usuario">
              <div className="usuario-info">
                <span className="usuario-nombre">{pedido.usuario?.username}</span>
                <span className="usuario-email">{pedido.usuario?.email}</span>
              </div>
            </span>
            <span className="pedido-fecha">
              {pedido.fecha_pedido
                ? new Date(pedido.fecha_pedido).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : '-'}
            </span>
            <span className="pedido-estado">
              <span className={`estado-badge ${ESTADO_COLORES[pedido.estado || 'pendiente']}`}>
                {ESTADO_LABELS[pedido.estado || 'pendiente']}
              </span>
            </span>
            <span className="pedido-total">
              {pedido.total?.toFixed(2) || '0.00'} €
            </span>
            <span className="pedido-pago">
              {pedido.metodo_pago || '-'}
            </span>
            <span className="pedido-transportista">
              {pedido.transportista || '-'}
            </span>
            <div className="pedido-acciones">
              <button
                onClick={() => onVerDetalle(pedido)}
                className="btn-accion ver"
                title="Ver detalles"
              >
                <Eye size={16} />
                Ver
              </button>

              <select
                value={pedido.estado || 'pendiente'}
                onChange={(e) => handleCambiarEstado(pedido.id, e.target.value as EstadoPedido)}
                className={`estado-selector ${ESTADO_COLORES[pedido.estado || 'pendiente']}`}
                title="Cambiar estado"
              >
                {ESTADOS.map(estado => (
                  <option key={estado} value={estado}>
                    {ESTADO_LABELS[estado]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {pedidosFiltrados.length === 0 && (
          <div className="no-pedidos">
            <Package size={48} />
            <p>No se encontraron pedidos</p>
          </div>
        )}
      </div>
    </div>
  );
}
