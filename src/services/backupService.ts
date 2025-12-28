import { supabase } from '../lib/supabase';

// Helper to fetch all rows using batching to bypass Supabase 1000 row limit
async function fetchAll(table: string, queryBuilder?: (query: any) => any, select: string = '*', onProgress?: (current: number, total: number) => void) {
  let allData: any[] = [];
  const pageSize = 1000; // Increased to standard limit for maximum throughput
  const CONCURRENCY = 5; // Fetch 5 pages in parallel
  let totalRows = 0;

  // Initial count
  if (onProgress) {
      try {
        let countQuery = supabase.from(table).select('*', { count: 'estimated', head: true });
        let { count, error } = await countQuery;
        
        // Fallback to exact if estimated is invalid
        if (!error && (count === null || count === 0)) {
             countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
             const res = await countQuery;
             count = res.count;
        }
        totalRows = count || 0;
      } catch (err) {
        console.error('Error getting count:', err);
      }
  }

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Create a batch of promises
    const promises = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        const currentOffset = offset + (i * pageSize);
        // Important: Stop creating promises if we know we are past totalRows (if distinct totalRows exists?)
        // But we might not know totalRows exactly if filter is used.
        // However, standard reliable loop condition is based on results.
        // We will fetch blindly and check results.
        
        // Wait, if totalRows is 0/unknown, we can't limit promises easily by index.
        // But we want to break loop if a fetch returns empty.
        // Parallel fetching is tricky with unknown length.
        
        // Simpler Parallel Strategy:
        // Use a pointer 'offset'.
        // We fire 5 requests: [offset, offset+1000), [offset+1000, offset+2000)...
        // Then we wait for ALL. 
        // If ALL return full pages, we advance offset by 5*1000.
        // If ANY returns < pageSize, we stop.
        
        const from = currentOffset;
        const to = from + pageSize - 1;
        
        let query = supabase
          .from(table)
          .select(select)
          .range(from, to);

        if (queryBuilder) {
          query = queryBuilder(query);
        }
        
        promises.push(query.then(res => ({ ...res, from }))); // Track order? Supabase results are ordered by query.
    }

    const results = await Promise.all(promises);

    let batchHasData = false;
    
    // Sort results by 'from' to maintain order if needed (though usually we just append)
    results.sort((a, b) => a.from - b.from);

    for (const { data, error } of results) {
       if (error) throw error;
       
       if (data && data.length > 0) {
           allData.push(...data);
           batchHasData = true; 
           
           if (data.length < pageSize) {
               hasMore = false;
               // We can stop processing further results in this batch if we assume sequential consistency?
               // If request 3 returns partial, requests 4 and 5 should be empty or we are done.
           }
       } else {
           hasMore = false;
       }
    }
    
    // If entire batch was empty? (should be caught by hasMore=false in loop)
    if (!batchHasData) hasMore = false;

    if (onProgress) {
        onProgress(allData.length, totalRows);
    }
    
    if (hasMore) {
        offset += (pageSize * CONCURRENCY);
    }
  }
  
  return allData;
}

// Helper to handle export logic without alerts
const handleExport = async (
  exportPromise: Promise<any[]>, 
  filename: string,
  transformToRows: (data: any[]) => string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const data = await exportPromise;
    
    if (!data || data.length === 0) {
      return { success: false, error: 'No hay datos para exportar.' };
    }

    const csvRows = transformToRows(data);
    downloadCSV(csvRows.join('\n'), filename);
    return { success: true };
  } catch (error: any) {
    console.error('Error in export:', error);
    return { success: false, error: error.message || 'Error desconocido al exportar.' };
  }
};

