import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Book, CartState } from '../types';
import { useAuth } from './AuthContext';
import {
  saveCartToSupabase,
  loadCartFromSupabase,
  mergeCartWithLocal,
  getLocalCart,
  saveLocalCart,
  clearLocalCart
} from '../services/cartService';

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      try {
        if (isAuthenticated && user) {
          const localCart = getLocalCart();
          const serverCart = await loadCartFromSupabase(user.id);
          const mergedCart = mergeCartWithLocal(serverCart, localCart);
          setItems(mergedCart);
          if (localCart.length > 0) {
            await saveCartToSupabase(user.id, mergedCart);
            clearLocalCart();
          }
        } else {
          const localCart = getLocalCart();
          setItems(localCart);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        const localCart = getLocalCart();
        setItems(localCart);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      saveCartToSupabase(user.id, items).catch(error => {
        console.error('Error saving cart to Supabase:', error);
      });
    } else {
      saveLocalCart(items);
    }
  }, [items, isAuthenticated, user, isLoading]);

  const addItem = (book: Book) => {
    setItems(prev => {
      const existingItem = prev.find(item => item.book.id === book.id);
      if (existingItem) {
        return prev.map(item =>
          item.book.id === book.id
            ? { ...item, quantity: Math.min(item.quantity + 1, book.stock) }
            : item
        );
      }
      return [...prev, { book, quantity: 1 }];
    });
  };

  const removeItem = (bookId: string) => {
    setItems(prev => prev.filter(item => item.book.id !== bookId));
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(bookId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.book.id === bookId
          ? { ...item, quantity: Math.min(quantity, item.book.stock) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => {
    const price = item.book.price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}