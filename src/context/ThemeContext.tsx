import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Tipos de modo de tema disponibles.
 * light: Fuerza modo claro
 * dark: Fuerza modo oscuro
 * system: Sigue la preferencia del sistema operativo
 */
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark'; // El tema real que se está aplicando
  setTheme: (mode: ThemeMode) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
}

// Extensión para TypeScript de la función global expuesta en theme-provider.js
declare global {
  interface Window {
    __setTheme: (theme: ThemeMode) => void;
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme') || 'system';
    if (stored === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return stored as 'light' | 'dark';
  });

  const [viewMode, setViewModeState] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('booksManager_viewMode') as 'grid' | 'table') || 'grid';
  });

  const setViewMode = (mode: 'grid' | 'table') => {
    setViewModeState(mode);
    localStorage.setItem('booksManager_viewMode', mode);
  };

  // Sincronizar el estado de React con el script base y el sistema
  useEffect(() => {
    const updateTheme = () => {
      const mode = (localStorage.getItem('theme') as ThemeMode) || 'system';
      let resolved: 'light' | 'dark';
      
      if (mode === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = mode as 'light' | 'dark';
      }
      
      setResolvedTheme(resolved);
    };

    // Escuchar cambios en el sistema si el modo es 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    updateTheme(); // Sync inicial

    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    // Usamos la función global del theme-provider para sincronización inmediata
    if (window.__setTheme) {
      window.__setTheme(newTheme);
    } else {
      // Fallback si por alguna razón no se cargó el provider (SSR o errores)
      localStorage.setItem('theme', newTheme);
      const resolved = newTheme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : newTheme;
      
      document.documentElement.dataset.theme = resolved;
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      document.documentElement.classList.toggle('dark-mode', resolved === 'dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      resolvedTheme, 
      setTheme, 
      viewMode, 
      setViewMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
