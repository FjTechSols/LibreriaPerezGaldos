import { supabase } from '../lib/supabase';
import { Book } from '../types';
import { generarCodigoLibro, actualizarCodigoPorUbicacion, obtenerSufijoUbicacion } from '../utils/codigoHelper';
import { discountService, DiscountRule } from './discountService';

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
  descatalogado?: boolean;
  estado?: 'nuevo' | 'leido';
  idioma?: string;
  libros_contenidos?: {
    titulo: string;
    numero_volumen: number;
  }[];
}

export const obtenerOcrearEditorial = async (nombre: string): Promise<number | null> => {
  if (!nombre) return null;
  const nombreNormalizado = nombre.trim();
  if (!nombreNormalizado) return null;

  try {
    // 1. Check if exists
    const { data, error } = await supabase
      .from('editoriales')
      .select('id')
      .ilike('nombre', nombreNormalizado)
      .maybeSingle();

    if (error) throw error;
    if (data) return data.id;

    // 2. Create   if (!data) {
    const { data: newEd, error: createError } = await supabase
      .from('editoriales')
      .insert({ nombre: nombreNormalizado })
      .select('id')
      .single();

    if (createError) throw createError;
    return newEd ? newEd.id : null;
  } catch (error) {
    console.error('Error handling editorial:', error);
    return null;
  }
};

// Public search for autocomplete
export const buscarEditoriales = async (query: string): Promise<{ id: number; nombre: string }[]> => {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const { data, error } = await supabase
      .from('editoriales')
      .select('id, nombre')
      .ilike('nombre', `%${query.trim()}%`)
      .limit(10)
      .order('nombre');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching editoriales:', error);
    return [];
  }
};

// Internal use: Get or Create
// Strict lookup only, as categories are fixed in the UI
export const obtenerCategoriaId = async (nombre: string): Promise<number | null> => {
  if (!nombre || !nombre.trim()) return null;
  const nombreLimpio = nombre.trim();
  
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('id')
      .ilike('nombre', nombreLimpio) // Use ilike for robustness even if select matches
      .maybeSingle();

    if (error) throw error;
    return data ? data.id : null;
  } catch (error) {
    console.error('Error fetching category ID:', error);
    return null;
  }
};


const DEFAULT_BOOK_COVER = '/default-book-cover.png';

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
  isOutOfPrint: libro.descatalogado || false,
  condition: (libro.estado as 'nuevo' | 'leido') || 'leido',
  language: libro.idioma || 'Español',
  contents: libro.libros_contenidos 
    ? libro.libros_contenidos
        .sort((a, b) => a.numero_volumen - b.numero_volumen)
        .map(c => c.titulo)
    : []
});

// Helper to apply discounts
const applyDiscountsToBookWithId = (book: Book, discounts: DiscountRule[], categoryId?: number): Book => {
    if (!discounts || discounts.length === 0) return book;

    let bestDiscount: DiscountRule | null = null;
    let maxPercent = 0;

    for (const rule of discounts) {
        if (rule.scope === 'GLOBAL') {
            if (rule.discount_percent > maxPercent) {
                maxPercent = rule.discount_percent;
                bestDiscount = rule;
            }
        } else if (rule.scope === 'CATEGORY' && categoryId) {
             if (rule.target_category_id === categoryId) {
                  if (rule.discount_percent > maxPercent) {
                    maxPercent = rule.discount_percent;
                    bestDiscount = rule;
                }
             }
        }
    }

    if (bestDiscount && maxPercent > 0) {
        // If "Original Price" is already set (e.g. from manual single book offer), do we override?
        // Let's assume Global Discount takes precedence OR applies on top?
        // Usually, apply on top of *current* price? 
        // Or if book has manual offer (isOnSale=true), ignore global?
        // Let's say: If book is already manually on sale, we ignore global to avoid double dipping/confusion unless we want stacking.
        // Simple Rule: If manual offer exists, keep it. If not, apply global.
        
        if (book.isOnSale && book.originalPrice) {
            // Already has a specific offer, skip global rules to be safe?
            // User can override this behaviour if they want "Extra 10% off sales".
            // For now, let's Apply ONLY if not already on sale, OR if the Global discount > Current Discount?
            // Let's stick to: Global applies to regular price. If manual offer exists, we respect manual offer (it's specific).
            return book; 
        }

        const originalPrice = book.price;
        const discountAmount = (originalPrice * maxPercent) / 100;
        const finalPrice = originalPrice - discountAmount;
        
        return {
            ...book,
            price: Number(finalPrice.toFixed(2)),
            originalPrice: originalPrice,
            isOnSale: true
        };
    }

    return book;
};

export interface LibroFilters {
   search?: string;
   category?: string;
   minPrice?: number;
   maxPrice?: number;
   availability?: 'all' | 'inStock' | 'outOfStock';
   sortBy?: 'price' | 'rating' | 'newest' | 'title' | 'updated' | 'default';
   sortOrder?: 'asc' | 'desc';
   featured?: boolean;
   isNew?: boolean;
   isOnSale?: boolean;
   isOutOfPrint?: boolean;
   language?: string;
   condition?: 'nuevo' | 'leido';
   coverStatus?: 'all' | 'with_cover' | 'without_cover';

   // Advanced filters
   publisher?: string;
   location?: string;
   isbn?: string;
   minPages?: number;
   maxPages?: number;
   startYear?: number;
   endYear?: number;
   searchMode?: 'default' | 'full' | 'title_legacy'; 
   titulo?: string;
   autor?: string;
   descripcion?: string;
   legacy_id?: string;
   forceCount?: boolean;
 }

// Helper to get the next lexicographical string for range queries
// '123' -> '124', '09' -> '0:', etc.
const getNextSearchTerm = (term: string): string => {
  if (term.length === 0) return term;
  const lastChar = term.slice(-1);
  const prefix = term.slice(0, -1);
  const nextLastChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
  return prefix + nextLastChar;
};

