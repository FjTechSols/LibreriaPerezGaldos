import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { obtenerEstadisticasPedidos } from '../../../services/pedidoService';
import '../../../styles/components/OrderStatusChart.css';

// Consistent colors with the rest of the app
const STATUS_COLORS: Record<string, string> = {
  pendiente: '#fbbf24', // Amarillo
  procesando: '#3b82f6', // Azul
  enviado: '#8b5cf6',   // Morado
  completado: '#10b981', // Verde
  cancelado: '#ef4444',  // Rojo
  devolucion: '#64748b'  // Gris
};

export function OrderStatusChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await obtenerEstadisticasPedidos();
        if (stats) {
          const chartData = [
            { name: 'Pendiente', value: stats.pendientes, key: 'pendiente' },
            { name: 'Procesando', value: stats.procesando, key: 'procesando' },
            { name: 'Enviado', value: stats.enviados, key: 'enviado' },
            { name: 'Completado', value: stats.completados, key: 'completado' },
            { name: 'Devolución', value: stats.devoluciones, key: 'devolucion' }, // Key metric
            { name: 'Cancelado', value: stats.cancelados, key: 'cancelado' }
          ].filter(item => item.value > 0); // Hide empty statuses for cleaner chart

          setData(chartData);
        }
      } catch (error) {
        console.error('Error loading order stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title" style={{ color: STATUS_COLORS[item.key] }}>
            {item.name}
          </p>
          <p className="chart-tooltip-subtext">
            {item.value} pedidos ({((item.value / data.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
       <div className="chart-loading-container">
        <p className="chart-loading-text">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="order-status-chart-container">
      <h3>
        Estado de Pedidos
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="middle" 
            align="right"
            layout="vertical"
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
