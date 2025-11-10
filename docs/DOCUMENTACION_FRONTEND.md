# Documentación del Frontend - Sistema de Librería

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Componentes](#componentes)
5. [Páginas](#páginas)
6. [Contextos (State Management)](#contextos-state-management)
7. [Servicios](#servicios)
8. [Routing](#routing)
9. [Estilos y Temas](#estilos-y-temas)
10. [Utilidades](#utilidades)

---

## Arquitectura General

El frontend es una Single Page Application (SPA) construida con React + TypeScript + Vite.

### Características principales:
- **Framework:** React 18.3+
- **Lenguaje:** TypeScript 5.5+
- **Build Tool:** Vite 5.4+
- **Router:** React Router v7.8+
- **Estado Global:** Context API
- **Estilos:** CSS Modules + Tailwind CSS
- **Iconos:** Lucide React

---

## Stack Tecnológico

### Dependencias Principales

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.8.2",
  "@supabase/supabase-js": "^2.58.0",
  "lucide-react": "^0.344.0",
  "jspdf": "^3.0.3"
}
```

### Herramientas de Desarrollo

```json
{
  "typescript": "^5.5.3",
  "vite": "^5.4.2",
  "@vitejs/plugin-react": "^4.3.1",
  "tailwindcss": "^3.4.1",
  "eslint": "^9.9.1"
}
```

---

## Estructura de Carpetas

```
src/
├── components/          # Componentes reutilizables
│   ├── BookCard.tsx
│   ├── BookFilter.tsx
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ...
│
├── pages/               # Páginas principales
│   ├── Home.tsx
│   ├── Catalog.tsx
│   ├── BookDetail.tsx
│   ├── Cart.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── AdminDashboard.tsx
│   └── UserDashboard.tsx
│
├── context/             # Context API (Estado global)
│   ├── AuthContext.tsx
│   ├── CartContext.tsx
│   ├── WishlistContext.tsx
│   ├── LanguageContext.tsx
│   ├── ThemeContext.tsx
│   └── SettingsContext.tsx
│
├── services/            # Servicios de API
│   ├── libroService.ts
│   ├── pedidoService.ts
│   ├── facturaService.ts
│   ├── clienteService.ts
│   └── ...
│
├── types/               # Definiciones de tipos TypeScript
│   └── index.ts
│
├── utils/               # Utilidades y helpers
│   ├── libroHelpers.ts
│   └── pdfGenerator.ts
│
├── styles/              # Estilos CSS
│   ├── components/
│   ├── pages/
│   ├── utilities/
│   └── dark-mode.css
│
├── lib/                 # Configuraciones de librerías
│   └── supabase.ts
│
└── data/                # Datos mock (desarrollo)
    └── mockBooks.ts
```

---

## Componentes

### 1. **Navbar.tsx**
Barra de navegación principal con búsqueda, carrito y menú de usuario.

**Props:** Ninguna (usa contextos)

**Características:**
- Búsqueda de libros
- Contador de carrito
- Contador de wishlist
- Menú de usuario autenticado
- Selector de idioma
- Selector de tema (light/dark)

**Contextos utilizados:**
- `AuthContext` - Autenticación
- `CartContext` - Carrito
- `WishlistContext` - Lista de deseos
- `LanguageContext` - Idioma
- `ThemeContext` - Tema
- `SettingsContext` - Configuraciones

```tsx
import { Navbar } from '../components/Navbar';

// Uso
<Navbar />
```

---

### 2. **BookCard.tsx**
Tarjeta de libro para mostrar en listados.

**Props:**
```typescript
interface BookCardProps {
  book: Libro;
  onAddToCart?: (book: Libro) => void;
  onAddToWishlist?: (book: Libro) => void;
}
```

**Características:**
- Imagen del libro
- Título, autor, precio
- Badges (Nuevo, Oferta, Destacado)
- Botones de acción (Carrito, Wishlist)
- Rating con estrellas
- Stock disponible

---

### 3. **BookFilter.tsx**
Filtros para el catálogo de libros.

**Props:**
```typescript
interface BookFilterProps {
  categories: string[];
  onFilterChange: (filters: FilterState) => void;
}
```

**Características:**
- Filtro por categoría
- Filtro por rango de precio
- Filtro por disponibilidad
- Ordenamiento (título, precio, rating)

---

### 4. **SearchBar.tsx**
Barra de búsqueda con autocompletado.

**Props:**
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}
```

---

### 5. **CheckoutForm.tsx**
Formulario de checkout/pedido.

**Props:**
```typescript
interface CheckoutFormProps {
  cartItems: CartItem[];
  total: number;
  onSubmit: (data: CheckoutData) => void;
}
```

**Campos:**
- Datos del cliente
- Dirección de envío
- Método de pago
- Notas adicionales

---

### 6. **InvoiceForm.tsx**
Formulario para crear facturas.

**Props:**
```typescript
interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  initialData?: Partial<InvoiceFormData>;
}
```

---

### 7. **PedidosList.tsx**
Lista de pedidos (admin/usuario).

**Props:**
```typescript
interface PedidosListProps {
  pedidos: Pedido[];
  onViewDetails: (pedido: Pedido) => void;
  onUpdateStatus?: (id: number, status: EstadoPedido) => void;
}
```

---

### 8. **GestionClientes.tsx**
CRUD de clientes (solo admin).

**Características:**
- Lista de clientes
- Crear/editar cliente
- Buscar cliente
- Exportar a CSV/Excel

---

### 9. **GestionUbicaciones.tsx**
CRUD de ubicaciones físicas del almacén.

**Características:**
- Lista de ubicaciones
- Crear/editar ubicación
- Activar/desactivar
- Asignar libros a ubicación

---

### 10. **Footer.tsx**
Pie de página con enlaces y contacto.

**Secciones:**
- Logo y descripción
- Enlaces rápidos
- Categorías
- Contacto
- Redes sociales
- Enlaces legales (Privacidad, Términos, Cookies)

---

## Páginas

### 1. **Home.tsx** (`/`)
Página principal de la tienda.

**Secciones:**
- Hero section con destacados
- Libros nuevos
- Libros en oferta
- Categorías populares
- Newsletter

---

### 2. **Catalog.tsx** (`/catalogo`)
Catálogo completo de libros con filtros.

**Query params:**
```typescript
?search=<término>
?category=<categoría>
?featured=true
?new=true
?sale=true
```

**Características:**
- Grid de libros
- Filtros laterales
- Paginación
- Ordenamiento
- Búsqueda

---

### 3. **BookDetail.tsx** (`/libro/:id`)
Detalle completo de un libro.

**Características:**
- Galería de imágenes
- Información completa
- Agregar al carrito
- Agregar a wishlist
- Compartir en redes
- Libros relacionados
- Reviews y ratings

---

### 4. **Cart.tsx** (`/carrito`)
Carrito de compras.

**Características:**
- Lista de items
- Modificar cantidad
- Eliminar items
- Resumen de precios
- Botón de checkout
- Códigos de descuento

---

### 5. **Wishlist.tsx** (`/wishlist`)
Lista de deseos del usuario.

**Características:**
- Grid de libros guardados
- Mover al carrito
- Eliminar de wishlist
- Compartir wishlist

---

### 6. **Login.tsx** (`/login`)
Página de inicio de sesión.

**Características:**
- Email y contraseña
- Recordar sesión
- Recuperar contraseña
- Enlace a registro

---

### 7. **Register.tsx** (`/registro`)
Página de registro de nuevos usuarios.

**Campos:**
- Email
- Contraseña
- Confirmación de contraseña
- Nombre completo
- Aceptar términos

---

### 8. **UserDashboard.tsx** (`/dashboard`)
Panel de usuario autenticado.

**Secciones:**
- Perfil
- Mis pedidos
- Historial de compras
- Wishlist
- Configuración

---

### 9. **AdminDashboard.tsx** (`/admin`)
Panel de administración (solo admin).

**Secciones:**
- Estadísticas
- Gestión de libros
- Gestión de pedidos
- Gestión de facturas
- Gestión de clientes
- Gestión de ubicaciones
- Configuración
- Backup y exportación

**Protección:**
```tsx
// Solo accesible si user.role === 'admin'
```

---

### 10. **AdminSettings.tsx** (`/admin/configuracion`)
Configuración global del sistema.

**Categorías:**
- Datos de la empresa
- Facturación
- Envíos
- Sistema
- Seguridad

---

## Contextos (State Management)

### 1. **AuthContext**
Gestión de autenticación de usuarios.

**Estado:**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}
```

**Métodos:**
```typescript
login(email: string, password: string): Promise<boolean>
register(email: string, password: string, name: string): Promise<boolean>
logout(): void
updateProfile(data: Partial<User>): Promise<void>
```

**Uso:**
```tsx
import { useAuth } from '../context/AuthContext';

function Component() {
  const { user, login, logout } = useAuth();

  const handleLogin = async () => {
    const success = await login('user@example.com', 'password');
    if (success) {
      // Redirigir
    }
  };

  return <div>{user ? user.name : 'Guest'}</div>;
}
```

---

### 2. **CartContext**
Gestión del carrito de compras.

**Estado:**
```typescript
interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}
```

**Métodos:**
```typescript
addItem(book: Libro): void
removeItem(bookId: string): void
updateQuantity(bookId: string, quantity: number): void
clearCart(): void
```

**Uso:**
```tsx
import { useCart } from '../context/CartContext';

function Component() {
  const { items, addItem, total } = useCart();

  return (
    <div>
      <p>Items: {items.length}</p>
      <p>Total: €{total}</p>
    </div>
  );
}
```

---

### 3. **WishlistContext**
Gestión de lista de deseos.

**Métodos:**
```typescript
addItem(book: Libro): void
removeItem(bookId: string): void
isInWishlist(bookId: string): boolean
clearWishlist(): void
```

---

### 4. **LanguageContext**
Gestión de idiomas (i18n).

**Idiomas soportados:**
- Español (es)
- English (en)

**Métodos:**
```typescript
t(key: string): string // Traducir clave
setLanguage(lang: 'es' | 'en'): void
```

**Uso:**
```tsx
import { useLanguage } from '../context/LanguageContext';

function Component() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => setLanguage('en')}>English</button>
    </div>
  );
}
```

---

### 5. **ThemeContext**
Gestión de tema (light/dark).

**Temas:**
```typescript
type Theme = 'light' | 'dark' | 'system';
```

**Métodos:**
```typescript
setTheme(theme: Theme): void
```

**Uso:**
```tsx
import { useTheme } from '../context/ThemeContext';

function Component() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme('dark')}>
      Dark Mode
    </button>
  );
}
```

---

### 6. **SettingsContext**
Configuraciones globales desde la BD.

**Estado:**
```typescript
interface SettingsState {
  settings: AllSettings;
  loading: boolean;
}
```

**Uso:**
```tsx
import { useSettings } from '../context/SettingsContext';

