import { useState, useEffect } from 'react';
import { Eye, Filter, Calendar, Package } from 'lucide-react';
import { 
  fetchAbeBooksOrders, 
  AbeBooksOrder, 
  AbeBooksOrderFilters,
  AbeBooksOrderStatus,
  ABEBOOKS_STATUS_LABELS,
  formatAbeBooksDate,
  getStatusBadgeClass,
  syncAbeBooksOrders
} from '../../../services/abeBooksOrdersService';
import { TableLoader } from '../../Loader';
import { MessageModal } from '../../MessageModal';
import { IberLibroOrderDetail } from './IberLibroOrderDetail';
import '../../../styles/components/IberLibroOrders.css';
import { RefreshCw } from 'lucide-react'; 

const STATUS_OPTIONS: Array<{ value: AbeBooksOrderStatus | ''; label: string }> = [
  { value: '', label: 'Todos los Estados' },
  { value: 'New', label: 'Nuevo' },
  { value: 'Acknowledged', label: 'Confirmado' },
  { value: 'Shipped', label: 'Enviado' },
  { value: 'Cancelled', label: 'Cancelado' }
];

export function IberLibroPedidosList() {
  const [orders, setOrders] = useState<AbeBooksOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<AbeBooksOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AbeBooksOrderFilters>({
    status: '',
    startDate: '',
    endDate: ''
  });

  const [selectedOrder, setSelectedOrder] = useState<AbeBooksOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageConfig, setMessageConfig] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });

  // Load orders on mount and when filters change
  useEffect(() => {
    loadOrders();
  }, []);

  // Apply client-side filtering
  useEffect(() => {
    applyFilters();
  }, [filters, orders]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📦 Fetching last 30 orders from IberLibro/AbeBooks');
      
      // No filters - API will return last 30 orders by default
      const data = await fetchAbeBooksOrders();
      setOrders(data);
      
      console.log(`✅ Loaded ${data.length} orders`);
    } catch (err: any) {
      console.error('Error loading AbeBooks orders:', err);
      setError(err.message || 'Error al cargar pedidos de IberLibro');
      setMessageConfig({
        title: 'Error',
        message: err.message || 'No se pudieron cargar los pedidos de IberLibro',
        type: 'error'
      });
      setShowMessageModal(true);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Filter by date range
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(order => new Date(order.orderDate) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(order => new Date(order.orderDate) <= endDate);
    }

    setFilteredOrders(filtered);
  };

  const handleViewDetail = (order: AbeBooksOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  if (loading) {
    return (
      <div className="iberlibro-orders">
        <TableLoader />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="iberlibro-orders">
        <div className="empty-state">
          <Package size={48} className="empty-icon" />
          <h3>No se pudieron cargar los pedidos</h3>
          <p>{error}</p>
          <button onClick={loadOrders} className="btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const handleSync = async () => {
    setLoading(true);
    try {
        // Pass current filters to sync logic
        // If user selects a date range, we sync that range.
        // If empty, it defaults to 30 days in backend.
        await syncAbeBooksOrders(filters);
        
        await loadOrders(); // Reload from cache
        setMessageConfig({ title: 'Sincronización Correcta', message: 'Pedidos actualizados desde AbeBooks', type: 'success' });
        setShowMessageModal(true);
    } catch (err: any) {
        setMessageConfig({ title: 'Error de Sincronización', message: err.message, type: 'error' });
        setShowMessageModal(true);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="iberlibro-orders">
      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group">
          <Filter size={18} />
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({...filters, status: e.target.value as AbeBooksOrderStatus | ''})}
            className="filter-select"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
            <button onClick={handleSync} className="btn-secondary flex items-center gap-2">
                <RefreshCw size={18} />
                Sincronizar
            </button>
        </div>

        <div className="filter-group">
          <Calendar size={18} />
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="filter-date"
            placeholder="Desde"
          />
          <span className="date-separator">-</span>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="filter-date"
            placeholder="Hasta"
          />
        </div>

        {(filters.status || filters.startDate || filters.endDate) && (
          <button onClick={handleClearFilters} className="btn-clear-filters">
            Limpiar Filtros
          </button>
        )}

        <div className="results-count">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <Package size={48} className="empty-icon" />
          <h3>No hay pedidos</h3>
          <p>No se encontraron pedidos con los filtros aplicados</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>AbeBooks ID</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Artículos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.abeBooksOrderId}>
                  <td className="order-id">
                    <span className="id-badge">{order.abeBooksOrderId}</span>
                  </td>
                  <td>{formatAbeBooksDate(order.orderDate)}</td>
                  <td className="customer-name">{order.customer.name}</td>
                  <td className="items-count">{order.items.length}</td>
                  <td className="order-total">{order.total.toFixed(2)}€</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {ABEBOOKS_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleViewDetail(order)}
                      className="btn-action"
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <IberLibroOrderDetail 
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageConfig.title}
        message={messageConfig.message}
        type={messageConfig.type}
      />
    </div>
  );
}
