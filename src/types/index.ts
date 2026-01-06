export type EstadoPedido = 'pendiente' | 'procesando' | 'enviado' | 'completado' | 'cancelado' | 'devolucion' | 'pending_verification' | 'payment_pending';
export type TipoPedido = 'interno' | 'iberlibro' | 'uniliber' | 'perez_galdos' | 'galeon';
export type MetodoPago = 'tarjeta' | 'paypal' | 'bizum' | 'reembolso' | 'efectivo';
export type Transportista = 'ASM' | 'GLS' | 'Envialia' | 'Correos' | 'Otro' | 'otro';
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
  nombre_completo?: string;
  fecha_nacimiento?: string;
  telefono?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
  provincia?: string;
  pais?: string;
  nif?: string;
  notas?: string;
  activo?: boolean;
  tipo?: 'particular' | 'empresa' | 'institucion';
  persona_contacto?: string;
  cargo?: string;
  web?: string;
  created_at?: string;
  updated_at?: string;
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

export interface Ubicacion {
  id: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  created_at?: string;
}

export interface Autor {
  id: number;
  nombre: string;
  biografia?: string;
  pais?: string;
  fecha_nacimiento?: string;
  fecha_fallecimiento?: string;
  sitio_web?: string;
  foto_url?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LibroAutor {
  id: number;
  libro_id: number;
  autor_id: number;
  orden?: number;
  created_at?: string;
  autor?: Autor;
}

export interface Libro {
  id: number;
  isbn?: string;
  titulo: string;
  autor?: string;
  anio?: number;
  paginas?: number;
  descripcion?: string;
  notas?: string;
  categoria_id?: number;
  editorial_id?: number;
  codigo?: string;
  legacy_id?: string;
  precio: number;
  precio_original?: number;
  ubicacion?: string;
  fecha_ingreso?: string;
  activo?: boolean;
  imagen_url?: string;
  stock?: number;
  destacado?: boolean;
  es_nuevo?: boolean;
  en_oferta?: boolean;
  created_at?: string;
  updated_at?: string;
  categoria?: Categoria;
  editorial?: Editorial;
  autores?: Autor[];
}

export interface Pedido {
  id: number;
  usuario_id: string;
  cliente_id?: string;
  fecha_pedido?: string;
  estado?: EstadoPedido;
  tipo?: TipoPedido;
  subtotal?: number;
  iva?: number;
  total?: number;
  metodo_pago?: MetodoPago;
  direccion_envio?: string;
  coste_envio?: number;
  transportista?: Transportista;
  tracking?: string;
  observaciones?: string;
  legacy_id?: number;
  created_at?: string;
  updated_at?: string;
  usuario?: Usuario;
  cliente?: Cliente;
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
  nombre_externo?: string;
  url_externa?: string;
}

export interface Factura {
  id: number;
  pedido_id: number;
  cliente_id?: string;
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
  status?: 'Pendiente' | 'Pagada' | 'Anulada';
  created_at?: string;
  updated_at?: string;
  pedido?: Pedido;
  cliente?: Cliente;
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
  ubicacion?: string;
  category: string;
  description: string;
  coverImage: string;
  rating: number;
  reviews: Review[];
  featured?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  contents?: string[];
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
  name: string; // Display name (usually username)
  username: string; // Explicit username
  fullName?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  createdAt?: string;
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
  register: (email: string, password: string, username: string, firstName: string, lastName: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
  sortBy: 'default' | 'title' | 'price' | 'rating' | 'newest';
  sortOrder: 'asc' | 'desc';
  featured?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  publisher?: string;
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
  language?: 'es' | 'en';
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
  shipping_cost?: number;
  language: 'es' | 'en';
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'pending_verification' | 'payment_pending';
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

export interface Reserva {
  id: number;
  usuario_id: string;
  libro_id: number;
  estado: 'pendiente' | 'confirmada' | 'rechazada' | 'expirada';
  created_at: string;
  updated_at?: string;
  fecha_expiracion?: string;
  confirmado_por?: string;
  rechazado_por?: string;
  fecha_confirmacion?: string;
  fecha_rechazo?: string;
  usuario?: Usuario;
  libro?: Libro;
}

export interface Notificacion {
  id: number;
  usuario_id: string;
  tipo: 'reserva_confirmada' | 'reserva_rechazada' | 'reserva_creada' | 'reserva_cancelada' | 'pedido' | 'nuevo_pedido' | 'general';
  titulo: string;
  mensaje: string;
  leida: boolean;
  reserva_id?: number;
  pedido_id?: number;
  libro_id?: string; // Added new field
  created_at: string;
  updated_at?: string; // Added new field
}

export interface AdvancedSearchCriteria {
  titulo?: string;
  autor?: string;
  editorial?: string;
  isbn?: string;
  descripcion?: string;
  legacy_id?: string;
}
