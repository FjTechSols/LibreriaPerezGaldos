import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Book, CartState } from '../types';
import { useAuth } from './AuthContext';
import {
  saveCartToSupabase,
  loadCartFromSupabase,
  mergeCartWithLocal,
  getLocalCart,
  saveLocalCart
} from '../services/cartService';

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    let isCancelled = false;

    const loadCart = async () => {
      setIsLoading(true);
      try {
        // Always load from localStorage first for immediate display
        const rawLocalCart = getLocalCart();
        // Sanitize corrupted items immediately
        const localCart = rawLocalCart.filter(item => {
           const qty = Number(item.quantity);
           const id = Number(item.book.id);
           const isValid = !isNaN(qty) && qty > 0 && qty < 10000 && !isNaN(id) && id > 0 && id < 2147483647;
           if (!isValid) console.warn('Removing corrupted item from local cart during load:', item);
           return isValid;
        });

        // If we filtered anything, update localStorage immediately to stop the loop
        if (localCart.length !== rawLocalCart.length) {
            saveLocalCart(localCart); 
        }
        
        if (isAuthenticated && user) {
          // Show local cart immediately
          if (!isCancelled && localCart.length > 0) {
            setItems(localCart);
          }

          // Then sync with server in background
          const serverCart = await loadCartFromSupabase(user.id);

          if (isCancelled) return;

          // Merge server cart with local cart
          const mergedCart = mergeCartWithLocal(serverCart, localCart);
          setItems(mergedCart);
          
          // Save merged cart back to server
          if (mergedCart.length > 0) {
            await saveCartToSupabase(user.id, mergedCart);
          }
        } else {
          // Not authenticated, use local cart only
          if (!isCancelled) {
            setItems(localCart);
          }
        }
      } catch (error) {
        if (isCancelled) return;
        console.error('Error loading cart:', error);
        // Fallback to local cart on error
        const localCart = getLocalCart();
        setItems(localCart);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isLoading) return;

    // Always save to localStorage as backup, even for authenticated users
    saveLocalCart(items);

    // Also save to Supabase if authenticated
    if (isAuthenticated && user) {
      saveCartToSupabase(user.id, items).catch(error => {
        console.error('Error saving cart to Supabase:', error);
        // If Supabase save fails, localStorage backup is already saved above
      });
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
