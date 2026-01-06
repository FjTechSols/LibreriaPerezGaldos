import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book, WishlistState } from '../types';
import { useAuth } from './AuthContext';
import {
  loadWishlistFromSupabase,
  addToWishlistSupabase,
  removeFromWishlistSupabase,
  mergeWishlistWithLocal,
  getLocalWishlist,
  saveLocalWishlist,
  clearLocalWishlist
} from '../services/wishlistService';

const WishlistContext = createContext<WishlistState | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Book[]>([]);

  
  // Safe access to auth context with fallback for hot reload issues
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // AuthContext not ready yet (hot reload issue)
    authContext = { user: null, isAuthenticated: false };
  }
  
  const { user, isAuthenticated } = authContext;

  useEffect(() => {
    const loadWishlist = async () => {

      try {
        if (isAuthenticated && user) {
          const localWishlist = getLocalWishlist();
          const serverWishlist = await loadWishlistFromSupabase(user.id);
          const mergedWishlist = mergeWishlistWithLocal(serverWishlist, localWishlist);
          setItems(mergedWishlist);

          if (localWishlist.length > 0) {
            for (const book of localWishlist) {
              await addToWishlistSupabase(user.id, book.id);
            }
            clearLocalWishlist();
          }
        } else {
          const localWishlist = getLocalWishlist();
          setItems(localWishlist);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
        const localWishlist = getLocalWishlist();
        setItems(localWishlist);
      }
    };

    loadWishlist();
  }, [isAuthenticated, user]);

  const addItem = async (book: Book) => {
    if (items.find(item => item.id === book.id)) {
      return;
    }

    setItems(prev => [...prev, book]);

    if (isAuthenticated && user) {
      try {
        await addToWishlistSupabase(user.id, book.id);
      } catch (error) {
        console.error('Error adding item to wishlist:', error);
        // Revertir cambio si falla sincronización
        setItems(prev => prev.filter(item => item.id !== book.id));
      }
    } else {
      // Usar callback para obtener el estado más reciente
      setItems(prev => {
        saveLocalWishlist(prev);
        return prev;
      });
    }
  };

  const removeItem = async (bookId: string) => {
    const originalItems = items;
    setItems(prev => prev.filter(item => item.id !== bookId));

    if (isAuthenticated && user) {
      try {
        await removeFromWishlistSupabase(user.id, bookId);
      } catch (error) {
        console.error('Error removing item from wishlist:', error);
        // Revertir cambio si falla sincronización
        setItems(originalItems);
      }
    } else {
      setItems(prev => {
        saveLocalWishlist(prev);
        return prev;
      });
    }
  };

  const isInWishlist = (bookId: string) => {
    return items.some(item => item.id === bookId);
  };

  return (
    <WishlistContext.Provider value={{
      items,
      addItem,
      removeItem,
      isInWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}