// New function to check for book existence with simplified, targeted query
export const verificarExistenciaLibro = async (
    criteria: { code?: string; isbn?: string; title?: string; author?: string; limit?: number; offset?: number }
): Promise<Book[]> => {
    let query = supabase
        .from('libros')
        .select('*, editoriales(id, nombre), categorias(id, nombre)')
        .eq('activo', true);

    const conditions: string[] = [];

    // Prioritize ID/Code search
    if (criteria.code) {
        // Match exact legacy_id OR id
        // Note: criteria.code usually comes from user input.
        conditions.push(`legacy_id.ilike.${criteria.code}`);
        // If numeric, might be an ID too
        if (/^\d+$/.test(criteria.code)) {
             conditions.push(`id.eq.${criteria.code}`);
        }
    }

    if (criteria.isbn) {
        conditions.push(`isbn.ilike.${criteria.isbn}`);
    }

    // Title and Author
    // Strategy: If both are present, we could check (Title AND Author).
    // But usually in this modal, if user fills just Title, we search Title.
    // If user fills Title and Author, current Modal logic passed ONLY ONE to 'search'.
    // Here we can be smarter.
    // If both title AND author provided, we might want to check for books matching BOTH.
    // But let's stick to the user's input model:
    // If I search Title "Tarzan", I want all Tarzans.
    // The Modal allows filling multiple fields.
    // Let's perform a smart check:
    // If Code/ISBN -> High confidence match.
    // Else -> Fuzzy Match Title/Author.
    
    // IMPORTANT FIX: The user's query failed on "El Regreso de Tarzán".
    // We must ensure the 'ilike' works.
    // Supabase `ilike` with `%` wildcard is needed for contains.

    if (criteria.code || criteria.isbn) {
       // If we have strong identifiers, use OR for them
       if (conditions.length > 0) {
           query = query.or(conditions.join(','));
       }
    } else {
        // Weak identifiers (Title/Author)
        // If both present, use AND logic? Or OR?
        // User might fill Title: "Quijote" Author: "Cervantes". Should match book with Title="Quijote" AND Author="Cervantes".
        
        if (criteria.title && criteria.author) {
             query = query.ilike('titulo', `%${criteria.title}%`).ilike('autor', `%${criteria.author}%`);
        } else if (criteria.title) {
             query = query.ilike('titulo', `%${criteria.title}%`);
        } else if (criteria.author) {
             query = query.ilike('autor', `%${criteria.author}%`);
        }
    }


    // Pagination (Default limit 20, but expandable)
    const limit = criteria.limit || 20;
    const offset = criteria.offset || 0;
    
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
        console.error('Error verifying existence:', error);
        return [];
    }

    return data ? data.map(mapLibroToBook) : [];
};



