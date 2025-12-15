import { supabase } from '../lib/supabase';
import { Book } from '../types';
import { generarCodigoLibro, actualizarCodigoPorUbicacion } from '../utils/codigoHelper';

export interface LibroSupabase {
  id: number;
  legacy_id?: string;
  isbn?: string;
  titulo: string;
  autor: string;
  editorial_id?: number;
  categoria_id?: number;
  anio?: number;
  paginas?: number;
  descripcion?: string;
  notas?: string;
  precio_original?: number;
  precio: number;
  stock: number;
  ubicacion?: string;
  fecha_ingreso?: string;
  activo: boolean;
  imagen_url?: string;
  created_at?: string;
  updated_at?: string;
  editoriales?: {
    id: number;
    nombre: string;
  };
  categorias?: {
    id: number;
    nombre: string;
  };
  destacado?: boolean;
  novedad?: boolean;
  oferta?: boolean;
  libros_contenidos?: {
    titulo: string;
    numero_volumen: number;
  }[];
}

const DEFAULT_BOOK_COVER = 'https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=400';

export const mapLibroToBook = (libro: LibroSupabase): Book => ({
  id: libro.id.toString(),
  code: libro.legacy_id || libro.id.toString(),
  title: libro.titulo,
  author: libro.autor,
  publisher: libro.editoriales?.nombre || 'Editorial Desconocida',
  pages: libro.paginas || 0,
  publicationYear: libro.anio || new Date().getFullYear(),
  isbn: libro.isbn || '',
  price: Number(libro.precio),
  originalPrice: libro.precio_original ? Number(libro.precio_original) : (libro.oferta ? Number(libro.precio) * 1.2 : undefined),
  stock: libro.stock,
  ubicacion: libro.ubicacion || '',
  category: libro.categorias?.nombre || 'General',
  description: libro.descripcion || 'Sin descripción disponible',
  coverImage: libro.imagen_url || DEFAULT_BOOK_COVER,
  rating: 0,
  reviews: [],
  featured: libro.destacado || false,
  isNew: libro.novedad || false,
  isOnSale: libro.oferta || false,
  contents: libro.libros_contenidos 
    ? libro.libros_contenidos
        .sort((a, b) => a.numero_volumen - b.numero_volumen)
        .map(c => c.titulo)
    : []
});

