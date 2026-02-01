import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { obtenerPedidos } from '../../../services/pedidoService';
import { Pedido } from '../../../types';
import '../../../styles/components/RevenueChart.css';

export function RevenueChart() {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders on mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data } = await obtenerPedidos();
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders for revenue chart:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Process orders to get monthly revenue data
  const monthlyData = useMemo(() => {
    // Month names in Spanish
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Generate last 6 months (FIXED: corrected calculation)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);  // ✅ FIXED: Go back from current month
      return {
        month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,  // ✅ FIXED: Better format
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        revenue: 0,
        orders: 0
      };
    }).reverse();  // ✅ FIXED: Reverse to show chronologically (oldest to newest)

    // ✅ FIXED: Use orders instead of invoices, filter by status
    orders.forEach(order => {
      // Only count completed or shipped orders (actual revenue)
      if (!order.estado || !['completado', 'enviado'].includes(order.estado)) return;
      if (!order.fecha_pedido) return;  // Skip orders without date
      
      const orderDate = new Date(order.fecha_pedido);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      const monthData = last6Months.find(m => m.monthKey === monthKey);
      if (monthData) {
        monthData.revenue += order.total || 0;
        monthData.orders += 1;
      }
    });

    return last6Months;
  }, [orders]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">
            {payload[0].payload.month}
          </p>
          <p className="chart-tooltip-value">
            Ingresos: {payload[0].value.toFixed(2)}€
          </p>
          <p className="chart-tooltip-subtext">
            {payload[0].payload.orders} pedidos
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="revenue-chart-container">
      <h3 className="chart-title">
        Evolución de Ingresos
      </h3>
      
      {loading ? (
        <div className="chart-loader">
          Cargando datos...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--chart-grid)"
              vertical={false}
            />
            <XAxis 
              dataKey="month" 
              stroke="var(--chart-text)"
              style={{ fontSize: '0.875rem' }}
            />
            <YAxis 
              stroke="var(--chart-text)"
              style={{ fontSize: '0.875rem' }}
              tickFormatter={(value) => `${value}€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="var(--success)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
