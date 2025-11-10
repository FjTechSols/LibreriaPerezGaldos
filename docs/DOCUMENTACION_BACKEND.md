# Documentación del Backend - Sistema de Librería

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Base de Datos (Supabase)](#base-de-datos-supabase)
3. [Esquema de Tablas](#esquema-de-tablas)
4. [Seguridad y RLS](#seguridad-y-rls)
5. [Servicios Backend](#servicios-backend)
6. [Migraciones](#migraciones)
7. [Configuración](#configuración)

---

## Arquitectura General

El backend está construido sobre **Supabase** (PostgreSQL + API REST autogenerada) con las siguientes características:

- **Base de Datos**: PostgreSQL con Row Level Security (RLS)
- **Autenticación**: Supabase Auth (email/password)
- **API REST**: Auto-generada por Supabase
- **Almacenamiento**: Supabase Storage (opcional, no implementado actualmente)
- **Real-time**: Capacidades real-time de Supabase (no implementado actualmente)

### Stack Tecnológico Backend
- PostgreSQL 15+
- Supabase (BaaS)
- Row Level Security (RLS) para seguridad a nivel de fila
- Triggers y Functions PL/pgSQL

---

## Base de Datos (Supabase)

### Configuración de Conexión

Las credenciales se encuentran en el archivo `.env`:

```env
VITE_SUPABASE_URL=<tu_url_supabase>
VITE_SUPABASE_ANON_KEY=<tu_anon_key>
```

### Cliente Supabase

Archivo: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Esquema de Tablas

### 1. **usuarios**
Tabla de usuarios del sistema vinculada con Supabase Auth.

```sql
CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text UNIQUE NOT NULL,
  rol text DEFAULT 'cliente',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Roles disponibles:**
- `admin` - Administrador completo
- `empleado` - Empleado de la librería
- `cliente` - Cliente registrado

---

### 2. **libros**
Tabla principal de productos (libros).

```sql
CREATE TABLE libros (
  id serial PRIMARY KEY,
  isbn text,
  titulo text NOT NULL,
  autor text,
  anio integer,
  paginas integer,
  descripcion text,
  categoria_id integer REFERENCES categorias(id),
  editorial_id integer REFERENCES editoriales(id),
  codigo text UNIQUE,
  precio numeric(10,2) NOT NULL,
  precio_original numeric(10,2),
  ubicacion_id integer REFERENCES ubicaciones(id),
  stock integer DEFAULT 0,
  destacado boolean DEFAULT false,
  es_nuevo boolean DEFAULT false,
  en_oferta boolean DEFAULT false,
  activo boolean DEFAULT true,
  imagen_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Campos especiales:**
- `codigo` - Código interno único de la librería
- `destacado` - Mostrar en página principal
- `es_nuevo` - Badge de "Nuevo"
- `en_oferta` - Badge de "Oferta"

---

### 3. **autores**
Tabla de autores con relación muchos-a-muchos con libros.

```sql
CREATE TABLE autores (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  biografia text,
  pais text,
  fecha_nacimiento date,
  fecha_fallecimiento date,
  sitio_web text,
  foto_url text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE libros_autores (
  id serial PRIMARY KEY,
  libro_id integer REFERENCES libros(id) ON DELETE CASCADE,
  autor_id integer REFERENCES autores(id) ON DELETE CASCADE,
  orden integer DEFAULT 1,
  UNIQUE(libro_id, autor_id)
);
```

---

### 4. **clientes**
Tabla de clientes de la librería (distinto de usuarios).

```sql
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellidos text,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  codigo_postal text,
  provincia text,
  pais text DEFAULT 'España',
  nif text,
  notas text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

### 5. **pedidos**
Sistema de gestión de pedidos.

```sql
CREATE TABLE pedidos (
  id serial PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(user_id),
  cliente_id uuid REFERENCES clientes(id),
  fecha_pedido timestamptz DEFAULT now(),
  estado text DEFAULT 'pendiente',
  tipo text DEFAULT 'interno',
  subtotal numeric(10,2),
  iva numeric(10,2),
  total numeric(10,2),
  metodo_pago text,
  direccion_envio text,
  transportista text,
  tracking text,
  observaciones text,
  created_at timestamptz DEFAULT now()
);
```

**Estados de pedido:**
- `pendiente` - Pedido creado, pendiente de procesar
- `procesando` - En preparación
- `enviado` - Enviado al cliente
- `completado` - Entregado
- `cancelado` - Cancelado

**Tipos de pedido:**
- `interno` - Venta en tienda física
- `iberlibro` - Plataforma Iberlibro
- `conecta` - Plataforma Conecta
- `uniliber` - Plataforma Uniliber
- `libreros_de_viejo` - Plataforma Libreros de Viejo

---

### 6. **pedidos_detalles**
Detalle de items en cada pedido.

```sql
CREATE TABLE pedidos_detalles (
  id serial PRIMARY KEY,
  pedido_id integer REFERENCES pedidos(id) ON DELETE CASCADE,
  libro_id integer REFERENCES libros(id),
  cantidad integer NOT NULL,
  precio_unitario numeric(10,2) NOT NULL,
  subtotal numeric(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  created_at timestamptz DEFAULT now()
);
```

---

### 7. **facturas**
Sistema de facturación.

```sql
CREATE TABLE facturas (
  id serial PRIMARY KEY,
  pedido_id integer REFERENCES pedidos(id),
  cliente_id uuid REFERENCES clientes(id),
  numero_factura text UNIQUE NOT NULL,
  fecha timestamptz DEFAULT now(),
  subtotal numeric(10,2) NOT NULL,
  iva numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  tipo text DEFAULT 'normal',
  factura_original_id integer REFERENCES facturas(id),
  archivo_pdf text,
  archivo_xml text,
  anulada boolean DEFAULT false,
  motivo_anulacion text,
  created_at timestamptz DEFAULT now()
);
```

**Tipos de factura:**
- `normal` - Factura estándar
- `rectificativa` - Factura de corrección

---

### 8. **categorias**
Categorías de libros (puede ser jerárquica).

```sql
CREATE TABLE categorias (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  codigo text UNIQUE,
  parent_id integer REFERENCES categorias(id),
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

### 9. **editoriales**
Editoriales de los libros.

```sql
CREATE TABLE editoriales (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  direccion text,
  telefono text,
  created_at timestamptz DEFAULT now()
);
```

---

### 10. **ubicaciones**
Ubicaciones físicas en el almacén.

```sql
CREATE TABLE ubicaciones (
  id serial PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

### 11. **cart** (Carrito)
Carrito de compras temporal de usuarios.

```sql
CREATE TABLE cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id integer,
  quantity integer NOT NULL DEFAULT 1,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);
```

---

### 12. **wishlist** (Lista de deseos)
Lista de deseos de usuarios.

```sql
CREATE TABLE wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id integer,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);
```

---

### 13. **settings**
Configuración global del sistema.

```sql
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  category text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
```

**Categorías de configuración:**
- `company` - Datos de la empresa
- `billing` - Configuración de facturación
- `shipping` - Configuración de envíos
- `system` - Configuración del sistema
- `security` - Configuración de seguridad

---

## Seguridad y RLS

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Los permisos se basan en:

1. **Rol del usuario** (almacenado en tabla `usuarios`)
2. **Auth.uid()** de Supabase Auth
3. **Pertenencia** a recursos (ej: solo ver sus propios pedidos)

### Ejemplos de Políticas RLS

#### Política para libros (lectura pública)
```sql
CREATE POLICY "Public can read active books"
  ON libros FOR SELECT
  TO authenticated, anon
  USING (activo = true);
```

#### Política para pedidos (solo el creador)
```sql
CREATE POLICY "Users can view own orders"
  ON pedidos FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());
```

#### Política para admin (acceso completo)
```sql
CREATE POLICY "Admins have full access"
  ON libros FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.user_id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );
```

---

## Servicios Backend

Los servicios son módulos TypeScript que encapsulan la lógica de negocio y las llamadas a Supabase.

### Estructura de Servicios

```
src/services/
├── libroService.ts       - Gestión de libros
├── pedidoService.ts      - Gestión de pedidos
├── facturaService.ts     - Gestión de facturas
├── clienteService.ts     - Gestión de clientes
├── ubicacionService.ts   - Gestión de ubicaciones
├── cartService.ts        - Carrito de compras
├── wishlistService.ts    - Lista de deseos
├── settingsService.ts    - Configuraciones
└── backupService.ts      - Backups y exportación
```

### Ejemplo de Servicio: libroService.ts

```typescript
import { supabase } from '../lib/supabase';
import { Libro } from '../types';

export class LibroService {
  async getAll(): Promise<Libro[]> {
    const { data, error } = await supabase
      .from('libros')
      .select(`
        *,
        categoria:categorias(*),
        editorial:editoriales(*),
        autores:libros_autores(autor:autores(*))
      `)
      .eq('activo', true)
      .order('titulo');

    if (error) throw error;
    return data || [];
  }

  async getById(id: number): Promise<Libro | null> {
    const { data, error } = await supabase
      .from('libros')
      .select('*, categoria:categorias(*), editorial:editoriales(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(libro: Partial<Libro>): Promise<Libro> {
    const { data, error } = await supabase
      .from('libros')
      .insert(libro)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: number, libro: Partial<Libro>): Promise<Libro> {
    const { data, error } = await supabase
      .from('libros')
      .update(libro)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('libros')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const libroService = new LibroService();
```

---

## Migraciones

Las migraciones se encuentran en `supabase/migrations/` y deben ejecutarse en orden cronológico.

### Lista de Migraciones

| Archivo | Descripción |
|---------|-------------|
| `20251001144742_create_invoices_tables.sql` | Tablas de facturas |
| `20251001145918_update_invoice_policies.sql` | Políticas RLS para facturas |
| `20251001191609_create_complete_bookstore_schema.sql` | Esquema completo inicial |
| `20251002000000_fix_rls_circular_policies.sql` | Fix políticas circulares |
| `20251003000000_secure_rls_policies_final.sql` | Políticas RLS finales |
| `20251003100000_create_cart_table.sql` | Tabla carrito |
| `20251003110000_create_wishlist_table.sql` | Tabla wishlist |
| `20251004000000_create_clientes_table.sql` | Tabla clientes |
| `20251006000000_add_external_products_support.sql` | Soporte productos externos |
| `20251008000000_create_settings_table.sql` | Tabla configuraciones |
| `20251010000000_fix_function_security.sql` | Seguridad de funciones |
| `20251011000000_optimize_performance.sql` | Optimización de performance |
| `20251012000000_create_autores_table.sql` | Tabla de autores |
| `20251013000000_create_ubicaciones_table.sql` | Tabla de ubicaciones |

### Ejecutar Migraciones

Las migraciones deben ejecutarse en el **SQL Editor de Supabase**:

1. Ir a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Abrir **SQL Editor**
3. Copiar y pegar el contenido de cada migración en orden
4. Ejecutar cada una secuencialmente

---

## Configuración

### Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Opcional: Service Role Key (solo para scripts backend)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### Configuración de Settings

La tabla `settings` contiene configuraciones globales:

```typescript
// Ejemplo de configuración
{
  company: {
    name: 'Perez Galdos',
    address: 'Calle Hortaleza 5, 28004 Madrid, España',
    phone: '+34 91 531 26 40',
    email: 'libreria@perezgaldos.com',
    taxId: 'B12345678'
  },
  billing: {
    currency: 'EUR',
    taxRate: 21,
    invoicePrefix: 'FAC'
  },
  shipping: {
    freeShippingThreshold: 50,
    standardShippingCost: 5.99
  }
}
```

---

## Funciones y Triggers

### Auto-actualización de timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_libros_updated_at
  BEFORE UPDATE ON libros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Generación automática de número de factura

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  year text;
  count integer;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO count
  FROM facturas
  WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM NOW());

  RETURN 'FAC-' || year || '-' || LPAD((count + 1)::text, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## Mejores Prácticas

### 1. Seguridad
- ✅ Siempre usar RLS en todas las tablas
- ✅ Validar roles antes de operaciones críticas
- ✅ No exponer Service Role Key en frontend
- ✅ Usar anon key para operaciones públicas

### 2. Performance
- ✅ Crear índices en columnas de búsqueda frecuente
- ✅ Usar `select('campo1, campo2')` en vez de `select('*')`
- ✅ Limitar resultados con `.limit()`
- ✅ Usar paginación para listados grandes

### 3. Transacciones
```typescript
// Ejemplo de transacción
const { data, error } = await supabase.rpc('create_order_with_details', {
  order_data: orderData,
  items: orderItems
});
```

### 4. Manejo de Errores
```typescript
try {
  const { data, error } = await supabase
    .from('libros')
    .select('*');

  if (error) throw error;
  return data;
} catch (error) {
  console.error('Error fetching books:', error);
  throw error;
}
```

---

## Troubleshooting

### Error: "relation does not exist"
**Solución:** Ejecutar las migraciones faltantes en SQL Editor.

### Error: "permission denied for table"
**Solución:** Verificar políticas RLS y rol del usuario.

### Error: "new row violates row-level security policy"
**Solución:** Revisar las políticas WITH CHECK de la tabla.

---

## Contacto y Soporte

Para más información sobre la implementación del backend:
- Revisar archivos en `supabase/migrations/`
- Consultar `src/services/` para lógica de negocio
- Ver `src/types/index.ts` para definiciones de tipos

---

**Última actualización:** 2025-11-10