export interface LibroFilters {
   search?: string;
   category?: string;
   minPrice?: number;
   maxPrice?: number;
   availability?: 'all' | 'inStock' | 'outOfStock';
   sortBy?: 'price' | 'rating' | 'newest' | 'title' | 'updated';
   sortOrder?: 'asc' | 'desc';
   featured?: boolean;
   isNew?: boolean;
   isOnSale?: boolean;
   coverStatus?: 'all' | 'with_cover' | 'without_cover';
   // Advanced filters
   publisher?: string;
   location?: string;
   isbn?: string;
   minPages?: number;
   maxPages?: number;
   startYear?: number;
   endYear?: number;
   searchMode?: 'default' | 'full'; 
   titulo?: string;
   autor?: string;
 }

 export const obtenerLibros = async (
   page: number = 1, 
   itemsPerPage: number = 12, 
   filters?: LibroFilters
 ): Promise<{ data: Book[]; count: number }> => {
   try {
     let query = supabase
       .from('libros')
       // Removed Joins to prevent massive timeout on deep pagination (page 15k+)
       // We only fetch the core table now. The UI will have to rely on IDs or we fetch details separately if needed.
       .select('id, legacy_id, titulo, autor, editorial_id, precio, stock, activo, destacado, novedad, oferta, precio_original, imagen_url, paginas, anio, ubicacion, categoria_id', { count: 'estimated' })
       .eq('activo', true);

     // Apply Filters
     if (filters) {
       if (filters.search) {
         const searchTerm = filters.search.trim();
         const isNumeric = /^\d+$/.test(searchTerm);
         const isFullSearch = filters.searchMode === 'full';
         if (isFullSearch) {
            // Full Search: ID, LegacyID, Title, Author, ISBN, Editorial
            let orClause = `legacy_id.ilike.%${searchTerm}%,titulo.ilike.%${searchTerm}%,autor.ilike.%${searchTerm}%,isbn.ilike.%${searchTerm}%`;

            if (isNumeric) {
                // If numeric, check ID too
                orClause += `,id.eq.${searchTerm}`;
            }

            // Search by Editorial (Two-step process: Get IDs -> Filter Books)
            // Note: We do this only if not numeric, or if numeric has editorial name results (unlikely but possible)
            // To be efficient, we do a parallel non-blocking fetch or just await it. 
            // Given the async nature, we'll await.
            const { data: edData } = await supabase
                .from('editoriales')
                .select('id')
                .ilike('nombre', `%${searchTerm}%`);
            
            if (edData && edData.length > 0) {
                const edIds = edData.map(e => e.id).join(',');
                orClause += `,editorial_id.in.(${edIds})`;
            }

            query = query.or(orClause);

         } else {
             // Default Search: ID (Code) and Legacy ID ONLY - Optimized
             if (isNumeric) {
                 // Use prefix match for legacy_id (faster than cleaning wildcard) or exact if typically full code
                 // Converting leading wildcard to prefix-only or exact match to prevent timeout
                 query = query.or(`id.eq.${searchTerm},legacy_id.ilike.${searchTerm}%`);
             } else {
                 query = query.ilike('legacy_id', `${searchTerm}%`);
             }
         }
       }

        if (filters.category && filters.category !== 'Todos') {
             // Resolve Category Name to ID
             // Optimisation: We could cache this or pass ID from UI, but for now we look it up.
             const { data: catData, error: catError } = await supabase
                 .from('categorias')
                 .select('id')
                 .eq('nombre', filters.category)
                 .maybeSingle();
             
             if (catData && !catError) {
                 query = query.eq('categoria_id', catData.id);
             } else {
                 // If category name doesn't exist (shouldn't happen with dropdown), return empty or handle legacy
                 // Fallback for legacy "Categoría X" format just in case
                 if (filters.category.startsWith('Categoría ')) {
                      const catId = parseInt(filters.category.replace('Categoría ', ''));
                      if (!isNaN(catId)) {
                          query = query.eq('categoria_id', catId);
                      }
                 } else {
                     // If name not found and not legacy format, force no results?
                     // For now, let's assume if not found, it might be a text mismatch so we search nothing?
                     // Or better, 0 results.
                     query = query.eq('id', -1); // Impossible ID
                 }
             }
        }

       if (filters.minPrice !== undefined) {
         query = query.gte('precio', filters.minPrice);
       }
       if (filters.maxPrice !== undefined) {
         query = query.lte('precio', filters.maxPrice);
       }

       if (filters.availability === 'inStock') {
         query = query.gt('stock', 0);
       } else if (filters.availability === 'outOfStock') {
         query = query.eq('stock', 0);
       }
       
        // Apply filters
        if (filters.featured) query = query.eq('destacado', true);
        if (filters.isNew) query = query.eq('novedad', true);
        if (filters.isOnSale) query = query.eq('oferta', true);

        // Cover status filter
        if (filters.coverStatus === 'with_cover') {
          query = query.neq('imagen_url', null).neq('imagen_url', '');
        } else if (filters.coverStatus === 'without_cover') {
          query = query.or('imagen_url.is.null,imagen_url.eq.');
        }

        // Advanced Filters
        if (filters.location) {
            query = query.eq('ubicacion', filters.location);
        }

        if (filters.isbn) {
            // Remove dashes/spaces for flexible match if needed, but usually strict eq for specific field
            const clean = filters.isbn.replace(/[-\s]/g, '');
            query = query.ilike('isbn', `%${clean}%`); // partial match for convenience
        }

        if (filters.minPages !== undefined) query = query.gte('paginas', filters.minPages);
        if (filters.maxPages !== undefined) query = query.lte('paginas', filters.maxPages);
        
        if (filters.startYear !== undefined) query = query.gte('anio', filters.startYear);
        if (filters.endYear !== undefined) query = query.lte('anio', filters.endYear);

        if (filters.publisher) {
           // Filtering by related table is tricky with simple query builder without modifying the select to !inner
           // But our select is: '*, editoriales(id, nombre)...'
           // If we want to filter ONLY books with that publisher, we MUST use !inner join.
           // However, modifying the top-level .select() might be cleaner.
           // Let's rely on caching or strict ID if possible? No, user might type.
           // NOTE: Supabase client 'query' object is mutable?
           // Actually, we can't easily change the join type dynamically on the fly unless we rebuild the chain.
           // Workaround: We can search `editorial_id` if we had it.
           // If we only have text, we use `editoriales!inner(nombre)` syntax inside the filter?
           // query = query.filter('editoriales.nombre', 'ilike', `%${filters.publisher}%`) NO, needs inner join
           // Let's assume for now the user will select from a list if we implement that, 
           // OR standard search covers publisher in "text search".
           // If advanced filter is "Publisher Name", we might process it.
           // Let's skip deep publisher filtering for now or use `editorial_id` if we pass that.
           // Wait, I can try `!inner` in the initial select if I knew I needed it.
           // But I don't want to break standard queries.
           // Let's leave Publisher for now as "Use Search Bar". Or try to filter by ID if we get dropdown.
           // Actually, `AdminDashboard` doesn't have editorial dropdown.
           // I'll skip Publisher specific filter implementation inside this block for now to avoid breaking SQL 
           // and suggest user uses General Search for Publisher name.
        }

        // Sorting
       if (filters.sortBy) {
         switch (filters.sortBy) {
           case 'price':
             query = query.order('precio', { ascending: filters.sortOrder === 'asc' });
             break;
           case 'newest':
              // Assuming created_at or id implies newness
             query = query.order('created_at', { ascending: filters.sortOrder === 'asc' });
             break;
           case 'updated':
             query = query.order('updated_at', { ascending: filters.sortOrder === 'asc' });
             break;
           case 'title':
             query = query.order('titulo', { ascending: filters.sortOrder === 'asc' });
             break;
           // Rating is not in DB schema shown, ignoring for now
           default:
             query = query.order('titulo', { ascending: true });
         }
         } else {
             // Only default sort by title if NOT searching.
             // When searching (especially by code), we want matches fast, order matters less.
             // Sorting by title forces DB to process all matches before returning page 1.
             if (!filters.search) {
                query = query.order('titulo', { ascending: true });
             }
        }
     } else {
         // No filters at all (initial load?) -> Sort by title
         if (!filters || !(filters as any).search) {
             query = query.order('titulo', { ascending: true });
         }
     }

     // Pagination
     const from = (page - 1) * itemsPerPage;
     const to = from + itemsPerPage - 1;
     
     query = query.range(from, to);

     const { data, error, count } = await query;

     if (error) {
       console.error('Error al obtener libros:', error);
       return { data: [], count: 0 };
     }

     // Client-Side Join to avoid DB Timeout on deep pagination
     // We fetch the names only for the resulting page (12-20 items), not the whole sorted set
     if (data && data.length > 0) {
         const editorialIds = Array.from(new Set(data.map(b => b.editorial_id).filter(id => id)));
         const categoryIds = Array.from(new Set(data.map(b => b.categoria_id).filter(id => id)));

         const promises = [];
         
         if (editorialIds.length > 0) {
             promises.push(supabase.from('editoriales').select('id, nombre').in('id', editorialIds));
         } else promises.push(Promise.resolve({ data: [] }));

         if (categoryIds.length > 0) {
             promises.push(supabase.from('categorias').select('id, nombre').in('id', categoryIds));
         } else promises.push(Promise.resolve({ data: [] }));

         const [edResult, catResult] = await Promise.all(promises);
         
         const edMap = new Map(edResult.data?.map((e: any) => [e.id, e]) || []);
         const catMap = new Map(catResult.data?.map((c: any) => [c.id, c]) || []);

         // Attach to data
         (data as any[]).forEach(book => {
             if (book.editorial_id) book.editoriales = edMap.get(book.editorial_id);
             if (book.categoria_id) book.categorias = catMap.get(book.categoria_id);
         });
     }

     return {
       data: data ? data.map(mapLibroToBook) : [],
       count: count || 0
     };
   } catch (error) {
     console.error('Error inesperado al obtener libros:', error);
     return { data: [], count: 0 };
   }
 };

