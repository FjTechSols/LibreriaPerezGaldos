# Cómo Vincular Bolt Database a Tu Aplicación

## Estado Actual

Tu proyecto ya tiene una **Bolt Database** configurada automáticamente. Sin embargo, actualmente hay un problema de conexión con las herramientas de administración de base de datos.

**Modo actual**: La aplicación funciona en **Modo Demo** con autenticación local.

---

## ¿Qué es Bolt Database?

Bolt Database es una instancia de **Supabase** (PostgreSQL) que Bolt.new provisiona automáticamente para tu proyecto. Es completamente funcional y gratuita mientras usas Bolt.new.

**Ventajas**:
- ✅ Configuración automática (ya está lista)
- ✅ No requiere cuenta de Supabase separada
- ✅ Funciona dentro del entorno de Bolt
- ✅ Ideal para desarrollo y prototipos

**Limitaciones**:
- ⚠️ Los datos se pierden si reinicias el proyecto
- ⚠️ Solo disponible mientras el proyecto esté abierto en Bolt
- ⚠️ No es adecuado para producción

---

## Cómo Funciona en Bolt

### Antes (cuando funcionaba)

Bolt exponía las credenciales de la base de datos como variables de entorno del sistema:
```bash
SUPABASE_URL=https://proyecto-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

Tu aplicación las usaba automáticamente mediante:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### Ahora (problema temporal)

Las herramientas MCP de Supabase no están disponibles temporalmente, devolviendo:
```
Error: "A database is already setup for this project"
```

Esto significa que la base de datos existe, pero no podemos acceder a las credenciales o administrarla mediante las herramientas habituales.

---

## Solución: Modo Demo

He configurado la aplicación para que funcione completamente en **Modo Demo** mientras se resuelve el problema:

### Credenciales de Demo

**Administrador:**
```
Email: admin@admin.com
Password: admin
```

**Usuario Normal:**
```
Email: user@user.com
Password: user
```

### ¿Qué funciona en Modo Demo?

✅ **Login/Logout**: Autenticación local sin base de datos
✅ **Persistencia de sesión**: Usa `localStorage`
✅ **Carrito de compras**: Se guarda localmente
✅ **Lista de deseos**: Se guarda localmente
✅ **Navegación**: Todas las páginas funcionan
✅ **Roles**: Admin vs Usuario normal

❌ **NO funciona**:
- Registro de nuevos usuarios (base de datos requerida)
- Consultas de libros desde DB (usa datos mock)
- Pedidos reales (solo simulación)
- Facturas persistentes (solo locales)

---

## Opciones para Vincular Base de Datos Real

### Opción 1: Esperar a que Bolt arregle la conexión

Bolt.new está trabajando en solucionar el problema de las herramientas MCP. Una vez arreglado:

1. Las variables de entorno se poblarán automáticamente
2. Podrás usar las herramientas `mcp__supabase__*`
3. Aplicar migraciones desde el chat
4. La app se conectará automáticamente

**Ventaja**: Cero configuración
**Desventaja**: Tienes que esperar

---

### Opción 2: Usar tu propia cuenta de Supabase (Recomendado)

Esta es la **mejor opción** para desarrollo serio:

#### Paso 1: Crear proyecto en Supabase

1. Ve a https://supabase.com
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto:
   - **Name**: `libreria-online-bolt`
   - **Database Password**: Genera una fuerte (guárdala)
   - **Region**: Más cercana a ti
   - **Plan**: Free (500MB, suficiente para desarrollo)

4. Espera 1-2 minutos a que se cree

#### Paso 2: Obtener credenciales

1. Ve a **Settings** → **API** en Supabase Dashboard
2. Copia estos valores:

   **Project URL** (ejemplo):
   ```
   https://abcdefghijkl.supabase.co
   ```

   **anon/public key** (ejemplo):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjk...
   ```

#### Paso 3: Actualizar .env en Bolt

