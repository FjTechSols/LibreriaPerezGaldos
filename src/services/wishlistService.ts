import { supabase } from '../lib/supabase';
import { Book } from '../types';

const WISHLIST_STORAGE_KEY = 'library-wishlist';

export const saveWishlistToSupabase = async (userId: string, books: Book[]): Promise<boolean> => {
  try {
    const { error: deleteError } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error clearing wishlist:', deleteError);
      return false;
    }

    if (books.length === 0) {
      return true;
    }

    const wishlistItems = books.map(book => ({
      user_id: userId,
      libro_id: parseInt(book.id)
    }));

    const { error: insertError } = await supabase
      .from('wishlist')
      .insert(wishlistItems);

    if (insertError) {
      console.error('Error saving wishlist:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveWishlistToSupabase:', error);
    return false;
  }
};

export const loadWishlistFromSupabase = async (userId: string): Promise<Book[]> => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select(`
        *,
        libro:libros(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading wishlist:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .filter(item => item.libro && item.libro.activo)
      .map(item => ({
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
      }));
  } catch (error) {
    console.error('Error in loadWishlistFromSupabase:', error);
    return [];
  }
};

export const addToWishlistSupabase = async (userId: string, bookId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: userId,
        libro_id: parseInt(bookId)
      });

    if (error) {
      if (error.code === '23505') {
        return true;
      }
      console.error('Error adding to wishlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addToWishlistSupabase:', error);
    return false;
  }
};

export const removeFromWishlistSupabase = async (userId: string, bookId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('libro_id', parseInt(bookId));

    if (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeFromWishlistSupabase:', error);
    return false;
  }
};

export const mergeWishlistWithLocal = (serverWishlist: Book[], localWishlist: Book[]): Book[] => {
  const merged = new Map<string, Book>();

  serverWishlist.forEach(book => {
    merged.set(book.id, book);
  });

  localWishlist.forEach(book => {
    if (!merged.has(book.id)) {
      merged.set(book.id, book);
    }
  });

  return Array.from(merged.values());
};

export const getLocalWishlist = (): Book[] => {
  try {
    const savedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (savedWishlist) {
      return JSON.parse(savedWishlist);
    }
  } catch (error) {
    console.error('Error loading local wishlist:', error);
  }
  return [];
};

export const saveLocalWishlist = (books: Book[]): void => {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error('Error saving local wishlist:', error);
  }
};

export const clearLocalWishlist = (): void => {
  try {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing local wishlist:', error);
  }
};