export const obtenerLibroPorId = async (id: string | number): Promise<Book | null> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre), libros_contenidos(titulo, numero_volumen)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener libro:', error);
      return null;
    }

    return data ? mapLibroToBook(data) : null;
  } catch (error) {
    console.error('Error inesperado al obtener libro:', error);
    return null;
  }
};

export const crearLibro = async (libro: Partial<LibroSupabase>, contenidos?: string[]): Promise<Book | null> => {
  try {
    // Primero insertamos sin legacy_id para obtener el ID autogenerado
    const { data: libroTemp, error: insertError } = await supabase
      .from('libros')
      .insert({
        titulo: libro.titulo,
        autor: libro.autor,
        isbn: libro.isbn || null,
        precio: libro.precio,
        precio_original: libro.precio_original || null,
        stock: libro.stock || 0,
        ubicacion: libro.ubicacion || null,
        descripcion: libro.descripcion || null,
        imagen_url: libro.imagen_url || null,
        paginas: libro.paginas || null,
        anio: libro.anio || null,
        categoria_id: libro.categoria_id || null,
        editorial_id: libro.editorial_id || null,
        notas: libro.notas || null,
        activo: true,
        destacado: libro.destacado || false,
        novedad: libro.novedad || false,
        oferta: libro.oferta || false,
        fecha_ingreso: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !libroTemp) {
      console.error('Error al crear libro:', insertError);
      return null;
    }

    // Insertar contenidos (volúmenes) si existen
    if (contenidos && contenidos.length > 0) {
      const contenidosData = contenidos.map((titulo, index) => ({
        libro_id: libroTemp.id,
        titulo: titulo,
        numero_volumen: index + 1
      }));

      const { error: contenidosError } = await supabase
        .from('libros_contenidos')
        .insert(contenidosData);

      if (contenidosError) {
        console.error('Error al insertar contenidos del libro:', contenidosError);
        // No fallamos la creación del libro principal, pero logueamos el error
      }
    }

    // Generar el código basado en el ID y la ubicación
    const ubicacion = libro.ubicacion || 'almacen';
    const codigoGenerado = libro.legacy_id
      ? actualizarCodigoPorUbicacion(libro.legacy_id, ubicacion)
      : generarCodigoLibro(libroTemp.id, ubicacion);

    // Actualizar el libro con el código generado
    const { data, error: updateError } = await supabase
      .from('libros')
      .update({ legacy_id: codigoGenerado })
      .eq('id', libroTemp.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar código del libro:', updateError);
      return null;
    }

    return data ? mapLibroToBook(data) : null;
  } catch (error) {
    console.error('Error inesperado al crear libro:', error);
    return null;
  }
};

export const actualizarLibro = async (id: number, libro: Partial<LibroSupabase>, contenidos?: string[]): Promise<Book | null> => {
  try {
    console.log('=== ACTUALIZAR LIBRO ===');
    console.log('ID:', id);
    console.log('Datos a actualizar:', libro);

    // Obtener el libro actual para saber su código y ubicación actual
    const { data: libroActual, error: fetchError } = await supabase
      .from('libros')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error al obtener libro actual:', fetchError);
      throw new Error(`Error al obtener libro actual: ${fetchError.message}`);
    }

    if (!libroActual) {
      throw new Error('Libro no encontrado');
    }

    console.log('Libro actual:', libroActual);

    const updateData: any = {};

    if (libro.titulo !== undefined) updateData.titulo = libro.titulo;
    if (libro.autor !== undefined) updateData.autor = libro.autor;
    if (libro.isbn !== undefined) updateData.isbn = libro.isbn || null;
    if (libro.precio !== undefined) updateData.precio = libro.precio;
    if (libro.precio_original !== undefined) updateData.precio_original = libro.precio_original;
    if (libro.stock !== undefined) updateData.stock = libro.stock;
    if (libro.descripcion !== undefined) updateData.descripcion = libro.descripcion || null;
    if (libro.imagen_url !== undefined) updateData.imagen_url = libro.imagen_url || null;
    if (libro.paginas !== undefined) updateData.paginas = libro.paginas || null;
    if (libro.anio !== undefined) updateData.anio = libro.anio || null;
    if (libro.categoria_id !== undefined) updateData.categoria_id = libro.categoria_id || null;
    if (libro.editorial_id !== undefined) updateData.editorial_id = libro.editorial_id || null;
    if (libro.notas !== undefined) updateData.notas = libro.notas || null;
    if (libro.activo !== undefined) updateData.activo = libro.activo;
    if (libro.destacado !== undefined) updateData.destacado = libro.destacado;
    if (libro.novedad !== undefined) updateData.novedad = libro.novedad;
    if (libro.oferta !== undefined) updateData.oferta = libro.oferta;

    // Si se cambia la ubicación, actualizar el código
    if (libro.ubicacion !== undefined) {
      updateData.ubicacion = libro.ubicacion;

      // Actualizar el código basado en la nueva ubicación
      const codigoActual = libroActual?.legacy_id || id.toString();
      const nuevoCodigo = actualizarCodigoPorUbicacion(codigoActual, libro.ubicacion);
      updateData.legacy_id = nuevoCodigo;
    } else if (libro.legacy_id !== undefined) {
      // Si se proporciona un legacy_id manualmente, usarlo
      updateData.legacy_id = libro.legacy_id;
    }

    updateData.updated_at = new Date().toISOString();

    console.log('Datos preparados para UPDATE:', updateData);

    // Verificar permisos antes del UPDATE
    const { data: permisosCheck } = await supabase.rpc('can_manage_books');
    console.log('Resultado can_manage_books():', permisosCheck);

    const { data: editorCheck } = await supabase.rpc('is_editor');
    console.log('Resultado is_editor():', editorCheck);

    const { error: updateError } = await supabase
      .from('libros')
      .update(updateData)
      .eq('id', id);

    console.log('Error del UPDATE:', updateError);

    if (updateError) {
      console.error('Error al actualizar libro:', updateError);
      throw new Error(`Error de base de datos: ${updateError.message}`);
    }

    console.log('✓ UPDATE ejecutado correctamente');

    // Actualizar contenidos si se proporcionan
    if (contenidos) {
      console.log('Actualizando contenidos del libro...');
      // 1. Eliminar contenidos existentes
      const { error: deleteError } = await supabase
        .from('libros_contenidos')
        .delete()
        .eq('libro_id', id);

      if (deleteError) {
        console.error('Error al eliminar contenidos antiguos:', deleteError);
      } else {
        // 2. Insertar nuevos contenidos
        if (contenidos.length > 0) {
          const contenidosData = contenidos.map((titulo, index) => ({
            libro_id: id,
            titulo: titulo,
            numero_volumen: index + 1
          }));

          const { error: insertError } = await supabase
            .from('libros_contenidos')
            .insert(contenidosData);

          if (insertError) {
            console.error('Error al insertar nuevos contenidos:', insertError);
          }
        }
      }
    }

    // Obtener el libro actualizado con un SELECT separado para incluir editoriales y contenidos
    const { data: libroActualizado, error: selectError } = await supabase
      .from('libros')
      .select(`
        *,
        editoriales (
          id,
          nombre
        ),
        libros_contenidos (
          titulo,
          numero_volumen
        )
      `)
      .eq('id', id)
      .maybeSingle();

    console.log('Libro actualizado (con SELECT):', libroActualizado);

    if (selectError) {
      console.error('Error al obtener libro actualizado:', selectError);
      throw new Error(`Error al obtener libro actualizado: ${selectError.message}`);
    }

    if (!libroActualizado) {
      throw new Error('No se pudo obtener el libro actualizado');
    }

    const libroMapeado = mapLibroToBook(libroActualizado);
    console.log('Libro mapeado final:', libroMapeado);
    console.log('=== FIN ACTUALIZAR LIBRO ===');

    return libroMapeado;
  } catch (error) {
    console.error('Error inesperado al actualizar libro:', error);
    throw error;
  }
};

