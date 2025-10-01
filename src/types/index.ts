export type EstadoPedido = 'pendiente' | 'procesando' | 'enviado' | 'completado' | 'cancelado';
export type TipoPedido = 'interno' | 'iberlibro' | 'conecta' | 'uniliber' | 'libreros_de_viejo';
export type MetodoPago = 'tarjeta' | 'paypal' | 'transferencia' | 'reembolso';
export type Transportista = 'ASM' | 'GLS' | 'Envialia' | 'otro';
export type TipoFactura = 'normal' | 'rectificativa';
export type TipoDocumento = 'certificado' | 'factura' | 'reembolso' | 'tarjeta_adhesiva' | 'tarjeta_termica' | 'etiqueta_envio';

export interface Rol {
  id: number;
  nombre: string;
  created_at?: string;
}

export interface Usuario {
  id: string;
  auth_user_id?: string;
  username: string;
  email: string;
  rol_id: number;
  fecha_registro?: string;
  legacy_id?: number;
  activo?: boolean;
}

export interface Editorial {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  legacy_id?: number;
  created_at?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  legacy_id?: number;
  activa?: boolean;
  parent_id?: number;
  created_at?: string;
}

export interface Libro {
  id: number;
  isbn?: string;
  titulo: string;
  anio?: number;
  paginas?: number;
  descripcion?: string;
  notas?: string;
  categoria_id?: number;
  editorial_id?: number;
  legacy_id?: string;
  precio: number;
  ubicacion?: string;
  fecha_ingreso?: string;
  activo?: boolean;
  imagen_url?: string;
  stock?: number;
  created_at?: string;
  updated_at?: string;
  categoria?: Categoria;
  editorial?: Editorial;
}

export interface Pedido {
  id: number;
  usuario_id: string;
  fecha_pedido?: string;
  estado?: EstadoPedido;
  tipo?: TipoPedido;
  subtotal?: number;
  iva?: number;
  total?: number;
  metodo_pago?: MetodoPago;
  direccion_envio?: string;
  transportista?: Transportista;
  tracking?: string;
  observaciones?: string;
  legacy_id?: number;
  created_at?: string;
  updated_at?: string;
  usuario?: Usuario;
  detalles?: PedidoDetalle[];
  factura?: Factura;
  envio?: Envio;
}

export interface PedidoDetalle {
  id: number;
  pedido_id: number;
  libro_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
  created_at?: string;
  libro?: Libro;
}

export interface Factura {
  id: number;
  pedido_id: number;
  numero_factura: string;
  fecha?: string;
  subtotal: number;
  iva: number;
  total: number;
  tipo?: TipoFactura;
  factura_original_id?: number;
  archivo_pdf?: string;
  archivo_xml?: string;
  anulada?: boolean;
  motivo_anulacion?: string;
  created_at?: string;
  updated_at?: string;
  pedido?: Pedido;
  factura_original?: Factura;
  reembolsos?: Reembolso[];
}

export interface Reembolso {
  id: number;
  factura_id: number;
  fecha?: string;
  motivo?: string;
  importe: number;
  estado?: string;
  created_at?: string;
  factura?: Factura;
}

export interface Envio {
  id: number;
  pedido_id: number;
  transportista?: Transportista;
  tracking?: string;
  etiqueta_pdf?: string;
  fecha_envio?: string;
  fecha_entrega?: string;
  estado?: string;
  created_at?: string;
  updated_at?: string;
  pedido?: Pedido;
}

export interface Documento {
  id: number;
  pedido_id?: number;
  tipo?: TipoDocumento;
  archivo?: string;
  nombre_archivo?: string;
  descripcion?: string;
  fecha?: string;
  pedido?: Pedido;
}

export interface Auditoria {
  id: number;
  tabla: string;
  registro_id: number;
  accion: string;
  usuario_id?: string;
  datos_anteriores?: Record<string, unknown>;
  datos_nuevos?: Record<string, unknown>;
  fecha?: string;
  usuario?: Usuario;
}

export interface Book {
  id: string;
  code?: string;
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