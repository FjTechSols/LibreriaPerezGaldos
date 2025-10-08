import { supabase } from '../lib/supabase';

interface BackupData {
  data: any[];
  timestamp: string;
  recordCount: number;
}

export async function exportLibrosToCSV(): Promise<void> {
  try {
    const { data: libros, error } = await supabase
      .from('libros')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!libros || libros.length === 0) {
      alert('No hay libros para exportar');
      return;
    }

    const headers = [
      'ID', 'ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Precio',
      'Stock', 'Categoría', 'Idioma', 'Páginas', 'Descripción',
      'Es Especial', 'Proveedor Externo', 'Fecha Creación'
    ];

    const csvRows = [headers.join(',')];

    libros.forEach(libro => {
      const row = [
        libro.id,
        `"${libro.isbn || ''}"`,
        `"${libro.titulo?.replace(/"/g, '""') || ''}"`,
        `"${libro.autor?.replace(/"/g, '""') || ''}"`,
        `"${libro.editorial?.replace(/"/g, '""') || ''}"`,
        libro.anio || '',
        libro.precio || 0,
        libro.stock || 0,
        `"${libro.categoria || ''}"`,
        `"${libro.idioma || ''}"`,
        libro.paginas || '',
        `"${libro.descripcion?.replace(/"/g, '""') || ''}"`,
        libro.es_especial ? 'Sí' : 'No',
        `"${libro.proveedor_externo || ''}"`,
        libro.created_at || ''
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `libros_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando libros:', error);
    alert('Error al exportar libros');
  }
}

export async function exportCategoriasToCSV(): Promise<void> {
  try {
    const { data: categorias, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    if (!categorias || categorias.length === 0) {
      alert('No hay categorías para exportar');
      return;
    }

    const headers = ['ID', 'Nombre', 'Descripción', 'Activa', 'Fecha Creación'];
    const csvRows = [headers.join(',')];

    categorias.forEach(cat => {
      const row = [
        cat.id,
        `"${cat.nombre?.replace(/"/g, '""') || ''}"`,
        `"${cat.descripcion?.replace(/"/g, '""') || ''}"`,
        cat.activa ? 'Sí' : 'No',
        cat.created_at || ''
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `categorias_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando categorías:', error);
    alert('Error al exportar categorías');
  }
}

export async function exportFacturasToCSV(): Promise<void> {
  try {
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select(`
        *,
        lineas_factura (*)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;

    if (!facturas || facturas.length === 0) {
      alert('No hay facturas para exportar');
      return;
    }

    const headers = [
      'ID Factura', 'Número', 'Cliente', 'NIF', 'Email', 'Teléfono',
      'Dirección', 'Fecha', 'Base Imponible', 'IVA', 'Total',
      'Estado', 'Método Pago', 'Notas'
    ];
    const csvRows = [headers.join(',')];

    facturas.forEach(factura => {
      const row = [
        factura.id,
        `"${factura.numero_factura || ''}"`,
        `"${factura.cliente_nombre?.replace(/"/g, '""') || ''}"`,
        `"${factura.cliente_nif || ''}"`,
        `"${factura.cliente_email || ''}"`,
        `"${factura.cliente_telefono || ''}"`,
        `"${factura.cliente_direccion?.replace(/"/g, '""') || ''}"`,
        factura.fecha || '',
        factura.base_imponible || 0,
        factura.iva || 0,
        factura.total || 0,
        `"${factura.estado || ''}"`,
        `"${factura.metodo_pago || ''}"`,
        `"${factura.notas?.replace(/"/g, '""') || ''}"`,
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `facturas_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando facturas:', error);
    alert('Error al exportar facturas');
  }
}

export async function exportPedidosToCSV(): Promise<void> {
  try {
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        lineas_pedido (*)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;

    if (!pedidos || pedidos.length === 0) {
      alert('No hay pedidos para exportar');
      return;
    }

    const headers = [
      'ID Pedido', 'Número', 'Cliente', 'Email', 'Teléfono',
      'Fecha', 'Total', 'Estado', 'Transportista', 'Notas'
    ];
    const csvRows = [headers.join(',')];

    pedidos.forEach(pedido => {
      const row = [
        pedido.id,
        `"${pedido.numero_pedido || ''}"`,
        `"${pedido.cliente_nombre?.replace(/"/g, '""') || ''}"`,
        `"${pedido.cliente_email || ''}"`,
        `"${pedido.cliente_telefono || ''}"`,
        pedido.fecha || '',
        pedido.total || 0,
        `"${pedido.estado || ''}"`,
        `"${pedido.transportista || ''}"`,
        `"${pedido.notas?.replace(/"/g, '""') || ''}"`,
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `pedidos_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando pedidos:', error);
    alert('Error al exportar pedidos');
  }
}

export async function exportIberlibroToCSV(): Promise<void> {
  try {
    const { data: libros, error } = await supabase
      .from('libros')
      .select('*')
      .eq('proveedor_externo', 'Iberlibro')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!libros || libros.length === 0) {
      alert('No hay libros de Iberlibro para exportar');
      return;
    }

    const headers = [
      'ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Precio',
      'Stock', 'Categoría', 'Código Iberlibro', 'Fecha Creación'
    ];
    const csvRows = [headers.join(',')];

    libros.forEach(libro => {
      const row = [
        `"${libro.isbn || ''}"`,
        `"${libro.titulo?.replace(/"/g, '""') || ''}"`,
        `"${libro.autor?.replace(/"/g, '""') || ''}"`,
        `"${libro.editorial?.replace(/"/g, '""') || ''}"`,
        libro.anio || '',
        libro.precio || 0,
        libro.stock || 0,
        `"${libro.categoria || ''}"`,
        `"${libro.codigo_externo || ''}"`,
        libro.created_at || ''
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `iberlibro_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando Iberlibro:', error);
    alert('Error al exportar libros de Iberlibro');
  }
}

export async function exportUniliberToCSV(): Promise<void> {
  try {
    const { data: libros, error } = await supabase
      .from('libros')
      .select('*')
      .eq('proveedor_externo', 'Uniliber')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!libros || libros.length === 0) {
      alert('No hay libros de Uniliber para exportar');
      return;
    }

    const headers = [
      'ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Precio',
      'Stock', 'Categoría', 'Código Uniliber', 'Fecha Creación'
    ];
    const csvRows = [headers.join(',')];

    libros.forEach(libro => {
      const row = [
        `"${libro.isbn || ''}"`,
        `"${libro.titulo?.replace(/"/g, '""') || ''}"`,
        `"${libro.autor?.replace(/"/g, '""') || ''}"`,
        `"${libro.editorial?.replace(/"/g, '""') || ''}"`,
        libro.anio || '',
        libro.precio || 0,
        libro.stock || 0,
        `"${libro.categoria || ''}"`,
        `"${libro.codigo_externo || ''}"`,
        libro.created_at || ''
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `uniliber_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando Uniliber:', error);
    alert('Error al exportar libros de Uniliber');
  }
}

export async function exportClientesToCSV(): Promise<void> {
  try {
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    if (!clientes || clientes.length === 0) {
      alert('No hay clientes para exportar');
      return;
    }

    const headers = [
      'ID', 'Nombre', 'Email', 'Teléfono', 'NIF', 'Dirección',
      'Ciudad', 'Código Postal', 'País', 'Activo', 'Notas', 'Fecha Creación'
    ];
    const csvRows = [headers.join(',')];

    clientes.forEach(cliente => {
      const row = [
        cliente.id,
        `"${cliente.nombre?.replace(/"/g, '""') || ''}"`,
        `"${cliente.email || ''}"`,
        `"${cliente.telefono || ''}"`,
        `"${cliente.nif || ''}"`,
        `"${cliente.direccion?.replace(/"/g, '""') || ''}"`,
        `"${cliente.ciudad || ''}"`,
        `"${cliente.codigo_postal || ''}"`,
        `"${cliente.pais || ''}"`,
        cliente.activo ? 'Sí' : 'No',
        `"${cliente.notas?.replace(/"/g, '""') || ''}"`,
        cliente.created_at || ''
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `clientes_backup_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exportando clientes:', error);
    alert('Error al exportar clientes');
  }
}

function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
