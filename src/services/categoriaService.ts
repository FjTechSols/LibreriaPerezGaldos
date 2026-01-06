import { supabase } from '../lib/supabase';
import { Categoria } from '../types';

export const getCategorias = async (): Promise<Categoria[]> => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activa', true)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const createCategoria = async (categoria: Partial<Categoria>): Promise<Categoria | null> => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .insert(categoria)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    return null;
  }
};

export const updateCategoria = async (id: number, categoria: Partial<Categoria>): Promise<Categoria | null> => {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .update(categoria)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    return null;
  }
};

export const deleteCategoria = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    // If error is foreign key constraint, it means it's used by books
    console.error('Error deleting category:', error);
    return false;
  }
};

// Normalization Utilities

export const normalizeCategoryName = (name: string): string => {
  return name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();
};

export const findDuplicates = (categories: Categoria[]) => {
  const groups: { [key: string]: Categoria[] } = {};
  
  categories.forEach(cat => {
    const normalized = normalizeCategoryName(cat.nombre);
    if (!groups[normalized]) {
      groups[normalized] = [];
    }
    groups[normalized].push(cat);
  });

  // Return only groups with > 1 item
  return Object.entries(groups).filter(([_, list]) => list.length > 1);
};

export const mergeCategories = async (
  toKeepId: number, 
  toMergeIds: number[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; message: string }> => {
  try {
    // Process sequentially to avoid timeouts (Error 500)
    let processed = 0;
    let errors: string[] = [];
    const total = toMergeIds.length;

    for (const oldId of toMergeIds) {
        try {
            // 1. Move books using the secure RPC function (bypasses RLS)
            // We can now process much larger batches because the server handles the permission check once.
            // Reduced to 10 to be ultra-conservative against timeouts
            const BATCH_SIZE = 10;
            
            while (true) {
                // Fetch ID batch - fast index scan
                const { data: books, error: fetchError } = await supabase
                    .from('libros')
                    .select('id')
                    .eq('categoria_id', oldId)
                    .limit(BATCH_SIZE);
                    
                if (fetchError) throw fetchError;
                
                if (!books || books.length === 0) {
                    break; 
                }
                
                const bookIds = books.map(b => b.id);
                
                // Call RPC to update this batch instantly without per-row RLS overhead
                const { error: rpcError } = await supabase.rpc('admin_merge_categories', {
                    p_book_ids: bookIds,
                    p_new_category_id: toKeepId
                });
                    
                if (rpcError) throw rpcError;
                
                // Valid delay to let the DB breathe
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // 2. Delete the old category
            const { error: deleteError } = await supabase
                .from('categorias')
                .delete()
                .eq('id', oldId);

            if (deleteError) {
               throw deleteError;
            }
            
            processed++;
            if (onProgress) onProgress(processed, total);
            
        } catch (err: any) {
            console.error(`Error processing category ${oldId}:`, err);
            errors.push(`Cat ${oldId}: ${err.message}`);
        }
    }

    if (errors.length > 0) {
        return { 
            success: processed > 0, // Partial success if at least one worked
            message: `Procesadas ${processed}/${toMergeIds.length}. Errores: ${errors.slice(0, 3).join(', ')}...` 
        };
    }

    return { success: true, message: `Fusión completada: ${processed} categorías procesadas.` };

  } catch (error: any) {
    console.error('Error in mergeCategories:', error);
    return { success: false, message: error.message || 'Error desconocido al fusionar' };
  }
};
