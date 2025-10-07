# Configurar Supabase Real

## Problema Actual

La URL de Supabase actual (`https://0ec90b57d6e95fcbda19832f.supabase.co`) es una URL de prueba que no existe realmente. Por eso ves el error:

```
GET https://0ec90b57d6e95fcbda19832f.supabase.co/rest/v1/invoices
net::ERR_NAME_NOT_RESOLVED
```

**Estado actual**: La aplicación funciona en modo offline usando `localStorage`, pero sin persistencia real en base de datos.

---

## Solución: Crear Proyecto Supabase

### Paso 1: Crear cuenta gratuita

1. Ve a https://supabase.com
2. Haz clic en "Start your project"
3. Crea cuenta con:
   - GitHub (recomendado)
   - Google
   - Email

**Plan gratuito incluye**:
- 500 MB de almacenamiento
- 2 GB de transferencia
- 50,000 usuarios activos mensuales
- Suficiente para desarrollo y proyectos pequeños

---

### Paso 2: Crear nuevo proyecto

1. Una vez logueado, haz clic en **"New Project"**
2. Completa:
   - **Name**: `libreria-online` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Elige la más cercana a ti
   - **Pricing Plan**: Free

3. Haz clic en **"Create new project"**
4. Espera 1-2 minutos mientras Supabase crea tu base de datos

---

### Paso 3: Obtener credenciales

1. Una vez creado el proyecto, ve a **Settings** (icono de engranaje en la barra lateral)
2. Haz clic en **API** en el menú izquierdo
3. Verás dos valores importantes:

   **Project URL** (ejemplo):
   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **anon/public key** (ejemplo):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzQ1Njc4OX0.abc123...
   ```

---

### Paso 4: Actualizar archivo .env

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza las URL y key con tus credenciales reales:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
```

**IMPORTANTE**:
- NO compartas estas credenciales públicamente
- NO las subas a GitHub si tu repositorio es público
- El archivo `.env` ya está en `.gitignore`

---

### Paso 5: Aplicar migraciones

Una vez que tengas las credenciales configuradas, necesitas crear las tablas en tu base de datos.

#### Opción A: Desde Supabase Dashboard (Recomendado para principiantes)

1. Ve a tu proyecto en Supabase
2. Haz clic en **SQL Editor** en la barra lateral
3. Haz clic en **"+ New query"**
4. Copia y pega el contenido de estos archivos (en orden):

   **1. Esquema base:**
   ```bash
   supabase/migrations/20251001191609_create_complete_bookstore_schema.sql
   ```

   **2. Fix de políticas RLS:**
   ```bash
   supabase/migrations/20251002000000_fix_rls_circular_policies.sql
   ```

   **3. Políticas RLS finales:**
   ```bash
   supabase/migrations/20251003000000_secure_rls_policies_final.sql
   ```

   **4. Tabla de carrito:**
   ```bash
   supabase/migrations/20251003100000_create_cart_table.sql
   ```

   **5. Tabla de wishlist:**
   ```bash
   supabase/migrations/20251003110000_create_wishlist_table.sql
   ```

   **6. Tabla de clientes:**
   ```bash
   supabase/migrations/20251004000000_create_clientes_table.sql
   ```

   **7. Soporte para productos externos:**
   ```bash
   supabase/migrations/20251006000000_add_external_products_support.sql
   ```

   **8. Tablas de facturas:**
   ```bash
   supabase/migrations/20251001144742_create_invoices_tables.sql
   ```

   **9. Políticas de facturas:**
   ```bash
   supabase/migrations/20251001145918_update_invoice_policies.sql
   ```

5. Ejecuta cada script haciendo clic en **"Run"**
6. Verifica que no haya errores en la consola

#### Opción B: Usando Supabase CLI (Avanzado)

Si prefieres usar la línea de comandos:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto (usa el Project Ref de Supabase Dashboard)
supabase link --project-ref TU_PROJECT_REF

# Aplicar migraciones
supabase db push
```

---

### Paso 6: Verificar conexión

1. Recarga la aplicación
2. Abre la consola del navegador (F12)
3. Deberías ver:
   - ✅ `Session: null` o datos de sesión
   - ✅ No más errores `ERR_NAME_NOT_RESOLVED`
   - ✅ Las consultas a Supabase responden correctamente

---

## Crear Usuario Administrador

Una vez que la base de datos esté funcionando, necesitas crear un usuario admin:

### Opción 1: Desde SQL Editor

1. Ve a **SQL Editor** en Supabase Dashboard
2. Ejecuta:

```sql
-- Primero crea el usuario en auth.users
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
  'admin@example.com',
  crypt('tu_contraseña_aqui', gen_salt('bf')),
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