export async function exportLibrosToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
    const headers_map = 'id, isbn, titulo, autor, editoriales(nombre), anio, precio, stock, categorias(nombre), paginas, descripcion, ubicacion, notas, created_at';
    
    return handleExport(
      fetchAll('libros', (query) => query.order('id', { ascending: true }), headers_map, onProgress),
      `libros_backup_${new Date().toISOString().split('T')[0]}.csv`,
      (libros) => {
          const headers = ['ID', 'ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Precio', 'Stock', 'Categoría', 'Páginas', 'Descripción', 'Ubicación', 'Notas', 'Fecha Creación'];
          const rows = [headers.join(',')];
          
          libros.forEach((libro: any) => {
            const editorialName = libro.editoriales?.nombre || '';
            const categoriaName = libro.categorias?.nombre || '';
            const row = [
                libro.id,
                `"${libro.isbn || ''}"`,
                `"${libro.titulo?.replace(/"/g, '""') || ''}"`,
                `"${libro.autor?.replace(/"/g, '""') || ''}"`,
                `"${editorialName.replace(/"/g, '""')}"`,
                libro.anio || '',
                libro.precio || 0,
                libro.stock || 0,
                `"${categoriaName.replace(/"/g, '""')}"`,
                libro.paginas || '',
                `"${libro.descripcion?.replace(/"/g, '""') || ''}"`,
                `"${libro.ubicacion || ''}"`,
                `"${libro.notas?.replace(/"/g, '""') || ''}"`,
                libro.created_at || ''
            ];
            rows.push(row.join(','));
          });
          return rows;
      }
    );
}

export async function exportCategoriasToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
    return handleExport(
        fetchAll('categorias', (q) => q.order('id', { ascending: true }), '*', onProgress),
        `categorias_backup_${new Date().toISOString().split('T')[0]}.csv`,
        (categorias) => {
            const headers = ['ID', 'Nombre', 'Descripción', 'Activa', 'Fecha Creación'];
            const rows = [headers.join(',')];
            categorias.forEach((cat: any) => {
              const row = [
                cat.id,
                `"${cat.nombre?.replace(/"/g, '""') || ''}"`,
                `"${cat.descripcion?.replace(/"/g, '""') || ''}"`,
                cat.activa ? 'Sí' : 'No',
                cat.created_at || ''
              ];
              rows.push(row.join(','));
            });
            return rows;
        }
    );
}

// Export new invoices table
export async function exportInvoicesToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
  try {
    let allInvoices: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    let totalRows = 0;
    
    if (onProgress) {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      totalRows = count || 0;
    }

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, invoice_items (*)`)
        .order('id', { ascending: true })
        .range(from, to);
      
      if (error) throw error;

      if (data && data.length > 0) {
        allInvoices = [...allInvoices, ...data];
        if (onProgress) onProgress(allInvoices.length, totalRows);
        if (data.length < pageSize) hasMore = false;
        page++;
      } else {
        hasMore = false;
      }
    }

    if (!allInvoices || allInvoices.length === 0) {
        return { success: false, error: 'No hay facturas para exportar' };
    }

    const headers = [
      'ID', 'Número Factura', 'Cliente', 'NIF', 'Dirección',
      'Fecha Emisión', 'Estado', 'Subtotal', 'Tasa IVA (%)', 'IVA',
      'Total', 'Método Pago', 'ID Pedido', 'Idioma'
    ];
    const csvRows = [headers.join(',')];

    allInvoices.forEach(invoice => {
      const row = [
        invoice.id,
        `"${invoice.invoice_number || ''}"`,
        `"${invoice.customer_name?.replace(/"/g, '""') || ''}"`,
        `"${invoice.customer_nif || ''}"`,
        `"${invoice.customer_address?.replace(/"/g, '""') || ''}"`,
        invoice.issue_date || '',
        `"${invoice.status || ''}"`,
        invoice.subtotal || 0,
        invoice.tax_rate || 0,
        invoice.tax_amount || 0,
        invoice.total || 0,
        `"${invoice.payment_method || ''}"`,
        `"${invoice.order_id || ''}"`,
        `"${invoice.language || 'es'}"`,
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), `invoices_backup_${new Date().toISOString().split('T')[0]}.csv`);
    return { success: true };
    
  } catch (error: any) {
    console.error('Error exportando invoices:', error);
    return { success: false, error: error.message || 'Error al exportar facturas' };
  }
}

