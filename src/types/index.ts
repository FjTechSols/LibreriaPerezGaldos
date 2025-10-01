export interface Book {
  id: string;
  code?: string; // Internal code for admin/warehouse management
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

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_address: string;
  customer_nif: string;
  issue_date: string;
  status: 'Pendiente' | 'Pagada' | 'Anulada';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_method?: string;
  order_id?: string;
  items?: InvoiceItem[];
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  book_id: string;
  book_title: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at?: string;
}

export interface InvoiceFormData {
  customer_name: string;
  customer_address: string;
  customer_nif: string;
  tax_rate: number;
  payment_method?: string;
  order_id?: string;
  items: InvoiceItem[];
}

export interface InvoiceContextType {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  fetchInvoices: () => Promise<void>;
  createInvoice: (data: InvoiceFormData) => Promise<Invoice | null>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  getNextInvoiceNumber: () => Promise<string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  orderDate: string;
  expectedDelivery: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  notes?: string;
}

export interface OrderItem {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  logo?: string;
}