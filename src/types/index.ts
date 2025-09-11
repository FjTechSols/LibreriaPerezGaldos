export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  pages: number;
  publicationYear: number;
  isbn: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  description: string;
  coverImage: string;
  rating: number;
  reviews: Review[];
  featured?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
}

export interface CartState {
  items: CartItem[];
  addItem: (book: Book) => void;
  removeItem: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export interface WishlistState {
  items: Book[];
  addItem: (book: Book) => void;
  removeItem: (bookId: string) => void;
  isInWishlist: (bookId: string) => boolean;
}

export interface FilterState {
  category: string;
  priceRange: [number, number];
  availability: 'all' | 'inStock' | 'outOfStock';
  sortBy: 'title' | 'price' | 'rating' | 'newest';
  sortOrder: 'asc' | 'desc';
}