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

    heroTitle: 'Descubre tu próxima',
    heroHighlight: 'gran lectura',
    heroSubtitle: 'Miles de libros esperándote. Desde clásicos atemporales hasta las últimas novedades. Encuentra historias que transformarán tu mundo.',
    exploreCatalog: 'Explorar Catálogo',
    viewFeatured: 'Ver Destacados',
    featuredBooks: 'Libros Destacados',
    latestReleases: 'Últimas Novedades',
    specialOffers: 'Ofertas Especiales',
    viewAll: 'Ver todos',
    viewAllReleases: 'Ver todas',
    viewOffers: 'Ver ofertas',
    newToLibrary: '¿Nuevo en nuestra librería?',
    joinCommunity: 'Únete a nuestra comunidad de lectores y disfruta de beneficios exclusivos, descuentos especiales y recomendaciones personalizadas.',
    registerFree: 'Registrarse Gratis',

    loginTitle: 'Iniciar Sesión',
    loginSubtitle: 'Accede a tu cuenta para continuar con tu experiencia de lectura',
    email: 'Email',
    emailOrUsername: 'Email o Usuario',
    emailOrUsernamePlaceholder: 'tu@email.com o usuario',
    password: 'Contraseña',
    loggingIn: 'Iniciando...',
    forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes cuenta?',
    registerHere: 'Regístrate aquí',
    incorrectCredentials: 'Email o contraseña incorrectos',
    hidePassword: 'Ocultar contraseña',
    showPassword: 'Mostrar contraseña',

    registerTitle: 'Crear Cuenta',
    registerSubtitle: 'Únete a nuestra comunidad de lectores',
    fullName: 'Nombre Completo',
    confirmPassword: 'Confirmar Contraseña',
    creating: 'Creando...',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    loginHere: 'Inicia sesión aquí',
    passwordsDontMatch: 'Las contraseñas no coinciden',

    footerDescription: 'Tu librería de confianza con la mejor selección de libros en español y otros idiomas. Descubre nuevas historias y encuentra tus próximas lecturas favoritas.',
    quickLinks: 'Enlaces Rápidos',
    categories: 'Categorías',
    contact: 'Contacto',
    allRightsReserved: 'Todos los derechos reservados',
    privacyPolicy: 'Política de Privacidad',
    termsOfService: 'Términos de Servicio',
    cookies: 'Cookies',

    addToCart: 'Añadir al Carrito',
    addToWishlist: 'Añadir a Lista de Deseos',
    removeFromWishlist: 'Eliminar de Lista de Deseos',
    buyNow: 'Comprar Ahora',
    outOfStock: 'Agotado',
    inStock: 'Disponible',
    price: 'Precio',
    author: 'Autor',
    description: 'Descripción',
    details: 'Detalles',

    emptyCart: 'Tu carrito está vacío',
    emptyCartMessage: 'Parece que no has añadido ningún libro a tu carrito todavía.',
    startShopping: 'Comenzar a comprar',
    cartTotal: 'Total del Carrito',
    subtotal: 'Subtotal',
    shipping: 'Envío',
    total: 'Total',
    proceedCheckout: 'Proceder al Pago',
    continueShopping: 'Continuar Comprando',

    emptyWishlist: 'Tu lista de deseos está vacía',
    emptyWishlistMessage: 'Guarda tus libros favoritos aquí para más tarde.',
    moveToCart: 'Mover al Carrito',
    remove: 'Eliminar',
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

    heroTitle: 'Discover your next',
    heroHighlight: 'great read',
    heroSubtitle: 'Thousands of books waiting for you. From timeless classics to the latest releases. Find stories that will transform your world.',
    exploreCatalog: 'Explore Catalog',
    viewFeatured: 'View Featured',
    featuredBooks: 'Featured Books',
    latestReleases: 'Latest Releases',
    specialOffers: 'Special Offers',
    viewAll: 'View all',
    viewAllReleases: 'View all',
    viewOffers: 'View offers',
    newToLibrary: 'New to our bookstore?',
    joinCommunity: 'Join our community of readers and enjoy exclusive benefits, special discounts and personalized recommendations.',
    registerFree: 'Register Free',

    loginTitle: 'Login',
    loginSubtitle: 'Access your account to continue your reading experience',
    email: 'Email',
    emailOrUsername: 'Email or Username',
    emailOrUsernamePlaceholder: 'your@email.com or username',
    password: 'Password',
    loggingIn: 'Logging in...',
    forgotPassword: 'Forgot your password?',
    noAccount: 'Don\'t have an account?',
    registerHere: 'Register here',
    incorrectCredentials: 'Incorrect email or password',
    hidePassword: 'Hide password',
    showPassword: 'Show password',

    registerTitle: 'Create Account',
    registerSubtitle: 'Join our community of readers',
    fullName: 'Full Name',
    confirmPassword: 'Confirm Password',
    creating: 'Creating...',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Login here',
    passwordsDontMatch: 'Passwords don\'t match',

    footerDescription: 'Your trusted bookstore with the best selection of books in Spanish and other languages. Discover new stories and find your next favorite reads.',
    quickLinks: 'Quick Links',
    categories: 'Categories',
    contact: 'Contact',
    allRightsReserved: 'All rights reserved',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    cookies: 'Cookies',

    addToCart: 'Add to Cart',
    addToWishlist: 'Add to Wishlist',
    removeFromWishlist: 'Remove from Wishlist',
    buyNow: 'Buy Now',
    outOfStock: 'Out of Stock',
    inStock: 'In Stock',
    price: 'Price',
    author: 'Author',
    description: 'Description',
    details: 'Details',

    emptyCart: 'Your cart is empty',
    emptyCartMessage: 'Looks like you haven\'t added any books to your cart yet.',
    startShopping: 'Start Shopping',
    cartTotal: 'Cart Total',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    proceedCheckout: 'Proceed to Checkout',
    continueShopping: 'Continue Shopping',

    emptyWishlist: 'Your wishlist is empty',
    emptyWishlistMessage: 'Save your favorite books here for later.',
    moveToCart: 'Move to Cart',
    remove: 'Remove',
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

    heroTitle: 'Découvrez votre prochaine',
    heroHighlight: 'grande lecture',
    heroSubtitle: 'Des milliers de livres vous attendent. Des classiques intemporels aux dernières nouveautés. Trouvez des histoires qui transformeront votre monde.',
    exploreCatalog: 'Explorer le Catalogue',
    viewFeatured: 'Voir les Vedettes',
    featuredBooks: 'Livres en Vedette',
    latestReleases: 'Dernières Nouveautés',
    specialOffers: 'Offres Spéciales',
    viewAll: 'Voir tout',
    viewAllReleases: 'Voir toutes',
    viewOffers: 'Voir les offres',
    newToLibrary: 'Nouveau dans notre librairie?',
    joinCommunity: 'Rejoignez notre communauté de lecteurs et profitez d\'avantages exclusifs, de réductions spéciales et de recommandations personnalisées.',
    registerFree: 'S\'inscrire Gratuitement',

    loginTitle: 'Connexion',
    loginSubtitle: 'Accédez à votre compte pour continuer votre expérience de lecture',
    email: 'Email',
    emailOrUsername: 'Email ou Nom d\'utilisateur',
    emailOrUsernamePlaceholder: 'votre@email.com ou nom d\'utilisateur',
    password: 'Mot de passe',
    loggingIn: 'Connexion...',
    forgotPassword: 'Mot de passe oublié?',
    noAccount: 'Vous n\'avez pas de compte?',
    registerHere: 'Inscrivez-vous ici',
    incorrectCredentials: 'Email ou mot de passe incorrect',
    hidePassword: 'Masquer le mot de passe',
    showPassword: 'Afficher le mot de passe',

    registerTitle: 'Créer un Compte',
    registerSubtitle: 'Rejoignez notre communauté de lecteurs',
    fullName: 'Nom Complet',
    confirmPassword: 'Confirmer le Mot de Passe',
    creating: 'Création...',
    alreadyHaveAccount: 'Vous avez déjà un compte?',
    loginHere: 'Connectez-vous ici',
    passwordsDontMatch: 'Les mots de passe ne correspondent pas',

    footerDescription: 'Votre librairie de confiance avec la meilleure sélection de livres en espagnol et autres langues. Découvrez de nouvelles histoires et trouvez vos prochaines lectures préférées.',
    quickLinks: 'Liens Rapides',
    categories: 'Catégories',
    contact: 'Contact',
    allRightsReserved: 'Tous droits réservés',
    privacyPolicy: 'Politique de Confidentialité',
    termsOfService: 'Conditions d\'Utilisation',
    cookies: 'Cookies',

    addToCart: 'Ajouter au Panier',
    addToWishlist: 'Ajouter à la Liste',
    removeFromWishlist: 'Retirer de la Liste',
    buyNow: 'Acheter Maintenant',
    outOfStock: 'Épuisé',
    inStock: 'Disponible',
    price: 'Prix',
    author: 'Auteur',
    description: 'Description',
    details: 'Détails',

    emptyCart: 'Votre panier est vide',
    emptyCartMessage: 'Il semble que vous n\'ayez pas encore ajouté de livres à votre panier.',
    startShopping: 'Commencer vos Achats',
    cartTotal: 'Total du Panier',
    subtotal: 'Sous-total',
    shipping: 'Livraison',
    total: 'Total',
    proceedCheckout: 'Procéder au Paiement',
    continueShopping: 'Continuer les Achats',

    emptyWishlist: 'Votre liste est vide',
    emptyWishlistMessage: 'Enregistrez vos livres préférés ici pour plus tard.',
    moveToCart: 'Déplacer au Panier',
    remove: 'Supprimer',
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
