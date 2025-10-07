# Estado de Conexión con Backend y Base de Datos

## Resumen Ejecutivo

La plataforma está **parcialmente conectada** a Supabase (PostgreSQL). Algunas funcionalidades operan con datos reales de la base de datos, mientras otras aún utilizan datos mock (simulados) en el frontend.

---

## ✅ CONECTADO A SUPABASE (Funcionando)

### 1. **Autenticación de Usuarios** 🔐
- **Estado**: ✅ Totalmente funcional
- **Tablas**: `auth.users` (Supabase Auth) + `usuarios`
- **Funcionalidades**:
  - Login con email/password
  - Registro de usuarios
  - Gestión de sesiones
  - Roles (admin/user)
  - Cierre de sesión
- **Archivo**: `src/context/AuthContext.tsx`

### 2. **Gestión de Pedidos** 📦
- **Estado**: ✅ Totalmente funcional
- **Tablas**: `pedidos`, `pedido_detalles`, `usuarios`, `libros`
- **Funcionalidades**:
  - Crear pedidos
  - Listar pedidos (con filtros)
  - Ver detalles de pedido
  - Actualizar estado de pedido
  - Agregar/eliminar detalles de pedido
  - Calcular subtotal, IVA y total
  - Estadísticas de pedidos
- **Archivo**: `src/services/pedidoService.ts`

### 3. **Gestión de Clientes** 👥
- **Estado**: ✅ Totalmente funcional
- **Tabla**: `clientes`
- **Funcionalidades**:
  - Listar clientes
  - Crear clientes
  - Actualizar clientes
  - Eliminar clientes
  - Búsqueda de clientes
- **Archivo**: `src/services/clienteService.ts`

### 4. **Gestión de Facturas** 🧾
- **Estado**: ✅ Totalmente funcional
- **Tablas**: `invoices`, `invoice_items`
- **Funcionalidades**:
  - Crear facturas
  - Listar facturas
  - Ver detalles de factura
  - Actualizar estado de factura
  - Generar numeración automática
  - Calcular totales con IVA
- **Archivo**: `src/context/InvoiceContext.tsx`

### 5. **Base de Datos Completa** 🗄️
- **Estado**: ✅ Esquema completo creado
- **Tablas principales**:
  - `usuarios`, `roles`
  - `libros`, `categorias`, `editoriales`, `autores`
  - `pedidos`, `pedido_detalles`
  - `clientes`
  - `facturas` (invoices), `invoice_items`
  - `carrito`, `wishlist`
  - `auditoria`, `envios`
- **Políticas RLS**: ✅ Configuradas y activas
- **Migraciones**: En `supabase/migrations/`

---

## ❌ NO CONECTADO (Usando Datos Mock)

### 1. **Catálogo de Libros** 📚
- **Estado**: ❌ Usando datos simulados
- **Archivo**: `src/data/mockBooks.ts`
- **Componentes afectados**:
  - `Home.tsx` - Página principal
  - `Catalog.tsx` - Catálogo completo
  - `BookDetail.tsx` - Detalle de libro
  - `BookCard.tsx` - Tarjetas de libro
  - `BookFilter.tsx` - Filtros
  - `AdminDashboard.tsx` - Gestión de libros
  - `Navbar.tsx` - Sugerencias de búsqueda
  - `SearchBar.tsx` - Buscador

**Nota**: Aunque la tabla `libros` existe en la base de datos, el frontend aún no consume estos datos. Usa un array hardcodeado de ~50 libros de ejemplo.

### 2. **Carrito de Compras** 🛒
- **Estado**: ❌ Solo en memoria (Context API)
- **Archivo**: `src/context/CartContext.tsx`
- **Tabla existente**: `carrito` (creada pero sin uso)
- **Funcionalidad actual**:
  - Almacenamiento en `localStorage`
  - No persiste en base de datos
  - Se pierde al limpiar caché del navegador

### 3. **Lista de Deseos (Wishlist)** ❤️
- **Estado**: ❌ Solo en memoria (Context API)
- **Archivo**: `src/context/WishlistContext.tsx`
- **Tabla existente**: `wishlist` (creada pero sin uso)
- **Funcionalidad actual**:
  - Almacenamiento en `localStorage`
  - No persiste en base de datos
  - Se pierde al limpiar caché del navegador

---

## 🔄 CONEXIÓN HÍBRIDA

