import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const loadWishlist = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
      await addToWishlistSupabase(user.id, book.id);
    } else {
      const updatedItems = [...items, book];
      saveLocalWishlist(updatedItems);
    }
  };

  const removeItem = async (bookId: string) => {
    setItems(prev => prev.filter(item => item.id !== bookId));

    if (isAuthenticated && user) {
      await removeFromWishlistSupabase(user.id, bookId);
    } else {
      const updatedItems = items.filter(item => item.id !== bookId);
      saveLocalWishlist(updatedItems);
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