export const obtenerLibros = async (
  page: number = 1, 
  itemsPerPage: number = 12, 
  filters?: LibroFilters
): Promise<{ data: Book[]; count: number }> => {
  try {
    // Optimization: Skip count entirely if it's the default view to prevent timeout.
    // We rely on the cached 'totalDatabaseBooks' in the UI for the total count.
    
    // Check if filters are truly default
    const isDefaultView = !filters || (
        !filters.search && 
        (!filters.category || filters.category === 'Todos') && 
        !filters.publisher && 
        (!filters.minPrice || filters.minPrice === 0) && // Allow 0 as default
        (!filters.maxPrice || filters.maxPrice === 1000 || filters.maxPrice >= 1000000) && // Allow 1000 or high number as default
        (!filters.availability || filters.availability === 'inStock') && // 'inStock' is our default view usually
        !filters.featured && 
        !filters.isNew && 
        !filters.isOnSale && 
        !filters.isOutOfPrint &&
        !filters.language &&
        !filters.condition &&
        !filters.location && 
        !filters.isbn &&
        !filters.forceCount
    );
    
    
    // OPTIMIZATION:
    // For Full Text Search (FTS), counting rows is extremely expensive (3s+ for 'sistema').
    // We skip counting for text searches to ensure "Instant" feel.
    // We only count if it's a default view or specific filter where count is cheap.
    // 'exact' count forces a full scan matching the filter.
    
    const isTextSearch = !!filters?.search && !/^\d+$/.test(filters.search.trim());
    const countStrategy = (isDefaultView || !isTextSearch) ? 'exact' : undefined;

    let query = supabase
      .from('libros')
      // Removed Joins to prevent massive timeout on deep pagination (page 15k+)
      // We only fetch the core table now. The UI will have to rely on IDs or we fetch details separately if needed.
      .select('id, legacy_id, isbn, titulo, autor, editorial_id, precio, stock, activo, destacado, novedad, oferta, precio_original, imagen_url, paginas, anio, ubicacion, categoria_id, descripcion', { count: countStrategy as any })
      .eq('activo', true);

    // Apply Filters
    if (filters) {
      if (filters.search) {
        const searchTerm = filters.search.trim();
        const isNumeric = /^\d+$/.test(searchTerm);
        
        // 1. Numeric/Code Priority Search (Legacy compatibility)
        if (isNumeric && filters.searchMode === 'default') {
             // Exact match optimization for Barcode scanners
             const { data: exactLegacy, error: exactError } = await supabase
                  .from('libros')
                  .select('id, legacy_id, titulo, autor, editorial_id, precio, stock, activo, destacado, novedad, oferta, precio_original, imagen_url, paginas, anio, ubicacion, categoria_id', { count: 'estimated' })
                  .eq('activo', true)
                  // User requirement: Search ONLY by legacy_id for codes
                  .eq('legacy_id', searchTerm)
                  .limit(5);

             if (!exactError && exactLegacy && exactLegacy.length > 0) {
                  return { data: exactLegacy.map(mapLibroToBook), count: exactLegacy.length };
             }
             
             // Fallback range query for prefix (optimized)
             const nextTerm = getNextSearchTerm(searchTerm);
             query = query.gte('legacy_id', searchTerm).lt('legacy_id', nextTerm);
             
        } else {
             // 2. SMART MATCH MULTI-TÉRMINO (Título, Autor, ISBN, Código)
             // Lógica: Dividimos la búsqueda en palabras.
             // Para 'Quijote Cervantes': (Titulo~Quijote O Autor~Quijote) AND (Titulo~Cervantes O Autor~Cervantes)
             
             const terms = searchTerm.split(/\s+/).filter(t => t.length > 0);
             
             if (terms.length > 0) {
                 terms.forEach(term => {
                     // Sanear caracteres problemáticos para la URL de PostgREST si fuera necesario
                     // Para ilike simple, solo nos aseguramos de no romper la cadena
                     const t = `%${term}%`;
                     query = query.or(`titulo.ilike.${t},autor.ilike.${t},isbn.ilike.${t},legacy_id.ilike.${t}`);
                 });
             } else {
                 // Fallback por si acaso llega string vacío tras split
                 const t = `%${searchTerm}%`;
                 query = query.or(`titulo.ilike.${t},autor.ilike.${t},isbn.ilike.${t},legacy_id.ilike.${t}`);
             }
        }
      }
       if (filters.category && filters.category !== 'Todos') {
            // Resolve Category Name to ID
            // Optimisation: We could cache this or pass ID from UI, but for now we look it up.
            const { data: catData, error: catError } = await supabase
                .from('categorias')
                .select('id')
                .ilike('nombre', filters.category) // Use ilike for robustness
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

      // Optimize Price Filter: Only apply if meaningfully restrictive
      if (filters.minPrice !== undefined && filters.minPrice > 0) {
        query = query.gte('precio', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        // Assume 1000 is the slider max, so no need to filter if it's 1000+
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
       if (filters.isOutOfPrint) query = query.eq('descatalogado', true);
       
       if (filters.language && filters.language !== 'Todos') {
           // Use broad matching to catch various formats in legacy data
           // e.g. "Español" matches "En Español", "Texto: Español", etc.
           query = query.ilike('idioma', `%${filters.language}%`);
       }
       // Removed explicit 'todos' check as type is stricter
       if (filters.condition) { 
           // Use ilike for case insensitivity (e.g. 'Nuevo' vs 'nuevo')
           query = query.ilike('estado', filters.condition);
       }

       // Cover status filter
       if (filters.coverStatus === 'with_cover') {
         query = query.neq('imagen_url', null).neq('imagen_url', '');
       } else if (filters.coverStatus === 'without_cover') {
         query = query.or('imagen_url.is.null,imagen_url.eq.');
       }

       // Advanced Filters
       if (filters.location) {
           query = query.ilike('ubicacion', filters.location);
       }

        if (filters.isbn) {
            // Remove dashes/spaces for flexible match if needed, but usually strict eq for specific field
            const clean = filters.isbn.replace(/[-\s]/g, '');
            // Keep isbn as iLike/eq usually, but fts handles punctuation well too.
            // For ISBN, ILIKE is safer for partial matches of numbers
            query = query.ilike('isbn', `%${clean}%`); 
        }

        if (filters.legacy_id) {
            query = query.ilike('legacy_id', `%${filters.legacy_id}%`);
        }

        if (filters.titulo) {
            // Optimisation: Use ILIKE which uses the Trigram Index (idx_libros_titulo_trgm)
            // This is lightning fast for substring matches and doesn't require FTS index
            query = query.ilike('titulo', `%${filters.titulo.trim()}%`);
        }
        
        if (filters.autor) {
            // Optimisation: Use ILIKE which uses the Trigram Index (idx_libros_autor_trgm)
            query = query.ilike('autor', `%${filters.autor.trim()}%`);
        }

        if (filters.descripcion) {
             // Fallback to simple substring match. 
             // Note: We removed the heavy description FTS index. 
             // If this becomes slow, we can effectively search the 'D' weighted items in search_vector,
             // but ilike is usually sufficient for advanced specific queries.
             query = query.ilike('descripcion', `%${filters.descripcion.trim()}%`);
        }

        if (filters.minPages !== undefined) query = query.gte('paginas', filters.minPages);
        if (filters.maxPages !== undefined) query = query.lte('paginas', filters.maxPages);
        
        if (filters.startYear !== undefined) query = query.gte('anio', filters.startYear);
        if (filters.endYear !== undefined) query = query.lte('anio', filters.endYear);

        if (filters.publisher) {
             // Resolve Publisher Name to ID
             const { data: eds } = await supabase
                .from('editoriales')
                .select('id')
                .ilike('nombre', `%${filters.publisher.trim()}%`) // ILIKE is case insensitive
                .limit(50);
                
             if (eds && eds.length > 0) {
                 query = query.in('editorial_id', eds.map(e => e.id));
             } else {
                 // No matching publisher found -> No books
                 query = query.eq('id', -1);
             }
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
          case 'default':
            // Fast Default: Sort by ID (PK index). Respect user direction.
            // This prevents timeouts on large filtered datasets (e.g. location filter)
            query = query.order('id', { ascending: filters.sortOrder === 'asc' });
            break;
          // Rating is not in DB schema shown, ignoring for now
          default:
            // Fallback if not matched: ID descending for performance
            query = query.order('id', { ascending: filters.sortOrder === 'asc' });
        }
        } else {
            // Only default sort by title if NOT searching.
            // When searching (especially by code), we want matches fast, order matters less.
            // Sorting by title forces DB to process all matches before returning page 1.
            if (!filters.search) {
               // Modified from 'titulo' to 'id' desc for performance optimization (initial load)
               query = query.order('id', { ascending: false });
            }
       }
    } else {
        // No filters at all (initial load?) -> Sort by ID (Fastest)
        if (!filters || !(filters as any).search) {
            query = query.order('id', { ascending: false });
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

        // Fetch active discounts to apply
        promises.push(discountService.getActiveDiscounts());

        const results = await Promise.all(promises);
        const edResult = results[0] as { data: { id: number; nombre: string }[] | null };
        const catResult = results[1] as { data: { id: number; nombre: string }[] | null };
        const activeDiscounts = (results[2] as DiscountRule[]) || [];
        
        const edMap = new Map(edResult.data?.map((e: any) => [e.id, e]) || []);
        const catMap = new Map(catResult.data?.map((c: any) => [c.id, c]) || []);

        // Attach to data & Apply Discounts
        const books = (data as any[]).map(book => {
            if (book.editorial_id) book.editoriales = edMap.get(book.editorial_id);
            if (book.categoria_id) book.categorias = catMap.get(book.categoria_id);
            
            // First map to basic book
            const mappedBook = mapLibroToBook(book);
            
            // Validate if discounts service returned populated join for category name logic
            // (We might need to fetch categories for discount rules inside the service? 
            //  Yes, getAllDiscounts does join 'categorias'. getActiveDiscounts currently selects '*' 
            //  We should update getActiveDiscounts in service to also join categories for the name match to work safely)
            //  Wait, getActiveDiscounts in service (Step 1057) did NOT join categories. 
            //  It did select '*'. I should fix that or fetch names here.
            //  ACTUALLY, I can match by ID if I expose category_id on the Book object? 
            //  Book type currently doesn't have it explicitly defined in this file's mapLibroToBook return 
            //  (it returns Book interface which usually doesn't have it).
            //  But `mapLibroToBook` uses `libro.categorias?.nombre`.
            //  
            //  Strategy: Since I have `catMap` here with IDs, and the rule has `target_category_id`.
            //  I can match `book.categoria_id` === `rule.target_category_id`.
            //  Much safer than string matching.
            
            return applyDiscountsToBookWithId(mappedBook, activeDiscounts, book.categoria_id);
        });


         let finalCount = count;
         if (count === null && isTextSearch) {
             // If we found a full page, assume there are more pages.
             if ((data as any[]).length === itemsPerPage) {
                  finalCount = (page * itemsPerPage) + 100; 
             } else {
                  // If less than full page, we know the exact count
                  finalCount = ((page - 1) * itemsPerPage) + (data as any[]).length;
             }
         }

         return {
           data: books,
           count: finalCount ?? 0
         };
    }

     return {
       data: [],
       count: 0
     };
  } catch (error) {
    console.error('Error inesperado al obtener libros:', error);
    return { data: [], count: 0 };
  }
};

export const obtenerLibroPorId = async (id: string | number): Promise<Book | null> => {
  try {
    const [bookResult, discountsResult] = await Promise.all([
        supabase
          .from('libros')
          .select('*, editoriales(id, nombre), categorias(id, nombre), libros_contenidos(titulo, numero_volumen)')
          .eq('id', id)
          .maybeSingle(),
        discountService.getActiveDiscounts()
    ]);

    const { data, error } = bookResult;
    const activeDiscounts = discountsResult || [];

    if (error) {
      console.error('Error al obtener libro:', error);
      return null;
    }

    if (!data) return null;

    const mappedBook = mapLibroToBook(data);
    return applyDiscountsToBookWithId(mappedBook, activeDiscounts, data.categoria_id);
  } catch (error) {
    console.error('Error inesperado al obtener libro:', error);
    return null;
  }
};

export const crearLibro = async (libro: Partial<LibroSupabase>, contenidos?: string[]): Promise<LibroSupabase | null> => {
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
        descatalogado: libro.descatalogado || false,
        estado: libro.estado || 'leido',
        idioma: libro.idioma || 'Español',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError || !libroTemp) {
      console.error('Error al crear libro (Detalles):', JSON.stringify(insertError, null, 2));
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

    // New Universal Generator
    const obtenerSiguienteCodigo = async (ubicacionNombre: string): Promise<string> => {
      // Use shared helper
      const sufijo = obtenerSufijoUbicacion(ubicacionNombre);
      console.log(`[CODE_GEN] Ubicacion Input: "${ubicacionNombre}" | Sufijo: "${sufijo}"`);

      try {
        // Query 1: Most recently created (likely to have high IDs)
        const recentPromise = supabase
            .from('libros')
            .select('legacy_id, ubicacion')
            .order('created_at', { ascending: false })
            .limit(100);

         // Query 2: Max Legacy ID for this SPECIFIC location
         // This ensures we find the true max even if it's old or outside the recent list
         // We filter by location at DB level for efficiency and correctness
         
         let locationQuery = supabase
            .from('libros')
            .select('legacy_id, ubicacion');

         // Robust handling for 'Almacén' variants (accented vs non-accented)
         // This fixes the issue where querying specifically for "Almacén" missed books saved as "Almacen"
         if (ubicacionNombre.toLowerCase() === 'almacén' || ubicacionNombre.toLowerCase() === 'almacen') {
             locationQuery = locationQuery.in('ubicacion', ['Almacén', 'Almacen', 'almacén', 'almacen']);
             
             // HOTFIX: Filter out rogue codes starting with '18' (e.g. 18000324) 
             // These are erroneous outliers that break the sequence (which should be around 0229...)
             locationQuery = locationQuery.not('legacy_id', 'like', '18%');
         } else {
             locationQuery = locationQuery.eq('ubicacion', ubicacionNombre);
         }

         const locationMaxPromise = locationQuery
            .order('legacy_id', { ascending: false })
            .limit(50);

        const [recentResult, locationMaxResult] = await Promise.all([
             recentPromise,
             locationMaxPromise
        ]);

        const recentBooks = recentResult.data || [];
        const locationBooks = locationMaxResult.data || [];
        
        // Combine (Location query is the source of truth for Max, Recent is for safety/gap filling)
        // We actually only care about filtering these to find the numeric max.
        const allBooks = [...recentBooks, ...locationBooks];

        // Extract numeric parts using Regex
        // Regex: Starts with optional zeros, captures digits, ends with Suffix
        // We need to be careful with escaping the suffix if it has special chars (unlikely here)
        const regex = new RegExp(`^0*(\\d+)${sufijo}$`);
        
        const codes = allBooks
            .map((b: any) => b.legacy_id)
            .filter((code: string) => {
                 // Double check safety filter for Almacén 18... codes
                 if ((ubicacionNombre.toLowerCase() === 'almacén' || ubicacionNombre.toLowerCase() === 'almacen') && code && code.startsWith('18')) {
                     return false;
                 }
                 return code && regex.test(code);
            }) // Match pattern
            .map((code: string) => {
                const match = code!.match(regex);
                return match ? parseInt(match[1]) : 0;
            })
            // Safety: Filter out outliers that might exist due to import errors or testing
            .filter((num: number) => {
                const loc = ubicacionNombre.toLowerCase().trim();
                // Check common variations (normalized names with accents)
                if (loc === 'hortaleza') {
                    // FIX: User reported outlier at 4077H and 66964H. Valid sequence is ~1370.
                    // Set strict limit to 2000 to ignore the 4000+ range.
                    return num < 2000;
                }
                if (loc === 'galeon' || loc === 'galeón') {
                     // Keep Galeon at 20000 for now (or 100k if needed, but safer low to avoid jumps)
                     return num < 20000;
                }
                // Almacén: exclude outliers above 3 million (correct range is 0229xxxx)
                if (loc === 'almacen' || loc === 'almacén' || loc === 'general') {
                    // Allow up to 8 digits (99,999,999) + safety margin. Exclude 21+ billion.
                    return num < 200000000;
                }
                return true;
            });
        
        // Deduplicate numbers
        const uniqueCodes = Array.from(new Set(codes));
        console.log(`[CODE_GEN] Found ${uniqueCodes.length} codes. Max 5:`, uniqueCodes.sort((a,b)=>b-a).slice(0, 5));

        let maxNum = 0;
        if (uniqueCodes.length > 0) {
            maxNum = Math.max(...uniqueCodes);
        } 

        // Fallback: If no books found for location, do we start at 0 or is it an error?
        // Start at 0 (next is 1) is correct for new location.

        const nextNum = maxNum + 1;
        
        // Default Padding: 8 digits (standardized)
        const padding = 8;
        
        let nextCode = nextNum.toString().padStart(padding, '0') + sufijo;
        console.log(`[CODE_GEN] MaxNum: ${maxNum} | NextNum: ${nextNum} | NextCode: ${nextCode}`);
        
        // Collision Check Loop (Safety Net)
        // We verify the generated code is truly free.
        let attempts = 0;
        // Increase jump size if we hit collisions to skip contiguous blocks quickly?
        // No, +1 is safer to pack tightly, but if we are in a "hole" inside occupied range, we might collide often.
        // But since we took MAX, we should be above the range.
        
        while (attempts < 20) {
            const { data } = await supabase
                .from('libros')
                .select('id')
                .eq('legacy_id', nextCode)
                .maybeSingle();
                
            if (!data) return nextCode;
            
            console.warn(`[CODE_GEN] Collision detected for ${nextCode}. Incrementing...`);
            
            // If collision, it means our Max calculation failed (maybe a book wasn't in the top 50 returned by DB?)
            // We increment and try again.
            const nextLoopNum = nextNum + attempts + 1;
            nextCode = nextLoopNum.toString().padStart(padding, '0') + sufijo;
            attempts++;
        }

        throw new Error(`Failed to generate unique code after ${attempts} attempts`);
      } catch (error) {
        console.error('Error generating code:', error);
        // Fallback: Random timestamp based to prevent hard crash
        return Math.floor(Date.now() / 1000).toString().padStart(8, '0') + sufijo;
      }
    };

    // Generar el código basado en UNIVERSAL LEGACY LOGIC
    const ubicacion = libro.ubicacion || 'Almacén'; // Default Capitalized to match Helper expectation if case-sensitive (though helper handles lower)
    console.log(`[crearLibro] Generando código para Ubicación: "${libro.ubicacion}" -> Resolved: "${ubicacion}"`);
    let codigoGenerado: string;

    if (libro.legacy_id) {
       codigoGenerado = actualizarCodigoPorUbicacion(libro.legacy_id, ubicacion);
    } else {
       try {
           const nextCode = await obtenerSiguienteCodigo(ubicacion);
           codigoGenerado = nextCode;
       } catch (e) {
           console.error('Error generating universal code, fallback to ID', e);
           codigoGenerado = generarCodigoLibro(libroTemp.id, ubicacion);
       }
    }

    // Actualizar el libro con el código generado
    // Actualizar el libro con el código generado
    
    // Wrap update in retry loop for legacy_id assignment
    let updateSuccess = false;
    let attempts = 0;
    let finalUpdateError = null;
    const MAX_RETRIES = 50; // Increase to 50 to punch through dense ghost record blocks

    while (!updateSuccess && attempts < MAX_RETRIES) {
        try {
            // Actualizar el libro con el código generado
            const { error: updateError } = await supabase
                .from('libros')
                .update({ legacy_id: codigoGenerado })
                .eq('id', libroTemp.id);

            if (updateError) {
                // If duplicate key, throw to catch block below to retry
                if (updateError.code === '23505') { 
                    throw new Error('DUPLICATE_CODE_RETRY');
                }
                throw updateError;
            }
            
            updateSuccess = true;

        } catch (err: any) {
            attempts++;
            if (err.message === 'DUPLICATE_CODE_RETRY' && attempts < MAX_RETRIES) {
                console.warn(`Collision for code ${codigoGenerado}, retrying (${attempts}/${MAX_RETRIES})...`);
                
                // Smart Retry: If we collided, the code exists but was hidden from our view.
                // We must manually increment based on the failed code to move forward.
                if (codigoGenerado) {
                    const numericPartMatch = codigoGenerado.match(/^0*(\d+)/); // Match leading zeros and then digits
                    const numericPart = numericPartMatch ? parseInt(numericPartMatch[1]) : NaN;
                    
                    if (!isNaN(numericPart) && numericPart > 0) {
                        const nextVal = numericPart + 1;
                        const originalSuffix = codigoGenerado.replace(/^[0-9]+/, ''); // Extract suffix (e.g., 'H')
                        
                        // Force logic to try next number directly
                        const padding = 8; // Assuming 8 digits padding as per obtenerSiguienteCodigo
                        codigoGenerado = nextVal.toString().padStart(padding, '0') + originalSuffix;
                        console.log(`[CODE_GEN] Smart Retry -> Trying forced next code: ${codigoGenerado}`);
                        
                        // Continue to next iteration to try update again with new codigoGenerado
                        continue; 
                    }
                }
                
                // Fallback if parsing failed or for other retryable errors
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
                continue;
            }
            // If other error or max attempts, cleanup and throw
            console.error('Error assigning code, deleting temp book:', err);
            // Critical Safety: Delete the temp book so we don't leave it without a legacy_id
            await supabase.from('libros').delete().eq('id', libroTemp.id);
            throw new Error(`Error al asignar código único: ${err.message}`);
        }
    }

    if (!updateSuccess) {
        console.error('Error al actualizar código del libro después de reintentos:', finalUpdateError);
        // If we reach here, it means all retries failed, and the book was deleted by the catch block.
        // So, we should return null as the book creation ultimately failed.
        return null;
    }

    // Fetch the updated book to return, as the previous update call didn't return data
    const { data, error: fetchUpdatedError } = await supabase
      .from('libros')
      .select()
      .eq('id', libroTemp.id)
      .single();

    if (fetchUpdatedError) {
      console.error('Error al obtener libro actualizado después de asignar código:', fetchUpdatedError);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inesperado al crear libro:', error);
    return null;
  }
};

export const actualizarLibro = async (id: number, libro: Partial<LibroSupabase>, contenidos?: string[]): Promise<Book | null> => {
  try {
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
    if (libro.descatalogado !== undefined) updateData.descatalogado = libro.descatalogado;
    if (libro.estado !== undefined) updateData.estado = libro.estado;
    if (libro.idioma !== undefined) updateData.idioma = libro.idioma;

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

    // Verificar permisos antes del UPDATE
    const { data: permisosCheck } = await supabase.rpc('can_manage_books');
    const { data: editorCheck } = await supabase.rpc('is_editor');

    if (!permisosCheck && !editorCheck) {
      throw new Error('No tienes permisos suficientes para editar libros.');
    }

    // Wrap update in retry loop
    let updateSuccess = false;
    let attempts = 0;
    let finalUpdateError = null;

    while (!updateSuccess && attempts < 3) {
        try {
            const { error: updateError } = await supabase
                .from('libros')
                .update(updateData)
                .eq('id', id);

            if (updateError) {
                // If duplicate key, throw to catch block below to retry
                // details might be null, so check message too
                if (updateError.code === '23505' && 
                   (updateError.details?.includes('legacy_id') || updateError.message?.includes('unique_legacy_id'))) { 
                    throw new Error('DUPLICATE_LEGACY_ID_RETRY');
                }
                throw updateError;
            }
            
            updateSuccess = true;

        } catch (err: any) {
            attempts++;
            if (err.message === 'DUPLICATE_LEGACY_ID_RETRY' && attempts < 3) {
                console.warn(`Collision for legacy_id during update, retrying (${attempts}/3) with new ID...`);
                // Wait small random delay
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
                
                // Regenerate legacy_id if explicitly failed on it
                if (updateData.legacy_id && updateData.ubicacion) {
                    // Extract base number
                    const currentCode = updateData.legacy_id;
                    const baseMatch = currentCode.match(/\d+/);
                    if (baseMatch) {
                         const baseNum = baseMatch[0];
                         // Appending a random 4-digit suffix to the number to ensure uniqueness
                         // We keep the first part of the number to allow some traceability or just generate completely new?
                         // Ideally we want a new unique ID. Adding 4 random digits works.
                         const newBase = baseNum + Math.floor(1000 + Math.random() * 9000).toString();
                         updateData.legacy_id = actualizarCodigoPorUbicacion(newBase, updateData.ubicacion);
                         console.log(`Regenerated legacy_id from ${currentCode} to ${updateData.legacy_id}`);
                    }
                }
                continue;
            }
            finalUpdateError = err;
            break; // Break if it's not a retryable error or max attempts reached
        }
    }

    if (!updateSuccess) {
        console.error('Error al actualizar libro después de reintentos:', finalUpdateError);
        throw new Error(`Error de base de datos: ${finalUpdateError?.message || 'Unknown error'}`);
    }

    // Actualizar contenidos si se proporcionan
    if (contenidos) {
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

    if (selectError) {
      console.error('Error al obtener libro actualizado:', selectError);
      throw new Error(`Error al obtener libro actualizado: ${selectError.message}`);
    }

    if (!libroActualizado) {
      throw new Error('No se pudo obtener el libro actualizado');
    }

    const libroMapeado = mapLibroToBook(libroActualizado);
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

export const buscarLibros = async (
  query: string, 
  options?: { 
    searchFields?: 'code' | 'all';
    includeOutOfStock?: boolean;  // New: Allow searching books without stock (for admin)
  }
): Promise<Book[]> => {
  try {
    const isNumeric = /^\d+$/.test(query);
 

    // 1. Unified Search Vector (Super Index)
    // Uses the 'search_vector' column for consistent, relevance-ranked, instant results.
    // 'websearch' type handles complex queries (quotes, negations) and stopwords automatically.
    
    // Check for Numeric (Potential Barcode)
    if (isNumeric) {
        // Priority A: Strict Legacy ID (Barcode) Match
        let exactLegacyQuery = supabase
              .from('libros')
              .select('*, editoriales(id, nombre), categorias(id, nombre)')
              .eq('activo', true)
              .eq('legacy_id', query);
        
        // Filter by stock unless explicitly including out-of-stock
        if (!options?.includeOutOfStock) {
          exactLegacyQuery = exactLegacyQuery.gt('stock', 0);
        }
        
        const { data: exactLegacy, error: exactError } = await exactLegacyQuery.limit(5);

         if (!exactError && exactLegacy && exactLegacy.length > 0) {
              return exactLegacy.map(mapLibroToBook);
         }
         
         // Priority B: Strict ID (Internal) Match - Optional, but kept for admin flexibility
         if (options?.searchFields === 'all') { // Only if not strictly code
             let exactIdQuery = supabase
                .from('libros')
                .select('*, editoriales(id, nombre), categorias(id, nombre)')
                .eq('activo', true)
                .eq('id', parseInt(query));
             
             // Filter by stock unless explicitly including out-of-stock
             if (!options?.includeOutOfStock) {
               exactIdQuery = exactIdQuery.gt('stock', 0);
             }
             
             const { data: exactId, error: idError } = await exactIdQuery.limit(1);
             
             if (!idError && exactId && exactId.length > 0) {
                 return exactId.map(mapLibroToBook);
             }
         }
    }

    // 2. Text Search (Unified Vector)
    let queryBuilder = supabase
        .from('libros')
        .select('*, editoriales(id, nombre), categorias(id, nombre)')
        .eq('activo', true);
    
    // FIXED: Filter by stock unless explicitly including out-of-stock books
    // Default behavior: only show books with stock > 0 (for customer-facing searches)
    if (!options?.includeOutOfStock) {
      queryBuilder = queryBuilder.gt('stock', 0);
    }

    // Filter stopwords for cleaner query (optional with websearch but good for clarity)
    const SPANISH_STOPWORDS = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si', 'de', 'del', 'al', 'en', 'con', 'por', 'sobre', 'entre', 'para', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'que', 'se', 'no'];
    let terms = query.replace(/[(),.\\-\\/]/g, ' ').split(/\s+/).filter(t => t.length > 0);
    
    if (terms.length > 0) { // Only filter if we have terms
        const filteredTerms = terms.filter(t => !SPANISH_STOPWORDS.includes(t.toLowerCase()));
        if (filteredTerms.length > 0) {
            terms = filteredTerms;
        }
    }
    
    // Use Websearch against the Super Index
    const finalQuery = terms.length > 0 ? terms.join(' ') : query;
    queryBuilder = queryBuilder.textSearch('search_vector', finalQuery, {
         config: 'spanish',
         type: 'websearch' 
    });

    const { data, error } = await queryBuilder
        .limit(20);

    if (error) {
        console.error('Error al buscar libros (Multi-term):', error);
        return [];
    }

    return (data || []).map(mapLibroToBook);

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
      .select('*', { count: 'estimated', head: true })
      .eq('activo', true)
      .gt('stock', 0);

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

export const obtenerEstadisticasLibros = async () => {
    try {
        // Ejecutar en paralelo para velocidad
        const [totalRes, sinStockRes] = await Promise.all([
            supabase
                .from('libros')
                .select('*', { count: 'estimated', head: true }),
            supabase
                .from('libros')
                .select('*', { count: 'exact', head: true }) // Keep exact for filtered if possible, or filtered estimated
                .eq('stock', 0)
        ]);

        if (totalRes.error) console.error('Error fetching total books:', totalRes.error);
        if (sinStockRes.error) console.error('Error fetching out of stock books:', sinStockRes.error);

        const total = totalRes.count || 0;
        const sinStock = sinStockRes.count || 0;
        
        // Sanity check: Total cannot be less than sinStock. 
        // If total fetch failed (0) but sinStock succeeded, use sinStock as minimum total?
        const safeTotal = total < sinStock ? sinStock : total;

        return {
            total: safeTotal,
            sinStock: sinStock,
            enStock: safeTotal - sinStock
        };
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return { total: 0, sinStock: 0, enStock: 0 };
    }
};



export const obtenerTotalUnidadesStock = async (): Promise<number> => {
    try {
        // Try to use the server-side RPC mechanism first (more efficient, no limits)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_total_stock_units');
        
        if (!rpcError && typeof rpcData === 'number') {
            return rpcData;
        }

        // Fallback: Client-side calculation (limited by max rows, usually 1000)
        // Only fetch items with stock > 0 and try to get as many as possible
        const { data, error } = await supabase
            .from('libros')
            .select('stock')
            .eq('activo', true)
            .gt('stock', 0)
            .limit(1000000); // Attempt to fetch up to 1M items
        
        if (error) {
            console.error('Error fetching total stock units:', error);
            return 0;
        }

        if (!data) return 0;
        return data.reduce((acc, curr) => acc + (curr.stock || 0), 0);
    } catch (error) {
         console.error('Error in obtenerTotalUnidadesStock:', error);
         return 0;
    }
};

export const buscarLibroParaMerge = async (
  isbn: string, 
  ubicacion: string, 
  precio: number, 
  estado: string, 
  idioma: string
): Promise<Book | null> => {
  // Normalize ISBNS: remove hyphens/spaces
  let cleanIsbn = isbn ? isbn.replace(/[-\s]/g, '') : '';
  if (!cleanIsbn) cleanIsbn = 'N/A';

  // If no ISBN (N/A), stricter check required? 
  // For safety, we only auto-merge if ISBN is present. 
  // Merging purely by attributes without ISBN is risky (e.g. two "Untitled" books).
  if (cleanIsbn === 'N/A') return null;

  const { data, error } = await supabase
    .from('libros')
    .select('*, editoriales(id, nombre), categorias(id, nombre)')
    .eq('activo', true)
    .eq('isbn', cleanIsbn)
    .eq('ubicacion', ubicacion)
    // Handle potential nulls in DB by using 'is' or defaulting in query?
    // Supabase needs explicit match.
    // If our DB has 'legacy' nulls, this strict check might miss them.
    // But for "Merging", strict equality is desired.
    .eq('estado', estado || 'leido') 
    .eq('idioma', idioma || 'Español')
    .eq('precio', precio)
    .maybeSingle();

  if (error || !data) return null;
  return mapLibroToBook(data);
};

export const buscarLibroPorISBN = async (isbn: string): Promise<Book | null> => {
  const { data, error } = await supabase
    .from('libros')
    .select('*, editoriales(id, nombre), categorias(id, nombre)')
    .eq('isbn', isbn)
    .eq('activo', true)
    .maybeSingle();

  if (error || !data) return null;
  return mapLibroToBook(data);
};

export const incrementarStockLibro = async (id: number, cantidad: number): Promise<boolean> => {
  try {
    // Fallback manual update since RPC might be missing
    const { data: book, error: fetchError } = await supabase
      .from('libros')
      .select('stock')
      .eq('id', id)
      .single();

    if (fetchError || !book) {
      console.error('Error fetching book for stock update:', fetchError);
      return false;
    }

    const currentStock = book.stock || 0;
    const newStock = Math.max(0, currentStock + cantidad); // Prevent negative stock

    const { error: updateError } = await supabase
      .from('libros')
      .update({ stock: newStock })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating stock manually:', updateError);
      return false;
    }

    // Success - optionally return the new stock? Function signature says return boolean.
    // The previous implementation returned boolean, so we maintain that.
    
    return true;
  } catch (error) {
    console.error('Exception updating stock:', error);
    return false;
  }
};


// Funciones nuevas para reportes de calidad de datos
export const obtenerLibrosSinISBN = async (): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .eq('activo', true)
      .or('isbn.is.null,isbn.eq.');
    
    if (error) {
        console.error('Error fetching books without ISBN:', error);
        return [];
    }
    return data.map(mapLibroToBook);
};

export const obtenerLibrosSinPortada = async (): Promise<Book[]> => {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editoriales(id, nombre), categorias(id, nombre)')
      .eq('activo', true)
      .or('imagen_url.is.null,imagen_url.eq.');

    if (error) {
        console.error('Error fetching books without cover:', error);
        return [];
    }
    return data.map(mapLibroToBook);
};

export const actualizarISBN = async (id: number, isbn: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase
      .from('libros')
      .update({ isbn: isbn })
      .eq('id', id);

    if (error) {
        console.error('Error updating ISBN:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
};

export const obtenerSugerencias = async (termino: string): Promise<string[]> => {
  if (!termino || termino.trim().length < 2) return [];

  const query = termino.trim();
  
  try {
    const [librosTitulo, librosAutor, editoriales] = await Promise.all([
      // 1. Titles
      supabase
        .from('libros')
        .select('titulo')
        .ilike('titulo', `%${query}%`)
        .limit(3),
      
      // 2. Authors (distinct is harder in simple query, we dedup later)
      supabase
        .from('libros')
        .select('autor')
        .ilike('autor', `%${query}%`)
        .limit(5),

      // 3. Publishers
      supabase
        .from('editoriales')
        .select('nombre')
        .ilike('nombre', `%${query}%`)
        .limit(3)
    ]);

    const suggestions = new Set<string>();

    librosTitulo.data?.forEach((l: any) => suggestions.add(l.titulo));
    librosAutor.data?.forEach((l: any) => suggestions.add(l.autor));
    editoriales.data?.forEach((e: any) => suggestions.add(e.nombre));

    // Convert to array and take top 8
    return Array.from(suggestions).slice(0, 8); 

  } catch (error) {
    console.warn('Error fetching suggestions:', error);
    return [];
  }
};




export const decrementStock = async (bookId: number, quantity: number = 1): Promise<void> => {
  // Get current stock
  const { data: book, error: fetchError } = await supabase
    .from('libros')
    .select('stock')
    .eq('id', bookId)
    .single();

  if (fetchError) {
    console.error('Error fetching book stock:', fetchError);
    throw fetchError;
  }
  
  if (!book || book.stock < quantity) {
    throw new Error(`Stock insuficiente. Stock actual: ${book?.stock || 0}, cantidad solicitada: ${quantity}`);
  }

  // Decrement stock
  const { error: updateError } = await supabase
    .from('libros')
    .update({ stock: book.stock - quantity })
    .eq('id', bookId);

  if (updateError) {
    console.error('Error updating book stock:', updateError);
    throw updateError;
  }
};


export const obtenerSugerenciaOrtografica = async (termino: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('sugerir_correccion', { busqueda: termino });
    
    if (error) {
      console.warn('Error fetching spelling suggestion:', error);
      return null;
    }
    
    // If suggestion is identical to original (ignoring case), don't show it
    if (data && data.toLowerCase() !== termino.toLowerCase()) {
        return data;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching spelling suggestion:', error);
    return null;
  }
};