### Creación de Pedidos desde AdminDashboard
- **Situación**: Usa datos mock de libros PERO guarda pedidos en BD
- **Flujo**:
  1. Selecciona libros de `mockBooks` (frontend)
  2. Crea pedido en tabla `pedidos` (Supabase)
  3. El pedido se guarda con datos reales en BD
- **Problema**: Los `libro_id` en `pedido_detalles` no coinciden con IDs reales de la tabla `libros`

---

## 📊 Arquitectura Actual

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ AuthContext ──────────────────► Supabase Auth       │
│  ✅ InvoiceContext ───────────────► invoices table      │
│  ✅ pedidoService ────────────────► pedidos table       │
│  ✅ clienteService ───────────────► clientes table      │
│                                                          │
│  ❌ mockBooks.ts (hardcoded) ──────X  libros table      │
│  ❌ CartContext (localStorage) ────X  carrito table     │
│  ❌ WishlistContext (localStorage) X  wishlist table    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Tablas en Base de Datos Supabase

### ✅ Tablas Activas (en uso)
| Tabla | Estado | Uso |
|-------|--------|-----|
| `usuarios` | ✅ Activa | Autenticación y perfiles |
| `roles` | ✅ Activa | Roles admin/user |
| `pedidos` | ✅ Activa | Gestión de pedidos |
| `pedido_detalles` | ✅ Activa | Líneas de pedido |
| `clientes` | ✅ Activa | Base de clientes |
| `invoices` | ✅ Activa | Facturas |
| `invoice_items` | ✅ Activa | Líneas de factura |

### ⚠️ Tablas Creadas pero Sin Uso
| Tabla | Estado | Nota |
|-------|--------|------|
| `libros` | ⚠️ Creada sin uso | Catálogo usa mockBooks |
| `categorias` | ⚠️ Creada sin uso | Filtros usan array hardcodeado |
| `editoriales` | ⚠️ Creada sin uso | No se consulta desde frontend |
| `autores` | ⚠️ Creada sin uso | No se consulta desde frontend |
| `autor_libro` | ⚠️ Creada sin uso | Tabla pivot sin uso |
| `carrito` | ⚠️ Creada sin uso | Se usa localStorage |
| `wishlist` | ⚠️ Creada sin uso | Se usa localStorage |
| `auditoria` | ⚠️ Creada sin uso | No hay logs de auditoría |
| `envios` | ⚠️ Creada sin uso | No hay tracking de envíos |

---

## 🚀 Próximos Pasos Recomendados

Para tener una conexión completa con la base de datos:

### 1. Conectar Catálogo de Libros
- Crear `src/services/libroService.ts`
- Migrar de `mockBooks.ts` a consultas reales
- Actualizar componentes: `Home`, `Catalog`, `BookDetail`, `BookCard`
- Poblar tabla `libros` con datos reales

### 2. Conectar Carrito
- Modificar `CartContext.tsx` para usar Supabase
- Guardar items en tabla `carrito`
- Sincronizar entre dispositivos del mismo usuario

### 3. Conectar Wishlist
- Modificar `WishlistContext.tsx` para usar Supabase
- Guardar items en tabla `wishlist`
- Sincronizar entre dispositivos

### 4. Migración de Datos
- Importar libros desde sistema legacy
- Asociar categorías y editoriales
- Verificar integridad de datos

---

## 🔧 Variables de Entorno

```env
VITE_SUPABASE_URL=<tu-url>
VITE_SUPABASE_ANON_KEY=<tu-key>
```

**Estado**: ✅ Configuradas y funcionando

---

## 📝 Notas Importantes

1. **RLS (Row Level Security)**: Todas las tablas tienen políticas RLS activas para seguridad
2. **Migraciones**: Historial completo en `supabase/migrations/`
3. **Scripts de utilidad**: En carpeta `docs/` hay scripts para crear admins, eliminar usuarios, etc.
4. **Datos Mock**: Los libros en `mockBooks.ts` son ~50 libros de ejemplo con todos los campos necesarios

---

## 🎯 Estado General

| Módulo | Conexión Backend | Funcionalidad |
|--------|------------------|---------------|
| Autenticación | ✅ 100% | ✅ Completa |
| Pedidos | ✅ 100% | ✅ Completa |
| Facturas | ✅ 100% | ✅ Completa |
| Clientes | ✅ 100% | ✅ Completa |
| Catálogo Libros | ❌ 0% | ⚠️ Datos mock |
| Carrito | ❌ 0% | ⚠️ Solo frontend |
| Wishlist | ❌ 0% | ⚠️ Solo frontend |

**Progreso Total**: ~60% conectado a backend
