import { supabase } from '../lib/supabase';
import { Book } from '../types';
import { generarCodigoLibro, actualizarCodigoPorUbicacion } from '../utils/codigoHelper';
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

    // 2. Create if not exists
    const { data: newData, error: createError } = await supabase
      .from('editoriales')
      .insert({ nombre: nombreNormalizado })
      .select('id')
      .single();

    if (createError) throw createError;
    return newData ? newData.id : null;
  } catch (error) {
    console.error('Error handling editorial:', error);
    return null;
  }
};

// Strict lookup only, as categories are fixed in the UI
export const obtenerCategoriaId = async (nombre: string): Promise<number | null> => {
  if (!nombre) return null;
  const nombreNormalizado = nombre.trim();
  
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('id')
      .ilike('nombre', nombreNormalizado) // Use ilike for robustness even if select matches
      .maybeSingle();

    if (error) throw error;
    return data ? data.id : null;
  } catch (error) {
    console.error('Error fetching category ID:', error);
    return null;
  }
};


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
    criteria: { code?: string; isbn?: string; title?: string; author?: string }
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

    // Default limit
    query = query.limit(20);

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
        !filters.location && 
        !filters.isbn &&
        !filters.forceCount
    );
    
    // If default view, we DO NOT request a count from DB to save massive resources.
    // The UI handles this by using the separately loaded total count.
    const countStrategy = isDefaultView ? undefined : 'exact';

    let query = supabase
      .from('libros')
      // Removed Joins to prevent massive timeout on deep pagination (page 15k+)
      // We only fetch the core table now. The UI will have to rely on IDs or we fetch details separately if needed.
      .select('id, legacy_id, titulo, autor, editorial_id, precio, stock, activo, destacado, novedad, oferta, precio_original, imagen_url, paginas, anio, ubicacion, categoria_id', { count: countStrategy as any })
      .eq('activo', true);

    // Apply Filters
    if (filters) {
     if (filters.search) {
       const searchTerm = filters.search.trim();
       const isNumeric = /^\d+$/.test(searchTerm);
       
       const numericId = parseInt(searchTerm, 10);
       const validId = !isNaN(numericId) && numericId < 2147483647;

       // Check search mode: 'default' means ONLY legacy_id (and id) search? 
       if (filters.searchMode === 'default') {
          // Strict Legacy Code Search
          if (isNumeric) {
              // STRATEGY: Try EXACT match first to avoid expensive LIKE scan
              // If the user pasted a full code, this will hit immediately.
              const { data: exactLegacy, error: exactError } = await supabase
                 .from('libros')
                 .select('id, legacy_id, titulo, autor, editorial_id, precio, stock, activo, destacado, novedad, oferta, precio_original, imagen_url, paginas, anio, ubicacion, categoria_id', { count: 'estimated' })
                 .eq('activo', true)
                 .or(`legacy_id.eq.${searchTerm},id.eq.${numericId}`) // Check both Exact Legacy AND Exact ID
                 .limit(5);

              if (!exactError && exactLegacy && exactLegacy.length > 0) {
                  return { data: exactLegacy.map(mapLibroToBook), count: exactLegacy.length };
              }

              // If no exact match, fall back to prefix search optimized with Range Query
              // LIKE is slow without text_pattern_ops index. GTE/LT is fast on standard B-tree.
              const nextTerm = getNextSearchTerm(searchTerm);
              query = query.gte('legacy_id', searchTerm).lt('legacy_id', nextTerm);
          } else {
              query = query.ilike('legacy_id', `${searchTerm}%`);
          }
       } else {
          // Full Search Mode (Title, Author, ISBN, etc.)
          if (isNumeric) {
              // Try exact match first here too? Maybe overly complex for 'full' mode, but safer.
              if (validId) {
                 const nextTerm = getNextSearchTerm(searchTerm);
                 // Optimized range query for legacy_id mixed with other fields using PostgREST logic syntax
                 // or=(id.eq.X,and(legacy_id.gte.X,legacy_id.lt.Y),isbn.like.X%)
                 query = query.or(`id.eq.${numericId},and(legacy_id.gte.${searchTerm},legacy_id.lt.${nextTerm}),isbn.like.${searchTerm}%`);
              } else {
                 const nextTerm = getNextSearchTerm(searchTerm);
                 query = query.or(`and(legacy_id.gte.${searchTerm},legacy_id.lt.${nextTerm}),isbn.like.${searchTerm}%`);
              }
          } else {
              // Tokenized Search Strategy:
              // Split query (e.g. "Planeta Galdos") into ["Planeta", "Galdos"]
              // AND logic: Match(Planeta) AND Match(Galdos)
              // Match(Term) = Title OR Author OR ISBN OR LegacyID matches Term
              
              // Key Fix: Sanitize terms to remove PostgREST reserved chars like (, ), , that break the parser
              const cleanSearchTerm = searchTerm.replace(/[(),.]/g, ' '); 
              const terms = cleanSearchTerm.split(/\s+/).filter(t => t.length > 0);

              if (terms.length === 0) {
                 // Empty? Should not happen due to trim() check above
              } else {
                 for (const term of terms) {
                     // Check if term matches an Editorial first (Optional optimization or just include in OR?)
                     // OR logic via string: `titulo.ilike.%term%,autor.ilike.%term%,...`
                     // Note: To match Publisher Name, we still need IDs.
                     
                     // Optimization: Searching Editorials for 5 terms is expensive.
                     // Compromise: We check Publisher ONLY for the FULL string or single significant terms if cheap.
                     // OR we just rely on Title/Author/ISBN for split terms.
                     // User asked for "Editorial and Author".("Planeta Cervantes")
                     // We need to match Planeta in Publisher.
                     
                     // Let's do a lightweight Publisher ID lookup for THIS term
                     // We can't await inside this loop easily if we want to build a synchronous query chain?
                     // Supabase query builder IS synchronous in construction. Await is for execution.
                     // BUT we need `await` to fetch editorial IDs.
                     // We must fetch editorial IDs for ALL terms beforehand?
                     
                     // Correction: We can await inside the loop because the surrounding function `obtenerLibros` is async.
                     
                     let subQuery = `titulo.ilike.%${term}%,autor.ilike.%${term}%,legacy_id.ilike.%${term}%`;
                     
                     // ISBN check (usually one chunk, but fine to check)
                     if (term.length > 3) subQuery += `,isbn.ilike.%${term}%`;

                     // Publisher Check
                     const { data: edData } = await supabase
                        .from('editoriales')
                        .select('id')
                        .ilike('nombre', `%${term}%`)
                        .limit(5);

                     if (edData && edData.length > 0) {
                         const ids = edData.map(e => e.id);
                         subQuery += `,editorial_id.in.(${ids.join(',')})`;
                     }

                     query = query.or(subQuery);
                 }
              }
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
      if (filters.maxPrice !== undefined && filters.maxPrice < 1000) {
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
          case 'default':
            // Fast Default: Sort by ID (PK index). Respect user direction.
            // Defaulting to DESC (newest) if user hasn't touched it (though UI defaults to ASC... user might want ASC IDs?)
            // Usually 'Default' implies 'Newest First' (LIFO). 
            // But if UI says 'Ascendente' and user selects 'Default', they might get Oldest First (ID 1).
            // Let's fallback to respecting sortOrder.
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

         return {
           data: books,
           count: count || 0
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

    // Generar el código basado en el ID y la ubicación
    // Helper to get suffix based on location
    const obtenerSufijo = (ubicacion: string): string => {
      // Normalización agresiva para coincidir con cualquier input
      const normalizada = ubicacion.toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // "almacén" -> "almacen"
      
      switch (normalizada) {
        case 'almacen': return '';
        case 'galeon': return 'G';
        case 'hortaleza': return 'H';
        case 'reina': return 'R';
        case 'abebooks': return 'Ab';
        case 'general': return 'Gen'; // Assumption: General -> Gen to differentiate
        case 'uniliber': return 'UL'; // UniLiber suffix
        case 'almacen general': return ''; // Assumption: Same as Almacen? Or 'AG'? 
                                           // User said "Almacen General" in dropdown. 
                                           // Usually "Almacen" is the main series.
                                           // Let's assume Almacen General == Almacen (No suffix)
        default: return ''; 
      }
    };

    // New Universal Generator
    const obtenerSiguienteCodigo = async (ubicacion: string): Promise<string> => {
      const sufijo = obtenerSufijo(ubicacion);
      
      let query = supabase.from('libros').select('legacy_id');

      if (sufijo) {
        query = query.like('legacy_id', `%${sufijo}`);
      } else {
         query = query.like('legacy_id', '02%').lt('legacy_id', '02300000');
      }

      // Order and limit MUST be applied after filters to be effective on the whole dataset
      query = query.order('legacy_id', { ascending: false }).limit(5);

      const { data, error } = await query;
      
      if (error || !data || data.length === 0) {
          console.warn(`No legacy codes found for ${ubicacion} (Suffix: ${sufijo}). using fallback 1.`);
          return sufijo ? `1${sufijo}` : '02290000';
      }

      const lastCode = data[0].legacy_id;
      const numbStr = lastCode.replace(/\D/g, ''); 
      const num = parseInt(numbStr, 10);
      
      if (isNaN(num)) return sufijo ? `1${sufijo}` : '000001';

      const nextNum = num + 1;
      return `${nextNum.toString().padStart(numbStr.length, '0')}${sufijo}`;
    };

    // Generar el código basado en UNIVERSAL LEGACY LOGIC
    const ubicacion = libro.ubicacion || 'almacen';
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

export const buscarLibros = async (query: string, options?: { searchFields?: 'code' | 'all' }): Promise<Book[]> => {
  try {
    const isNumeric = /^\d+$/.test(query);
    const searchMode = options?.searchFields || 'all'; // Default to all if not specified, but UI sends 'code' for default mode

    if (isNumeric) {
      // 1. Exact Priority Search (ID or Legacy ID)
      // Execute this FIRST to avoid timeout on heavy fuzzy search if exact match exists
      const { data: exactData, error: exactError } = await supabase
          .from('libros')
          .select('*, editoriales(id, nombre), categorias(id, nombre)')
          .eq('activo', true)
          .or(`id.eq.${query},legacy_id.eq.${query}`)
          .limit(1); // Optimisation: We only need one if it's exact

      if (exactError) console.error('Error finding exact book:', exactError);
      
      // If exact match found, return immediately without running expensive fuzzy search
      if (exactData && exactData.length > 0) {
          return exactData.map(mapLibroToBook);
      }
      
      // If mode is 'code' (default/simple), we ONLY search legacy_id (and ISBN slightly) for numbers
      // We do NOT search Title/Author
      if (searchMode === 'code') {
          const nextTerm = getNextSearchTerm(query);
          const { data: codeData, error: codeError } = await supabase
            .from('libros')
            .select('*, editoriales(id, nombre), categorias(id, nombre)')
            .eq('activo', true)
            // Replace LIKE with Range Query: (legacy_id >= query AND legacy_id < next) OR isbn LIKE query%
            // Note: ISBN like remains as legacy fallback, or we could optimize it too if ISBNs are indexed cleanly.
            .or(`and(legacy_id.gte.${query},legacy_id.lt.${nextTerm}),isbn.like.${query}%`)
            .order('legacy_id', { ascending: true })
            .limit(10);
            
          if (codeError) console.error('Error finding code books:', codeError);
          return (codeData || []).map(mapLibroToBook);
      }

      // 2. Standard Fuzzy Search (Only if exact match failed AND mode is 'all')
      // Even here, we can optimize the legacy_id part
      const nextTerm = getNextSearchTerm(query);
      const { data: fuzzyData, error: fuzzyError } = await supabase
          .from('libros')
          .select('*, editoriales(id, nombre), categorias(id, nombre)')
          .eq('activo', true)
          // or=(titulo.ilike.%,autor.ilike.%,isbn.ilike.%,and(legacy_id.gte.X,legacy_id.lt.Y))
          .or(`titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%,and(legacy_id.gte.${query},legacy_id.lt.${nextTerm})`)
          .order('titulo', { ascending: true })
          .limit(20);

      if (fuzzyError) console.error('Error finding fuzzy books:', fuzzyError);

      return (fuzzyData || []).map(mapLibroToBook);

    } else {
      // Non-numeric search
      if (searchMode === 'code') {
          // If mode is 'code' but query is not purely numeric, we still search legacy_id (alphanumeric legacy codes?)
          // Or we assume user wants to find a code.
          const { data: codeData, error: codeError } = await supabase
            .from('libros')
            .select('*, editoriales(id, nombre), categorias(id, nombre)')
            .eq('activo', true)
            .ilike('legacy_id', `${query}%`) // Using ILIKE for flexibility on non-numeric codes
            .limit(10);
            
          if (codeError) console.error('Error finding code books (text):', codeError);
          return (codeData || []).map(mapLibroToBook);
      }

      // Standard fuzzy search for 'all' mode
      
      // 1. First, find matching publishers (Editoriales)
      let editorialIds: number[] = [];
      try {
        const { data: editorialData } = await supabase
          .from('editoriales')
          .select('id')
          .ilike('nombre', `%${query}%`)
          .limit(5); // Limit to top 5 matching publishers to avoid massive OR strings
          
        if (editorialData && editorialData.length > 0) {
            editorialIds = editorialData.map(e => e.id);
        }
      } catch (err) {
        console.warn('Error fetching matching editorials:', err);
      }

      // 2. Build Query
      let orQuery = `titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%,legacy_id.ilike.%${query}%`;
      
      // If we found matching publishers, include their books in the results
      if (editorialIds.length > 0) {
          orQuery += `,editorial_id.in.(${editorialIds.join(',')})`;
      }

      const { data, error } = await supabase
        .from('libros')
        .select('*')
        .eq('activo', true)
        .or(orQuery)
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

async function enrichBooks(data: LibroSupabase[]) {
  if (!data || data.length === 0) return [];

  // Recolectar IDs
  const editorialIds = Array.from(new Set(data.map(b => b.editorial_id).filter(Boolean))) as number[];
  const categoryIds = Array.from(new Set(data.map(b => b.categoria_id).filter(Boolean))) as number[];

  // Fetch paralelo
  const [editorialesRes, categoriasRes] = await Promise.all([
    editorialIds.length > 0 ? supabase.from('editoriales').select('id, nombre').in('id', editorialIds) : { data: [] },
    categoryIds.length > 0 ? supabase.from('categorias').select('id, nombre').in('id', categoryIds) : { data: [] }
  ]);

  // Crear mapas
  const editorialesMap = new Map(editorialesRes.data?.map((e: any) => [e.id, e]) || []);
  const categoriasMap = new Map(categoriasRes.data?.map((c: any) => [c.id, c]) || []);

  // Enriquecer
  return data.map(libro => {
    if (libro.editorial_id) libro.editoriales = editorialesMap.get(libro.editorial_id);
    if (libro.categoria_id) libro.categorias = categoriasMap.get(libro.categoria_id);
    return mapLibroToBook(libro);
  });
}

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
    // The calling code might interpret result as Boolean or Object?
    // In `handleCreateSubmit`: `const actualizado = await ...`
    // `if (actualizado) { alert(... actualizado.stock) }`
    // Wait, the original usage in `handleCreateSubmit` expects an OBJECT with `.stock`?
    // Let's check `BooksManager.tsx` lines 173-175:
    // `const actualizado = await incrementarStockLibro(...)`
    // `if (actualizado) { alert(... actualizado.stock ...)`
    // BUT the implementation I replaced (line 966) returned `Promise<boolean>`: `return !error;`
    // THIS IS A CONTRADICTION.
    // If usage expects object, the previous code was ALREADY wrong or signature was wrong?
    // The previous code: `return !error;` (boolean).
    // `handleCreateSubmit` code: `if (actualizado) { ... actualizado.stock }`.
    // If boolean true is returned, `actualizado.stock` is undefined.
    // So `alert` would say "undefined".
    // But `handleStockUpdate` (the one failing now) checks `if (updated)`. Boolean is fine there.
    
    // I should probably fix the return type to return `{ stock: number } | null` or compatible?
    // Or just fix `BooksManager.tsx` usage?
    // The user issue is "gives error".
    // If I change return to Boolean, I must ensure usages handle it.
    // `handleStockUpdate` usage: `const updated = await ...; if (updated) ...`. Boolean is fine.
    // `handleCreateSubmit` usage: accesses `.stock`. This is broken for boolean.
    
    // I will return the updated book object (or partial) if possible, or just the new stock?
    // To match `handleCreateSubmit` expectation, I should return an object?
    // But `incrementarStockLibro` signature says `Promise<boolean>`.
    // I should change the signature to `Promise<{ stock: number } | null>` or `Promise<boolean | ...>`.
    
    // For now, I'll stick to Boolean to match the signature in the file I saw (line 966).
    // AND I will fix `handleCreateSubmit` in `BooksManager.tsx` to not access `.stock` on a boolean.
    // The user's specific issue is the Buttons (+/-), handled by `handleStockUpdate`.
    // That function uses it as boolean.
    
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

export const actualizarISBN = async (id: number, isbn: string): Promise<boolean> => {
    const { error } = await supabase
      .from('libros')
      .update({ isbn: isbn })
      .eq('id', id);

    return !error;
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