export const eliminarLibro = async (id: number): Promise<boolean> => {
  try {
    // Soft delete - marcar como inactivo
    const { error } = await supabase
      .from('libros')
      .update({ activo: false })
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar libro:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado al eliminar libro:', error);
    return false;
  }
};

export const buscarLibros = async (query: string): Promise<Book[]> => {
  try {
    const isNumeric = /^\d+$/.test(query);
    
    if (isNumeric) {
      // Parallel execution: Exact Match (Priority) + Fuzzy Search
      const [exactMatch, fuzzyMatch] = await Promise.all([
        // 1. Exact Priority Search (ID or Legacy ID)
        supabase
          .from('libros')
          .select('*, editoriales(id, nombre), categorias(id, nombre)')
          .eq('activo', true)
          .or(`id.eq.${query},legacy_id.eq.${query}`),
        
        // 2. Standard Fuzzy Search (limit 20 to be faster)
        supabase
          .from('libros')
          .select('*, editoriales(id, nombre), categorias(id, nombre)')
          .eq('activo', true)
          .or(`titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%,legacy_id.ilike.%${query}%`)
          .order('titulo', { ascending: true })
          .limit(20)
      ]);

      const exactData = exactMatch.data || [];
      const fuzzyData = fuzzyMatch.data || [];

      // Combine: Exact matches first, then fuzzy matches (filtering duplicates)
      const exactIds = new Set(exactData.map(b => b.id));
      const filteredFuzzy = fuzzyData.filter(b => !exactIds.has(b.id));

      const combinedResults = [...exactData, ...filteredFuzzy];
      return combinedResults.map(mapLibroToBook);

    } else {
      // Non-numeric search: Standard fuzzy search
      const { data, error } = await supabase
        .from('libros')
        .select('*')
        .eq('activo', true)
        .or(`titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%,legacy_id.ilike.%${query}%`)
        .order('titulo', { ascending: true })
        .limit(20);

        if (error) {
          console.error('Error al buscar libros:', error);
          return [];
        }

        if (!data || data.length === 0) return [];
        return await enrichBooks(data);
    }
  } catch (error) {
    console.error('Error inesperado al buscar libros:', error);
    return [];
  }
};

