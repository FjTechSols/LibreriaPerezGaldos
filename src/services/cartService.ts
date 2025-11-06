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
    const { error: deleteError } = await supabase
      .from('carritos')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error clearing cart:', deleteError);
      return false;
    }

    if (items.length === 0) {
      return true;
    }

    const validItems: Array<{ user_id: string; libro_id: number; cantidad: number }> = [];

    for (const item of items) {
      const libroId = parseInt(item.book.id);

      if (isNaN(libroId)) {
        console.warn(`Skipping invalid book ID: ${item.book.id}`);
        continue;
      }

      const { data: libro, error } = await supabase
        .from('libros')
        .select('id')
        .eq('id', libroId)
        .maybeSingle();

      if (error || !libro) {
        console.warn(`Book ${libroId} not found in database, skipping`);
        continue;
      }

      validItems.push({
        user_id: userId,
        libro_id: libroId,
        cantidad: item.quantity
      });
    }

    if (validItems.length === 0) {
      return true;
    }

    const { error: insertError } = await supabase
      .from('carritos')
      .insert(validItems);

    if (insertError) {
      console.error('Error saving cart:', insertError);
      return false;
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
      .filter(item => item.libro)
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
