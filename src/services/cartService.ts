import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

const CART_STORAGE_KEY = 'library-cart';

export interface CartItemDB {
  id?: string;
  user_id: string;
  libro_id: number;
  cantidad: number;
  created_at?: string;
  updated_at?: string;
}

export const saveCartToSupabase = async (userId: string, items: CartItem[]): Promise<boolean> => {
  try {
    // Si no hay items, simplemente limpiamos el carrito
    if (items.length === 0) {
      const { error: deleteError } = await supabase
        .from('carritos')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error clearing cart:', deleteError);
        return false;
      }
      return true;
    }

    const validItemsMap = new Map<number, { user_id: string; libro_id: number; cantidad: number }>();

    // Procesar items y deduplicar
    for (const item of items) {
      const libroId = parseInt(item.book.id);
      const MAX_INT4 = 2147483647;

      if (isNaN(libroId) || libroId > MAX_INT4 || libroId <= 0) {
        console.warn(`Skipping invalid book ID for cart: ${item.book.id} (Out of range, negative or NaN)`);
        continue;
      }

      if (!item.quantity || item.quantity <= 0 || item.quantity > 10000) {
        console.warn(`Skipping invalid quantity for cart item: ${item.book.id}, qty: ${item.quantity}`);
        continue;
      }

      // Si ya validamos este libro en esta iteración, solo sumamos cantidad
      if (validItemsMap.has(libroId)) {
        const existing = validItemsMap.get(libroId)!;
        existing.cantidad += item.quantity;
        continue;
      }

      const { data: libro, error } = await supabase
        .from('libros')
        .select('id')
        .eq('id', libroId)
        .maybeSingle();

      if (error || !libro) {
        continue;
      }

      validItemsMap.set(libroId, {
        user_id: userId,
        libro_id: libroId,
        cantidad: item.quantity
      });
    }

    const validItems = Array.from(validItemsMap.values());
    
    // Si no quedaron items válidos después de filtrar, limpiamos todo y terminamos
    if (validItems.length === 0) {
      const { error: deleteError } = await supabase
      .from('carritos')
      .delete()
      .eq('user_id', userId);

      if (deleteError) {
        console.error('Error clearing invalid cart:', deleteError);
        return false;
      }
      return true;
    }

    // 1. Usar UPSERT en lugar de INSERT para manejar duplicados/actualizaciones atómicas
    // Esto resuelve el error 409 Conflict
    const { error: upsertError } = await supabase
      .from('carritos')
      .upsert(validItems, { onConflict: 'user_id, libro_id' });

    if (upsertError) {
      console.error('Error upserting cart:', upsertError);
      return false;
    }

    // 2. Eliminar items que ya no están en el carrito
    // Usamos el filtro 'not.in' para borrar todo lo que no sea parte de los items válidos actuales
    const validIds = validItems.map(i => i.libro_id);
    if (validIds.length > 0) {
        const { error: cleanupError } = await supabase
            .from('carritos')
            .delete()
            .eq('user_id', userId)
            .not('libro_id', 'in', `(${validIds.join(',')})`);
            
        if (cleanupError) {
             console.error('Error cleaning up removed items:', cleanupError);
             // No retornamos false aquí porque el upsert principal fue exitoso, 
             // esto es solo limpieza.
        }
    }

    return true;
  } catch (error) {
    console.error('Error in saveCartToSupabase:', error);
    return false;
  }
};

export const loadCartFromSupabase = async (userId: string): Promise<CartItem[]> => {
  try {
    const { data, error } = await supabase
      .from('carritos')
      .select(`
        *,
        libro:libros(*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading cart:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .filter(item => {
        const id = Number(item.libro?.id);
        return item.libro && !isNaN(id) && id > 0 && id < 2147483647;
      })
      .map(item => ({
        book: {
          id: item.libro.id.toString(),
          title: item.libro.titulo,
          author: 'Autor desconocido',
          publisher: item.libro.editorial?.nombre || 'Editorial desconocida',
          pages: item.libro.paginas || 0,
          publicationYear: item.libro.anio || 2024,
          isbn: item.libro.isbn || '',
          price: item.libro.precio,
          stock: item.libro.stock || 0,
          category: item.libro.categoria?.nombre || 'Sin categoría',
          description: item.libro.descripcion || '',
          coverImage: item.libro.imagen_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
          rating: 4.5,
          reviews: []
        },
        quantity: item.cantidad
      }));
  } catch (error) {
    console.error('Error in loadCartFromSupabase:', error);
    return [];
  }
};

export const mergeCartWithLocal = (serverCart: CartItem[], localCart: CartItem[]): CartItem[] => {
  const merged = new Map<string, CartItem>();

  serverCart.forEach(item => {
    merged.set(item.book.id, item);
  });

  localCart.forEach(item => {
    const existing = merged.get(item.book.id);
    if (existing) {
      merged.set(item.book.id, {
        ...existing,
        quantity: Math.min(existing.quantity + item.quantity, item.book.stock)
      });
    } else {
      merged.set(item.book.id, item);
    }
  });

  return Array.from(merged.values());
};

export const getLocalCart = (): CartItem[] => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      return JSON.parse(savedCart);
    }
  } catch (error) {
    console.error('Error loading local cart:', error);
  }
  return [];
};

export const saveLocalCart = (items: CartItem[]): void => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving local cart:', error);
  }
};

export const clearLocalCart = (): void => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing local cart:', error);
  }
};

export const validateStock = async (items: CartItem[]): Promise<{ valid: boolean; errors: string[] }> => {
  const errors: string[] = [];

  for (const item of items) {
    const { data, error } = await supabase
      .from('libros')
      .select('stock, activo')
      .eq('id', parseInt(item.book.id))
      .maybeSingle();

    if (error || !data) {
      errors.push(`Error al verificar stock de "${item.book.title}"`);
      continue;
    }

    if (!data.activo) {
      errors.push(`"${item.book.title}" ya no está disponible`);
      continue;
    }

    if (data.stock < item.quantity) {
      errors.push(`Stock insuficiente para "${item.book.title}". Disponible: ${data.stock}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
