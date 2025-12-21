import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useInvoice } from '../../../context/InvoiceContext';
import { useTheme } from '../../../context/ThemeContext';

export function RevenueChart() {
  const { invoices } = useInvoice();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  // Process invoices to get monthly revenue data
  const monthlyData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        revenue: 0,
        orders: 0
      };
    });

    invoices.forEach(invoice => {
      if (invoice.status === 'Anulada') return;
      
      const invoiceDate = new Date(invoice.issue_date);
      const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      
      const monthData = last6Months.find(m => m.monthKey === monthKey);
      if (monthData) {
        monthData.revenue += invoice.total || 0;
        monthData.orders += 1;
      }
    });

    return last6Months;
  }, [invoices]);

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
            marginBottom: '8px',
            fontWeight: 600,
            color: isDark ? '#f1f5f9' : '#1e293b'
          }}>
            {payload[0].payload.month}
          </p>
          <p style={{ 
            margin: 0,
            color: '#10b981',
            fontWeight: 600
          }}>
            Ingresos: {payload[0].value.toFixed(2)}€
          </p>
          <p style={{ 
            margin: 0,
            marginTop: '4px',
            fontSize: '0.875rem',
            color: isDark ? '#94a3b8' : '#64748b'
          }}>
            {payload[0].payload.orders} pedidos
          </p>
        </div>
      );
    }
    return null;
  };

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
        Evolución de Ingresos
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={monthlyData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? '#334155' : '#e2e8f0'}
            vertical={false}
          />
          <XAxis 
            dataKey="month" 
            stroke={isDark ? '#94a3b8' : '#64748b'}
            style={{ fontSize: '0.875rem' }}
          />
          <YAxis 
            stroke={isDark ? '#94a3b8' : '#64748b'}
            style={{ fontSize: '0.875rem' }}
            tickFormatter={(value) => `${value}€`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