Actualiza el archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_COMPLETA_AQUI
```

**IMPORTANTE**:
- Reemplaza con tus credenciales reales
- No compartas estas credenciales públicamente

#### Paso 4: Aplicar migraciones

En el **SQL Editor** de Supabase Dashboard, ejecuta estos scripts en orden:

**1. Esquema base** (`supabase/migrations/20251001191609_create_complete_bookstore_schema.sql`)
- Crea todas las tablas principales
- Define relaciones y restricciones

**2. Fix RLS circular** (`supabase/migrations/20251002000000_fix_rls_circular_policies.sql`)
- Corrige políticas de seguridad

**3. RLS final** (`supabase/migrations/20251003000000_secure_rls_policies_final.sql`)
- Establece políticas de seguridad definitivas

**4. Carrito** (`supabase/migrations/20251003100000_create_cart_table.sql`)
- Tabla del carrito de compras

**5. Wishlist** (`supabase/migrations/20251003110000_create_wishlist_table.sql`)
- Tabla de lista de deseos

**6. Clientes** (`supabase/migrations/20251004000000_create_clientes_table.sql`)
- Tabla de clientes

**7. Productos externos** (`supabase/migrations/20251006000000_add_external_products_support.sql`)
- Soporte para productos externos

**8. Facturas** (`supabase/migrations/20251001144742_create_invoices_tables.sql`)
- Tablas de facturas

**9. Políticas facturas** (`supabase/migrations/20251001145918_update_invoice_policies.sql`)
- Políticas RLS de facturas

Para cada script:
1. Abre el archivo de migración
2. Copia todo el contenido
3. Pega en SQL Editor de Supabase
4. Haz clic en **"Run"**
5. Verifica que no hay errores

#### Paso 5: Crear usuario admin

Una vez aplicadas las migraciones, crea un usuario administrador:

**Método A: Desde SQL Editor**

```sql
-- Crear usuario en auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@tuempresa.com',
  crypt('tu_contraseña_segura', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- GUARDA EL UUID QUE DEVUELVE, luego:

-- Crear registro en usuarios
INSERT INTO usuarios (auth_user_id, username, email, password_hash, rol_id, activo)
VALUES (
  'EL-UUID-DEL-PASO-ANTERIOR',
  'admin',
  'admin@tuempresa.com',
  'no_usado',
  1,  -- rol_id 1 = admin
  true
);
```

**Método B: Desde UI de Supabase**

1. Ve a **Authentication** → **Users**
2. Clic en **"Add user"** → **"Create new user"**
3. Completa:
   - Email: `admin@tuempresa.com`
   - Password: contraseña segura
   - **Auto Confirm User**: ✅ MARCAR ESTO
   - **Email Confirm**: ✅ MARCAR ESTO

4. Copia el UUID del usuario creado
5. En SQL Editor ejecuta:

```sql
INSERT INTO usuarios (auth_user_id, username, email, password_hash, rol_id, activo)
VALUES (
  'UUID-DEL-USUARIO',
  'admin',
  'admin@tuempresa.com',
  'no_usado',
  1,
  true
);
```

#### Paso 6: Poblar datos de prueba

Inserta algunos libros de ejemplo:

```sql
-- Categorías
INSERT INTO categorias (id, nombre) VALUES
(1, 'Ficción'),
(2, 'No Ficción'),
(3, 'Tecnología'),
(4, 'Ciencia')
ON CONFLICT (id) DO NOTHING;

-- Editoriales
INSERT INTO editoriales (id, nombre) VALUES
(1, 'Penguin Random House'),
(2, 'HarperCollins')
ON CONFLICT (id) DO NOTHING;

-- Libros
INSERT INTO libros (titulo, isbn, autor, editorial_id, categoria_id, precio, stock, descripcion, portada, activo) VALUES
('1984', '978-0451524935', 'George Orwell', 1, 1, 19.99, 50, 'Novela distópica clásica', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', true),
('Sapiens', '978-0062316097', 'Yuval Noah Harari', 2, 2, 24.99, 30, 'Historia de la humanidad', 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400', true);
```

#### Paso 7: Verificar conexión

1. Recarga la aplicación en Bolt
2. Abre la consola del navegador (F12)
3. Deberías ver:
   ```
   Supabase config: { url: "https://tu-proyecto.supabase.co", hasKey: true }
   ```

4. Intenta hacer login con el usuario admin que creaste
5. Si funciona, ¡felicidades! Estás conectado a Supabase real

---

### Opción 3: Usar Supabase Local (Avanzado)

Si tienes Docker instalado localmente (no en Bolt):

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
supabase init
supabase start

# Aplicar migraciones
supabase db reset

# Las credenciales locales se mostrarán en la terminal
```

Luego actualiza `.env` con las credenciales locales (usualmente `http://localhost:54321`).

---

## Comparación de Opciones

| Característica | Bolt DB | Supabase Personal | Supabase Local |
|---|---|---|---|
| **Configuración** | Automática | Manual (15 min) | Manual (30 min) |
| **Persistencia** | Temporal | Permanente | Local |
| **Requisitos** | Ninguno | Cuenta gratuita | Docker |
| **Mejor para** | Prototipos rápidos | Desarrollo serio | Desarrollo offline |
| **Costo** | Gratis | Gratis (con límites) | Gratis |

---

## Recomendación Final

**Para desarrollo serio**: Usa **Opción 2 (Supabase Personal)**

**Por qué**:
- ✅ Datos persistentes
- ✅ Acceso desde cualquier lugar
- ✅ Dashboard visual para administrar
- ✅ Backups automáticos
- ✅ Plan gratuito generoso
- ✅ Fácil migrar a producción

El modo demo actual está bien para probar la UI, pero para trabajar con datos reales necesitas una base de datos real.

---

## Troubleshooting

### Error: "Invalid API key"

**Causa**: Credenciales incorrectas en `.env`

**Solución**: Verifica que copiaste la **anon key** completa desde Supabase Dashboard

### Error: "relation 'usuarios' does not exist"

**Causa**: Migraciones no aplicadas

**Solución**: Ejecuta todos los scripts de migración en orden

### Login no funciona después de configurar Supabase

**Causa**: No existe usuario en la tabla `usuarios`

**Solución**: Crea el usuario admin usando el método del Paso 5

### "Row Level Security policy violation"

**Causa**: Políticas RLS muy restrictivas

**Solución**: Verifica que las migraciones RLS se aplicaron correctamente

---

## Próximos Pasos

Una vez que tengas Supabase configurado:

1. ✅ Prueba el login con usuario real
2. ✅ Crea algunos libros de prueba
3. ✅ Prueba agregar al carrito
4. ✅ Crea un pedido de prueba
5. ✅ Verifica que los datos persisten en Supabase Dashboard

---

## Recursos Adicionales

- 📚 [Documentación de Supabase](https://supabase.com/docs)
- 🎥 [Tutoriales en video](https://www.youtube.com/@Supabase)
- 💬 [Discord de Supabase](https://discord.supabase.com)
- 🔧 [Supabase CLI](https://supabase.com/docs/guides/cli)