function Component() {
  const { settings } = useSettings();

  return <p>{settings.company.name}</p>;
}
```

---

## Servicios

Los servicios encapsulan la lógica de comunicación con Supabase.

### Ejemplo: libroService.ts

```typescript
import { supabase } from '../lib/supabase';
import { Libro } from '../types';

class LibroService {
  async getAll(): Promise<Libro[]> {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('activo', true);

    if (error) throw error;
    return data || [];
  }

  async getById(id: number): Promise<Libro | null> {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async search(query: string): Promise<Libro[]> {
    const { data, error } = await supabase
      .from('libros')
      .select('*')
      .or(`titulo.ilike.%${query}%,autor.ilike.%${query}%,isbn.ilike.%${query}%`)
      .eq('activo', true);

    if (error) throw error;
    return data || [];
  }
}

export const libroService = new LibroService();
```

### Servicios Disponibles

| Servicio | Descripción |
|----------|-------------|
| `libroService` | CRUD de libros |
| `pedidoService` | Gestión de pedidos |
| `facturaService` | Gestión de facturas |
| `clienteService` | Gestión de clientes |
| `ubicacionService` | Gestión de ubicaciones |
| `cartService` | Carrito (sync con BD) |
| `wishlistService` | Wishlist (sync con BD) |
| `settingsService` | Configuraciones |
| `backupService` | Exportación y backups |

---

## Routing

### Configuración de Rutas (App.tsx)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/libro/:id" element={<BookDetail />} />
        <Route path="/carrito" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        {/* Protegidas - Usuario */}
        <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />

        {/* Protegidas - Admin */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/configuracion" element={<AdminRoute><AdminSettings /></AdminRoute>} />

        {/* Legales */}
        <Route path="/privacidad" element={<PrivacyPolicy />} />
        <Route path="/terminos" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiesPolicy />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Rutas Protegidas

```tsx
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
}
```

---

## Estilos y Temas

### Sistema de Estilos

El proyecto usa una combinación de:
1. **Tailwind CSS** - Utilidades rápidas
2. **CSS Modules** - Estilos por componente
3. **CSS Variables** - Temas y colores

### Estructura de Estilos

```
src/styles/
├── components/         # Estilos de componentes
│   ├── Navbar.css
│   ├── BookCard.css
│   └── ...
│
├── pages/              # Estilos de páginas
│   ├── Home.css
│   ├── Catalog.css
│   └── ...
│
├── utilities/          # Utilidades globales
│   ├── variables.css   # Variables CSS
│   ├── reset.css       # CSS reset
│   └── helpers.css     # Clases helper
│
└── dark-mode.css       # Tema oscuro
```

### Variables CSS

```css
:root {
  /* Colores principales */
  --primary: #2563eb;
  --secondary: #64748b;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;

  /* Fondos */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;

  /* Textos */
  --text-primary: #1e293b;
  --text-secondary: #64748b;

  /* Bordes */
  --border-color: #e2e8f0;
}

