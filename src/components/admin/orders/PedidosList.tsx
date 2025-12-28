import { useState, useEffect } from 'react';
import { Eye, Package, Filter } from 'lucide-react';
import { Pedido, EstadoPedido } from '../../../types';
import { obtenerPedidos, actualizarEstadoPedido, obtenerEstadisticasPedidos } from '../../../services/pedidoService';
import { useSettings } from '../../../context/SettingsContext';
import { TableLoader } from '../../Loader';
import { Pagination } from '../../Pagination';
import '../../../styles/components/PedidosList.css';
import { MessageModal } from '../../MessageModal'; // Import MessageModal

interface PedidosListProps {
  onVerDetalle: (pedido: Pedido) => void;
  refreshTrigger?: number;
}

const ESTADOS: EstadoPedido[] = ['pendiente', 'procesando', 'enviado', 'completado', 'cancelado', 'devolucion'];

const ESTADO_COLORES: Record<EstadoPedido, string> = {
  pendiente: 'amarillo',
  procesando: 'azul',
  enviado: 'morado',
  completado: 'verde',
  cancelado: 'rojo',
  devolucion: 'gris'
};

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  completado: 'Completado',
  cancelado: 'Cancelado',
  devolucion: 'Devolución'
};

export default function PedidosList({ onVerDetalle, refreshTrigger }: PedidosListProps) {
  const { formatPrice } = useSettings();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<EstadoPedido | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({ title: '', message: '', type: 'info' });

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

    const { data } = await obtenerPedidos({ ...filtros, limit: 10000 });
    setPedidos(data);
    setLoading(false);
  };

  const cargarEstadisticas = async () => {
    const stats = await obtenerEstadisticasPedidos();
    setEstadisticas(stats);
  };

  const handleCambiarEstado = async (pedidoId: number, nuevoEstado: EstadoPedido) => {
    const result = await actualizarEstadoPedido(pedidoId, nuevoEstado);

    if (result.success) {
      cargarPedidos();
      cargarEstadisticas();
    } else {
      setMessageModalConfig({
        title: 'Error',
        message: result.error || 'Error al actualizar el estado del pedido.',
        type: 'error'
      });
      setShowMessageModal(true);
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch =
      pedido.id.toString().includes(searchTerm) ||
      pedido.usuario?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.usuario?.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(pedidosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pedidosPaginados = pedidosFiltrados.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroEstado]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) {
    return <TableLoader text="Cargando pedidos..." />;
  }

  return (
    <div className="pedidos-list-container">
      {estadisticas && (
        <div className="pedidos-stats">
          <div className="stat-card total">
            <span className="stat-label">Total Pedidos</span>
            <span className="stat-value">{estadisticas.total}</span>
          </div>

          <div className="stat-card pendiente">
            <span className="stat-label">Pendientes</span>
            <span className="stat-value">{estadisticas.pendientes}</span>
          </div>

          <div className="stat-card procesando">
            <span className="stat-label">Procesando</span>
            <span className="stat-value">{estadisticas.procesando}</span>
          </div>

          <div className="stat-card enviado">
            <span className="stat-label">Enviados</span>
            <span className="stat-value">{estadisticas.enviados}</span>
          </div>

          <div className="stat-card completado">
            <span className="stat-label">Completados</span>
            <span className="stat-value">{estadisticas.completados}</span>
          </div>

          <div className="stat-card devolucion">
            <span className="stat-label">Devoluciones</span>
            <span className="stat-value">{estadisticas.devoluciones}</span>
          </div>


          <div className="stat-card ventas">
            <span className="stat-label">Ventas Totales</span>
            <span className="stat-value">{formatPrice(estadisticas.totalVentas)}</span>
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
          <span>Cliente</span>
          <span>Fecha</span>
          <span>Estado</span>
          <span>Tipo</span>
          <span>Total</span>
          <span>Método de Pago</span>
          <span>Transportista</span>
          <span>Acciones</span>
        </div>

        {pedidosPaginados.map(pedido => (
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
            <span className="pedido-cliente">
              {pedido.cliente ? (
                <div className="cliente-info">
                  <span className="cliente-nombre">
                    {pedido.cliente.tipo === 'empresa' || pedido.cliente.tipo === 'institucion'
                      ? pedido.cliente.nombre
                      : `${pedido.cliente.nombre} ${pedido.cliente.apellidos || ''}`.trim()}
                  </span>
                  {pedido.cliente.email && <span className="cliente-email">{pedido.cliente.email}</span>}
                </div>
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>-</span>
              )}
            </span>
            <span className="pedido-fecha">
              {pedido.fecha_pedido
                ? new Date(pedido.fecha_pedido).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '-'}
            </span>
            <span className="pedido-estado">
              <span className={`estado-badge ${ESTADO_COLORES[pedido.estado || 'pendiente']}`}>
                {ESTADO_LABELS[pedido.estado || 'pendiente']}
              </span>
            </span>
            <span className="pedido-tipo">
               <span className="badge-tipo">
                  {pedido.tipo?.replace('_', ' ') || '-'}
               </span>
            </span>
            <span className="pedido-total">
              {formatPrice(pedido.total || 0)}
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

      {pedidosFiltrados.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={pedidosFiltrados.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          showItemsPerPageSelector={true}
          itemsPerPageOptions={[10, 25, 50, 100]}
        />
      )}

      {/* Message Modal Component */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type}
      />
    </div>
  );
}
