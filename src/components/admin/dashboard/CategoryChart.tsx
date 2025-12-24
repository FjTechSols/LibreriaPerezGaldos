import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CategoryChart() {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryStats = async () => {
      try {
        // Get all books with their categories
        const { data: books, error } = await supabase
          .from('libros')
          .select('stock, categorias(nombre)')
          .not('categoria_id', 'is', null);

        if (error) throw error;

        // Count books by category
        const categoryMap = new Map<string, { count: number; inStock: number }>();
        
        books?.forEach((book: any) => {
          const categoryName = book.categorias?.nombre || 'Sin categoría';
          const current = categoryMap.get(categoryName) || { count: 0, inStock: 0 };
          current.count += 1;
          if (book.stock > 0) current.inStock += 1;
          categoryMap.set(categoryName, current);
        });

        // Convert to array and sort by count
        const data = Array.from(categoryMap.entries())
          .map(([name, stats]) => ({
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            fullName: name,
            count: stats.count,
            inStock: stats.inStock
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6); // Top 6 categories

        setCategoryData(data);
      } catch (error) {
        console.error('Error fetching category stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryStats();
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
            marginBottom: '8px',
            fontWeight: 600,
            color: isDark ? '#f1f5f9' : '#1e293b'
          }}>
            {payload[0].payload.fullName}
          </p>
          <p style={{ 
            margin: 0,
            color: '#3b82f6',
            fontWeight: 600
          }}>
            Total: {payload[0].value} libros
          </p>
          <p style={{ 
            margin: 0,
            marginTop: '4px',
            fontSize: '0.875rem',
            color: '#10b981'
          }}>
            En stock: {payload[0].payload.inStock}
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
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Cargando estadísticas...</p>
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
        Libros por Categoría
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={categoryData}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? '#334155' : '#e2e8f0'}
            vertical={false}
          />
          <XAxis 
            dataKey="name" 
            stroke={isDark ? '#94a3b8' : '#64748b'}
            style={{ fontSize: '0.75rem' }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke={isDark ? '#94a3b8' : '#64748b'}
            style={{ fontSize: '0.875rem' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {categoryData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