.dark-mode {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --border-color: #334155;
}
```

### Uso de Estilos

```tsx
import '../styles/components/BookCard.css';

function BookCard({ book }: BookCardProps) {
  return (
    <div className="book-card">
      <img src={book.imagen_url} alt={book.titulo} />
      <h3 className="book-card-title">{book.titulo}</h3>
      <p className="book-card-author">{book.autor}</p>
    </div>
  );
}
```

---

## Utilidades

### 1. **libroHelpers.ts**
Funciones helper para libros.

```typescript
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
}

export function calculateDiscount(original: number, current: number): number {
  return Math.round(((original - current) / original) * 100);
}

export function getStockStatus(stock: number): 'available' | 'low' | 'out' {
  if (stock === 0) return 'out';
  if (stock < 5) return 'low';
  return 'available';
}
```

---

### 2. **pdfGenerator.ts**
Generación de PDFs (facturas, reportes).

```typescript
import jsPDF from 'jspdf';

export function generateInvoicePDF(invoice: Factura): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('FACTURA', 105, 20, { align: 'center' });

  // Número de factura
  doc.setFontSize(12);
  doc.text(`Nº ${invoice.numero_factura}`, 20, 40);

  // Cliente
  doc.text('Cliente:', 20, 60);
  doc.text(invoice.cliente_name, 20, 70);

  // Items
  let y = 100;
  invoice.items.forEach(item => {
    doc.text(item.book_title, 20, y);
    doc.text(`${item.quantity} x €${item.unit_price}`, 120, y);
    y += 10;
  });

  // Total
  doc.setFontSize(14);
  doc.text(`TOTAL: €${invoice.total}`, 150, y + 20);

  doc.save(`factura-${invoice.numero_factura}.pdf`);
}
```

---

## Convenciones de Código

### 1. Nombres de Componentes
- PascalCase para componentes: `BookCard.tsx`
- camelCase para funciones y variables
- UPPER_CASE para constantes

### 2. Estructura de Componentes

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/components/Component.css';

interface ComponentProps {
  prop1: string;
  prop2: number;
}

export function Component({ prop1, prop2 }: ComponentProps) {
  const [state, setState] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    // Effects
  }, []);

  const handleAction = () => {
    // Handler
  };

  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
}
```

### 3. Tipos TypeScript
- Definir todos los tipos en `src/types/index.ts`
- Usar interfaces para objetos
- Usar type para uniones y aliases

---

## Performance

### 1. Lazy Loading de Rutas

```tsx
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

### 2. Memoización

```tsx
import { useMemo, useCallback } from 'react';

const filteredBooks = useMemo(() => {
  return books.filter(book => book.precio < 20);
}, [books]);

const handleClick = useCallback(() => {
  // Handler
}, [dependency]);
```

---

## Testing (Futuro)

Configuración recomendada:
- **Vitest** para unit tests
- **React Testing Library** para componentes
- **Playwright** para E2E

---

## Build y Deploy

### Desarrollo
```bash
npm run dev
```

### Build de Producción
```bash
npm run build
```

### Preview
```bash
npm run preview
```

---

## Troubleshooting

### Error: "Cannot find module"
**Solución:** Verificar rutas de importación y `tsconfig.json`

### Error: "Context is undefined"
**Solución:** Verificar que el componente esté dentro del Provider correspondiente

### Estilos no se aplican
**Solución:** Verificar importación de CSS y orden de imports

---

**Última actualización:** 2025-11-10
