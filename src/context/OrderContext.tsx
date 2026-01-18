import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Book } from '../types';

export type OrderMode = 'standard' | 'flash';

interface OrderContextType {
  orderMode: OrderMode;
  setOrderMode: (mode: OrderMode) => void;
  flashItems: Book[];
  addFlashItem: (book: Book) => void;
  removeFlashItem: (bookId: string) => void;
  clearFlashOrder: () => void;
  toggleOrderMode: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  // Persist mode to localStorage
  const [orderMode, setOrderModeState] = useState<OrderMode>(() => {
    const saved = localStorage.getItem('orderSystem_mode');
    return (saved === 'flash' || saved === 'standard') ? saved : 'standard';
  });

  const [flashItems, setFlashItems] = useState<Book[]>([]);

  useEffect(() => {
    localStorage.setItem('orderSystem_mode', orderMode);
  }, [orderMode]);

  const setOrderMode = (mode: OrderMode) => {
    setOrderModeState(mode);
  };

  const toggleOrderMode = () => {
    setOrderModeState(prev => prev === 'standard' ? 'flash' : 'standard');
  };

  const addFlashItem = (book: Book) => {
    setFlashItems(prev => {
       // Prevent duplicates if needed, or allow multiples?
       // Usually Flash Order = 1 of each or multiple? 
       // Let's allow duplicates for now, or just check ID. 
       // If same ID, maybe increase quantity? 
       // For simplicity level 1: Just add to list. 
       // Better: Check uniqueness.
       if (prev.some(b => b.id === book.id)) return prev;
       return [...prev, book];
    });
  };

  const removeFlashItem = (bookId: string) => {
    setFlashItems(prev => prev.filter(b => b.id !== bookId));
  };

  const clearFlashOrder = () => {
    setFlashItems([]);
  };

  return (
    <OrderContext.Provider value={{
      orderMode,
      setOrderMode,
      flashItems,
      addFlashItem,
      removeFlashItem,
      clearFlashOrder,
      toggleOrderMode
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
