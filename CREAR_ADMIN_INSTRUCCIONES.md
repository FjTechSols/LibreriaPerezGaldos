# Instrucciones para Crear Usuario Administrador

## Cuenta de Administrador
- **Usuario**: PerezGaldosAdmin
- **Email**: admin@perezgaldos.es
- **Contraseña**: Galdos12345
- **Rol**: Administrador (rol_id: 1)

## Método 1: Usando el Dashboard de Supabase (Recomendado)

### Paso 1: Crear usuario en Authentication

1. Ir a [Supabase Dashboard](https://app.supabase.com)
2. Seleccionar tu proyecto
3. Navegar a: **Authentication** → **Users**
4. Clic en **Add User** (botón verde superior derecha)
5. Completar el formulario:
   - **Email**: `admin@perezgaldos.es`
   - **Password**: `Galdos12345`
   - **Auto Confirm User**: ✅ Activar (importante)
6. Clic en **Create User**
7. **Copiar el User ID (UUID)** que aparece en la lista

### Paso 2: Crear registro en tabla usuarios

1. Navegar a: **SQL Editor**
2. Clic en **New Query**
3. Pegar el siguiente SQL (reemplaza `TU_UUID_AQUI` con el UUID copiado):

```sql
-- Reemplazar TU_UUID_AQUI con el UUID del usuario creado
INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
VALUES (
  'TU_UUID_AQUI',  -- UUID del usuario de auth.users
  'PerezGaldosAdmin',
  'admin@perezgaldos.es',
  1,  -- rol_id 1 = admin
  true
);
```

4. Clic en **Run** para ejecutar
5. Verificar mensaje: "Success. No rows returned"

### Paso 3: Verificar

Ejecutar esta query para verificar:

```sql
SELECT
  u.id,
  u.username,
  u.email,
  u.rol_id,
  r.nombre as rol,
  u.activo
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE u.email = 'admin@perezgaldos.es';
```

Debe mostrar:
- username: PerezGaldosAdmin
- email: admin@perezgaldos.es
- rol_id: 1
- rol: admin
- activo: true

---

## Método 2: Usando SQL Editor Completo

Si prefieres hacerlo todo desde SQL Editor:

### Paso 1: Ejecutar el script completo

1. Navegar a: **SQL Editor**
2. Clic en **New Query**
3. Pegar este script:

```sql
-- Verificar si el usuario ya existe en auth.users
DO $$
DECLARE
  user_exists UUID;
  new_user_id UUID;
BEGIN
  -- Buscar usuario existente
  SELECT id INTO user_exists
  FROM auth.users
  WHERE email = 'admin@perezgaldos.es';

  IF user_exists IS NOT NULL THEN
    -- Usuario ya existe en auth.users, usar ese ID
    new_user_id := user_exists;
    RAISE NOTICE 'Usuario encontrado en auth.users con ID: %', new_user_id;
  ELSE
    -- Usuario no existe, debe crearse manualmente desde Dashboard
    RAISE EXCEPTION 'Usuario no encontrado. Por favor, créalo primero desde: Dashboard > Authentication > Users > Add User con email: admin@perezgaldos.es y password: Galdos12345';
  END IF;

  -- Crear o actualizar en tabla usuarios
  INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
  VALUES (
    new_user_id,
    'PerezGaldosAdmin',
    'admin@perezgaldos.es',
    1,
    true
  )
  ON CONFLICT (email)
  DO UPDATE SET
    username = 'PerezGaldosAdmin',
    rol_id = 1,
    activo = true,
    auth_user_id = new_user_id;

  RAISE NOTICE 'Usuario administrador creado/actualizado correctamente en tabla usuarios';
END $$;
```

4. Clic en **Run**

---

## Método 3: Usando la API de Supabase (Avanzado)

Desde Node.js o terminal con Supabase CLI:

```javascript
import { createClient } from '@supabase/supabase-js'

// Usar SERVICE_ROLE_KEY (no ANON_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function crearAdmin() {
  // 1. Crear usuario en auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@perezgaldos.es',
    password: 'Galdos12345',
    email_confirm: true
  })

  if (authError) {
    console.error('Error:', authError.message)
    return
  }

  console.log('Usuario creado en auth:', authData.user.id)

  // 2. Crear registro en tabla usuarios
  const { error: userError } = await supabase
    .from('usuarios')
    .insert({
      auth_user_id: authData.user.id,
      username: 'PerezGaldosAdmin',
      email: 'admin@perezgaldos.es',
      rol_id: 1,
      activo: true
    })

  if (userError) {
    console.error('Error creando usuario:', userError)
    return
  }

  console.log('✓ Usuario administrador creado correctamente')
}

crearAdmin()
```

---

## Solución de Problemas

### Error: "duplicate key value violates unique constraint"

El usuario ya existe. Ejecutar:

```sql
-- Ver usuario existente
SELECT * FROM usuarios WHERE email = 'admin@perezgaldos.es';

-- Actualizar a admin si existe
UPDATE usuarios
SET rol_id = 1, username = 'PerezGaldosAdmin', activo = true
WHERE email = 'admin@perezgaldos.es';
```

### Error: "new row violates row-level security policy"

Las políticas RLS están bloqueando. Ejecutar como superusuario o desactivar temporalmente:

```sql
-- Desactivar RLS temporalmente (solo para esta operación)
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Insertar usuario
INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
VALUES ('UUID_AQUI', 'PerezGaldosAdmin', 'admin@perezgaldos.es', 1, true);

-- Reactivar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

### No puedo crear usuario en auth.users desde SQL

**Solución**: Debes usar el Dashboard de Supabase o el Admin API. La creación de usuarios en `auth.users` requiere permisos especiales que no están disponibles en queries SQL normales.

1. Ve a Dashboard > Authentication > Users
2. Clic en "Add User"
3. Completa los datos
4. Luego ejecuta el SQL para crear en tabla `usuarios`

---

## Verificación Final

Una vez creado el usuario, verificar que todo funciona:

### 1. Verificar en base de datos

```sql
SELECT
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.rol_id,
  r.nombre as rol,
  u.activo,
  u.fecha_registro
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE u.email = 'admin@perezgaldos.es';
```

### 2. Verificar login en la aplicación

1. Abrir la aplicación: http://localhost:5173 (o tu URL)
2. Ir a página de Login
3. Ingresar:
   - Email: `admin@perezgaldos.es`
   - Contraseña: `Galdos12345`
4. Debe iniciar sesión correctamente
5. Verificar que aparece botón "Admin" en la barra de navegación
6. Clic en "Admin" debe llevar al Dashboard de Administrador

### 3. Verificar permisos

Una vez logueado como admin:

1. Debe poder acceder a: `/admin`
2. Debe ver el Panel de Administrador completo
3. Debe tener acceso a:
   - Inicio (estadísticas)
   - Catálogo (gestión de libros)
   - Facturas
   - Pedidos

---

## Seguridad

### Cambiar contraseña después del primer login

Es recomendable que el administrador cambie la contraseña después del primer login:

1. Desde la aplicación (implementar función de cambio de contraseña)
2. O desde SQL:

```sql
-- Nota: Supabase maneja las contraseñas de forma segura
-- No se pueden actualizar directamente en SQL
-- Usar la funcionalidad de "Reset Password" del Dashboard
```

### Mejores prácticas

- ✅ Usa una contraseña fuerte y única
- ✅ Cambia la contraseña periódicamente
- ✅ No compartas las credenciales de admin
- ✅ Considera implementar 2FA (autenticación de dos factores)
- ✅ Revisa los logs de acceso regularmente

---

## Siguiente Paso

Una vez creado el usuario administrador, puedes:

1. **Crear más usuarios**: Desde el Dashboard de Admin
2. **Importar datos**: Usar las migraciones y scripts de importación
3. **Configurar la aplicación**: Ajustar configuraciones según necesites

Para más información, consulta:
- `DOCUMENTACION_FACTURACION.md`
- `DOCUMENTACION_PEDIDOS.md`
- `MIGRACION_DATOS.md`
