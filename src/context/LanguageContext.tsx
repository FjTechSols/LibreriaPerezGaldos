import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'es' | 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    home: 'Inicio',
    catalog: 'Catálogo',
    wishlist: 'Lista de Deseos',
    cart: 'Carrito',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    dashboard: 'Panel',
    search: 'Buscar libros...',
    language: 'Idioma',
    account: 'Cuenta',
    settings: 'Ajustes',
    myAccount: 'Mi Cuenta',
    adminPanel: 'Panel Admin',
  },
  en: {
    home: 'Home',
    catalog: 'Catalog',
    wishlist: 'Wishlist',
    cart: 'Cart',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    dashboard: 'Dashboard',
    search: 'Search books...',
    language: 'Language',
    account: 'Account',
    settings: 'Settings',
    myAccount: 'My Account',
    adminPanel: 'Admin Panel',
  },
  fr: {
    home: 'Accueil',
    catalog: 'Catalogue',
    wishlist: 'Liste de Souhaits',
    cart: 'Panier',
    login: 'Connexion',
    register: 'S\'inscrire',
    logout: 'Déconnexion',
    dashboard: 'Tableau de Bord',
    search: 'Rechercher des livres...',
    language: 'Langue',
    account: 'Compte',
    settings: 'Paramètres',
    myAccount: 'Mon Compte',
    adminPanel: 'Panneau Admin',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'es';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
