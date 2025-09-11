import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Book, WishlistState } from '../types';

const WishlistContext = createContext<WishlistState | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Book[]>([]);

  useEffect(() => {
    const savedWishlist = localStorage.getItem('library-wishlist');
    if (savedWishlist) {
      setItems(JSON.parse(savedWishlist));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('library-wishlist', JSON.stringify(items));
  }, [items]);

  const addItem = (book: Book) => {
    setItems(prev => {
      if (!prev.find(item => item.id === book.id)) {
        return [...prev, book];
      }
      return prev;
    });
  };

  const removeItem = (bookId: string) => {
    setItems(prev => prev.filter(item => item.id !== bookId));
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