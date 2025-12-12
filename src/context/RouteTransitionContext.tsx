import { createContext, useContext, useState, ReactNode } from 'react';

interface RouteTransitionContextType {
  isTransitioning: boolean;
  startTransition: () => void;
  endTransition: () => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextType | undefined>(undefined);

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
  };

  const endTransition = () => {
    // Minimum transition time of 1.5 seconds
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1500);
  };

  return (
    <RouteTransitionContext.Provider value={{ isTransitioning, startTransition, endTransition }}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error('useRouteTransition must be used within RouteTransitionProvider');
  }
  return context;
}