export const obtenerLibrosPorCategoria = async (categoriaId: number): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .eq('activo', true)
      .eq('categoria_id', categoriaId)
      .order('titulo', { ascending: true });

    if (error) {
      console.error('Error al obtener libros por categoría:', error);
      return [];
    }

    return data ? data.map(mapLibroToBook) : [];
  } catch (error) {
    console.error('Error inesperado al obtener libros por categoría:', error);
    return [];
  }
};

// Función para obtener el conteo total de libros
export const obtenerTotalLibros = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('libros')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    if (error) {
      console.error('Error al obtener total de libros:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error inesperado al obtener total de libros:', error);
    return 0;
  }
};

// Función para obtener estadísticas de libros
export const obtenerEstadisticasLibros = async (): Promise<{
  total: number;
  enStock: number;
  sinStock: number;
}> => {
  try {
    // Obtener total de libros activos (Estimado para rendimiento)
    // Obtener total de libros activos
    const { count: total, error: errorTotal } = await supabase
      .from('libros')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true);

    // Obtener libros con stock > 0
    // Obtener libros con stock > 0
    const { count: enStock, error: errorStock } = await supabase
      .from('libros')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true)
      .gt('stock', 0);

    if (errorTotal || errorStock) {
      console.error('Error al obtener estadísticas:', errorTotal || errorStock);
      return { total: 0, enStock: 0, sinStock: 0 };
    }

    return {
      total: total || 0,
      enStock: enStock || 0,
      sinStock: (total || 0) - (enStock || 0)
    };
  } catch (error) {
    console.error('Error inesperado al obtener estadísticas:', error);
    return { total: 0, enStock: 0, sinStock: 0 };
  }
};