-- Guarda el ID que te devuelve, luego crea el registro en usuarios
-- Reemplaza 'EL_ID_DEL_PASO_ANTERIOR' con el UUID que obtuviste
INSERT INTO usuarios (auth_user_id, username, email, password_hash, rol_id, activo)
VALUES (
  'EL_ID_DEL_PASO_ANTERIOR',
  'admin',
  'admin@example.com',
  'hash_no_usado',
  1,
  true
);
```

### Opción 2: Desde Authentication UI

1. Ve a **Authentication** → **Users** en Supabase Dashboard
2. Haz clic en **"Add user"** → **"Create new user"**
3. Completa:
   - Email: `admin@example.com`
   - Password: tu contraseña
   - Auto Confirm: ✅ activado

4. Una vez creado, copia el UUID del usuario
5. Ve a **SQL Editor** y ejecuta:

```sql
INSERT INTO usuarios (auth_user_id, username, email, password_hash, rol_id, activo)
VALUES (
  'EL_UUID_DEL_USUARIO',
  'admin',
  'admin@example.com',
  'hash_no_usado',
  1,
  true
);
```

---

## Poblar Datos de Prueba

### Libros de ejemplo

El archivo `src/data/mockBooks.ts` contiene ~50 libros de prueba. Para importarlos a la base de datos:

1. Ve a **SQL Editor**
2. Ejecuta este script para insertar algunos libros de ejemplo:

```sql
-- Insertar categorías
INSERT INTO categorias (nombre) VALUES
('Ficción'), ('No Ficción'), ('Ciencia'), ('Tecnología'),
('Historia'), ('Fantasía'), ('Romance'), ('Misterio')
ON CONFLICT DO NOTHING;

-- Insertar editoriales
INSERT INTO editoriales (nombre) VALUES
('Penguin Random House'), ('HarperCollins'), ('Simon & Schuster'),
('Hachette'), ('Macmillan'), ('Planeta')
ON CONFLICT DO NOTHING;

-- Insertar libros de ejemplo
INSERT INTO libros (
  titulo, isbn, autor, editorial_id, categoria_id,
  precio, stock, descripcion, portada, activo
) VALUES
(
  'Cien años de soledad',
  '978-0307474728',
  'Gabriel García Márquez',
  1,
  1,
  24.99,
  50,
  'La obra maestra del realismo mágico',
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
  true
),
(
  '1984',
  '978-0451524935',
  'George Orwell',
  2,
  1,
  19.99,
  30,
  'Una distopía clásica sobre el totalitarismo',
  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e',
  true
);
-- Añade más libros según necesites
```

---

## Solución de Problemas

### Error: "No rows found"

**Causa**: Las tablas existen pero están vacías.

**Solución**: Poblar datos de prueba (ver sección anterior)

### Error: "permission denied for table usuarios"

**Causa**: Las políticas RLS están bloqueando el acceso.

**Solución**: Verificar que las migraciones de RLS se aplicaron correctamente.

### Error: "relation 'libros' does not exist"

**Causa**: Las migraciones no se aplicaron.

**Solución**: Ejecutar todas las migraciones en orden (ver Paso 5)

### Error: "JWT expired"

**Causa**: El token de autenticación expiró.

**Solución**: Cerrar sesión y volver a iniciar sesión.

---

## Modo Desarrollo Local vs Producción

### Desarrollo Local
- Usa las credenciales del proyecto de Supabase
- Mantén el `.env` en `.gitignore`
- Datos de prueba y experimentación

### Producción
- Crea un proyecto Supabase separado para producción
- Usa variables de entorno del hosting (Vercel, Netlify, etc.)
- Configura backups automáticos en Supabase
- Considera upgrade a plan Pro para mayor capacidad

---

## Recursos Adicionales

- 📚 [Documentación oficial de Supabase](https://supabase.com/docs)
- 🎥 [Tutoriales en video](https://www.youtube.com/@Supabase)
- 💬 [Discord de Supabase](https://discord.supabase.com)
- 🐛 [Reporte de bugs](https://github.com/supabase/supabase/issues)

---

## Siguiente Paso

Una vez configurado Supabase:

1. ✅ Verifica que no hay errores en consola
2. ✅ Intenta registrar un usuario
3. ✅ Intenta crear un pedido
4. ✅ Verifica que los datos persisten en Supabase Dashboard
5. ✅ Conecta el catálogo de libros a la base de datos (ver `docs/ESTADO_CONEXION_BACKEND.md`)
