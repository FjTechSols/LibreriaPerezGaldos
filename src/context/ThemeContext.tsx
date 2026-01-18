import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'auto';
  });

  const [viewMode, setViewModeState] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('booksManager_viewMode') as 'grid' | 'table') || 'grid';
  });

  const setViewMode = (mode: 'grid' | 'table') => {
    setViewModeState(mode);
    localStorage.setItem('booksManager_viewMode', mode);
  };

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const getActualTheme = (): 'light' | 'dark' => {
      if (theme === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    const updateTheme = () => {
      const newActualTheme = getActualTheme();
      setActualTheme(newActualTheme);

      if (newActualTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, viewMode, setViewMode }}>
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