export const obtenerTotalUnidadesStock = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_total_books_stock');
    
    if (error) {
      console.error('Error al obtener total de unidades:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error al llamar RPC get_total_books_stock:', error);
    return 0;
  }
};

export const buscarLibroPorISBN = async (isbn: string): Promise<LibroSupabase | null> => {
  try {
    if (!isbn) return null;

    const cleanISBN = isbn.replace(/[-\s]/g, '');

    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .eq('activo', true)
      .eq('isbn', cleanISBN)
      .maybeSingle();

    if (error) {
      console.error('Error al buscar libro por ISBN:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al buscar libro por ISBN:', error);
    return null;
  }
};

export const incrementarStockLibro = async (id: number, cantidad: number = 1): Promise<Book | null> => {
  try {
    const { data: libroActual, error: fetchError } = await supabase
      .from('libros')
      .select('stock')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error al obtener stock actual:', fetchError);
      return null;
    }

    const nuevoStock = (libroActual.stock || 0) + cantidad;

    const { data, error } = await supabase
      .from('libros')
      .update({
        stock: nuevoStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .single();

    if (error) {
      console.error('Error al incrementar stock:', error);
      return null;
    }

    return data ? mapLibroToBook(data) : null;
  } catch (error) {
    console.error('Error inesperado al incrementar stock:', error);
    return null;
  }
};

export const obtenerLibrosSinISBN = async (limit: number = 50): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .eq('activo', true)
      .or('isbn.is.null,isbn.eq.""') // Fixed empty string check syntax for some supabase versions, but usually .eq."" works or .is.null
      .order('titulo', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error al obtener libros sin ISBN:', error);
      return [];
    }

    return data ? data.map(mapLibroToBook) : [];
  } catch (error) {
    console.error('Error inesperado al obtener libros sin ISBN:', error);
    return [];
  }
};