export async function exportPedidosToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
  try {
    let allPedidos: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    let totalRows = 0;
    
    if (onProgress) {
         const { count } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
         totalRows = count || 0;
    }

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
            .from('pedidos')
            .select(`*, lineas_pedido (*)`)
            .order('id', { ascending: true })
            .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            allPedidos = [...allPedidos, ...data];
             if (onProgress) onProgress(allPedidos.length, totalRows);
            if (data.length < pageSize) hasMore = false;
            page++;
        } else {
            hasMore = false;
        }
    }

    if (!allPedidos || allPedidos.length === 0) {
      return { success: false, error: 'No hay pedidos para exportar' };
    }

    const headers = [
      'ID Pedido', 'Número', 'Cliente', 'Email', 'Teléfono',
      'Fecha', 'Total', 'Estado', 'Transportista', 'Notas'
    ];
    const csvRows = [headers.join(',')];

    allPedidos.forEach(pedido => {
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
    return { success: true };
  } catch (error: any) {
    console.error('Error exportando pedidos:', error);
    return { success: false, error: error.message || 'Error al exportar pedidos' };
  }
}

export async function exportIberlibroToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
    const headers_map = 'isbn, titulo, autor, editoriales(nombre), anio, precio, stock, categorias(nombre), created_at';
    return handleExport(
        fetchAll('libros', (q) => q.order('id', { ascending: true }), headers_map, onProgress),
        `iberlibro_backup_${new Date().toISOString().split('T')[0]}.csv`,
        (libros) => {
            const headers = ['ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Precio', 'Stock', 'Categoría', 'Fecha Creación'];
            const rows = [headers.join(',')];
            libros.forEach((libro: any) => {
                const editorialName = libro.editoriales?.nombre || '';
                const categoriaName = libro.categorias?.nombre || '';
                const row = [
                    `"${libro.isbn || ''}"`,
                    `"${libro.titulo?.replace(/"/g, '""') || ''}"`,
                    `"${libro.autor?.replace(/"/g, '""') || ''}"`,
                    `"${editorialName.replace(/"/g, '""')}"`,
                    libro.anio || '',
                    libro.precio || 0,
                    libro.stock || 0,
                    `"${categoriaName.replace(/"/g, '""')}"`,
                    libro.created_at || ''
                ];
                rows.push(row.join(','));
            });
            return rows;
        }
    );
}

export async function exportUniliberToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
    const headers_map = 'isbn, titulo, autor, editoriales(nombre), anio, precio, stock, categorias(nombre), created_at';
    return handleExport(
        fetchAll('libros', (q) => q.order('id', { ascending: true }), headers_map, onProgress),
        `uniliber_backup_${new Date().toISOString().split('T')[0]}.csv`,
        (libros) => {
             const headers = ['ISBN', 'Título', 'Autor', 'Editorial', 'Año', 'Precio', 'Stock', 'Categoría', 'Fecha Creación'];
             const rows = [headers.join(',')];
             libros.forEach((libro: any) => {
                const editorialName = libro.editoriales?.nombre || '';
                const categoriaName = libro.categorias?.nombre || '';
                const row = [
                    `"${libro.isbn || ''}"`,
                    `"${libro.titulo?.replace(/"/g, '""') || ''}"`,
                    `"${libro.autor?.replace(/"/g, '""') || ''}"`,
                    `"${editorialName.replace(/"/g, '""')}"`,
                    libro.anio || '',
                    libro.precio || 0,
                    libro.stock || 0,
                    `"${categoriaName.replace(/"/g, '""')}"`,
                    libro.created_at || ''
                ];
                rows.push(row.join(','));
             });
             return rows;
        }
    );
}

export async function exportClientesToCSV(onProgress?: (val: number, total: number) => void): Promise<{ success: boolean; error?: string }> {
     return handleExport(
        fetchAll('clientes', (q) => q.order('id', { ascending: true }), '*', onProgress),
        `clientes_backup_${new Date().toISOString().split('T')[0]}.csv`,
        (clientes) => {
             const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'NIF', 'Dirección', 'Ciudad', 'Código Postal', 'País', 'Activo', 'Notas', 'Fecha Creación'];
             const rows = [headers.join(',')];
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
                  rows.push(row.join(','));
             });
             return rows;
        }
     );
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
