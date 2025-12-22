import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../../context/ThemeContext';
// We import the correct function name (it was defined as obtenerLibrosMasVendidos)
import { obtenerLibrosMasVendidos } from '../../../services/pedidoService';

export function TopSellingBooksChart() {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const topBooks = await obtenerLibrosMasVendidos();
        // Truncate title for chart display
        const chartData = topBooks.map(b => ({
            ...b,
            shortTitle: b.titulo.length > 20 ? b.titulo.substring(0, 20) + '...' : b.titulo
        }));
        setData(chartData);
      } catch (error) {
        console.error('Error loading top books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ 
            margin: 0, 
            marginBottom: '4px',
            fontWeight: 600,
            color: isDark ? '#f1f5f9' : '#1e293b',
            maxWidth: '200px'
          }}>
            {payload[0].payload.titulo}
          </p>
          <p style={{ 
            margin: 0,
            color: '#f59e0b',
            fontWeight: 600
          }}>
            Vendidos: {payload[0].value} uds.
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
     return (
       <div style={{
        background: isDark ? '#1e293b' : '#ffffff',
        borderRadius: '12px',
        padding: '1.5rem',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.06)',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Cargando ranking...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: isDark ? '#1e293b' : '#ffffff',
      borderRadius: '12px',
      padding: '1.5rem',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      boxShadow: isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.06)'
    }}>
      <h3 style={{
        margin: 0,
        marginBottom: '1rem',
        fontSize: '1.125rem',
        fontWeight: 600,
        color: isDark ? '#f1f5f9' : '#1e293b'
      }}>
        Top 5 Libros Más Vendidos
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? '#334155' : '#e2e8f0'}
            horizontal={false} 
          />
          <XAxis 
            type="number" 
            stroke={isDark ? '#94a3b8' : '#64748b'}
            style={{ fontSize: '0.75rem' }} 
            hide
          />
          <YAxis 
            dataKey="shortTitle" 
            type="category" 
            stroke={isDark ? '#94a3b8' : '#64748b'}
            style={{ fontSize: '0.75rem' }}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill="#f59e0b" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