export const obtenerLibrosSinPortada = async (limit: number = 50): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .eq('activo', true)
      .or('imagen_url.is.null,imagen_url.eq.""')
      .order('titulo', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error al obtener libros sin portada:', error);
      return [];
    }

    return data ? data.map(mapLibroToBook) : [];
  } catch (error) {
    console.error('Error inesperado al obtener libros sin portada:', error);
    return [];
  }
};

export const actualizarISBN = async (id: number, isbn: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    // Verificación de duplicados eliminada a petición del usuario
    /*
    const { data: libroExistente, error: checkError } = await supabase
      .from('libros')
      .select('id, titulo')
      .eq('isbn', cleanISBN)
      .maybeSingle();
      */

    /*
    if (checkError) {
      console.error('Error al verificar ISBN duplicado:', checkError);
      return { success: false, error: 'Error al verificar ISBN' };
    }
    */

// Eliminamos la comprobación de duplicados porque ahora se permiten ISBNs repetidos
    /*
    if (libroExistente) {
      if (libroExistente.id === id) {
          return { success: true };
      }

      // Advertencia en log pero permitimos guardar
      console.warn(`ISBN ${cleanISBN} ya asignado a libro ID ${libroExistente.id}, pero se permite duplicado.`);
    }
    */

    const { error } = await supabase
      .from('libros')
      .update({
        isbn: cleanISBN,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar ISBN:', error);
      // El código 23505 ya no debería ocurrir si se ejecutó el script de eliminación de constraint
      // pero lo mantenemos manejado por si acaso
      if (error.code === '23505') {
        return { success: false, error: 'Este ISBN ya existe en otro libro (Error de Base de Datos - Unique Constraint)' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error inesperado al actualizar ISBN:', error);
    return { success: false, error: 'Error inesperado al actualizar ISBN' };
  }
};
