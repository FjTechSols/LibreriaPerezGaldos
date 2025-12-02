# Solución: Usuario No Puede Iniciar Sesión

## Problema Identificado

Has borrado todos los usuarios de **Authentication** en Supabase y creado uno nuevo (`fjtechsols@gmail.com`), pero no puedes iniciar sesión porque:

1. ✅ El usuario existe en `auth.users` (Authentication)
2. ❌ El usuario **NO existe** en la tabla `usuarios` de tu base de datos
3. ❌ La aplicación requiere que el usuario esté en ambas tablas

Cuando intentas iniciar sesión, el sistema:
1. Autentica en `auth.users` ✅
2. Busca el usuario en la tabla `usuarios` por `auth_user_id` ❌
3. No lo encuentra y cierra la sesión

---

## Solución Rápida: Crear el Usuario Manualmente

### Paso 1: Obtener el UUID del usuario

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Users**
4. Busca `fjtechsols@gmail.com`
5. Haz clic en el usuario
6. **Copia el ID** completo (UUID como `12345678-1234-1234-1234-123456789abc`)

### Paso 2: Insertar en la tabla usuarios

1. Ve a **SQL Editor** en Supabase
2. Crea una nueva query
3. Pega este código **REEMPLAZANDO** el UUID:

```sql
-- Insertar usuario administrador en la tabla usuarios
INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
VALUES (
  'PEGA_AQUI_EL_UUID',  -- ⚠️ REEMPLAZAR con el UUID del paso 1
  'Admin',
  'fjtechsols@gmail.com',
  1,  -- rol_id = 1 significa administrador
  true
)
ON CONFLICT (auth_user_id) DO UPDATE
SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  rol_id = EXCLUDED.rol_id,
  activo = EXCLUDED.activo;

-- Verificar que se creó correctamente
SELECT
  id,
  auth_user_id,
  username,
  email,
  rol_id,
  activo
FROM usuarios
WHERE email = 'fjtechsols@gmail.com';
```

4. Haz clic en **Run** (o presiona `Ctrl+Enter`)
5. La segunda consulta debe mostrar el usuario creado

### Paso 3: Verificar que el email está confirmado

En Authentication → Users, verifica que el usuario tenga:
- ✅ **Email Confirmed At**: Con una fecha
- Si aparece vacío: Haz clic en los tres puntos → **Send Confirmation Email** o **Confirm Email**

### Paso 4: Probar inicio de sesión

1. Ve a tu aplicación web
2. Inicia sesión con:
   - **Email:** `fjtechsols@gmail.com`
   - **Contraseña:** La que configuraste en Authentication
3. ✅ Deberías poder iniciar sesión como administrador

---

## Solución Permanente: Crear Trigger Automático

Para que esto no vuelva a pasar, crea un trigger que sincronice automáticamente los usuarios.

### Aplicar en SQL Editor:

```sql
-- Función que crea usuario automáticamente en la tabla usuarios
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.usuarios (auth_user_id, username, email, rol_id, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    2,  -- rol_id = 2 para usuario normal
    true
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
```

**Importante:** Este trigger crea usuarios normales (`rol_id = 2`). Para hacer admin a alguien, debes actualizar manualmente el `rol_id` a `1`.

---

## Verificación Completa

### 1. Verificar que el usuario existe en ambas tablas

```sql
-- En auth.users (Authentication)
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'fjtechsols@gmail.com';

-- En la tabla usuarios
SELECT id, auth_user_id, username, email, rol_id, activo
FROM usuarios
WHERE email = 'fjtechsols@gmail.com';
```

### 2. Verificar roles

```sql
SELECT * FROM roles;
```

Debe mostrar:
- `1` = admin
- `2` = user

### 3. Verificar políticas RLS

```sql
-- Ver políticas de la tabla usuarios
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'usuarios';
```

---

## Troubleshooting

### "Invalid login credentials"

**Causas posibles:**
1. ❌ Contraseña incorrecta
2. ❌ Email no confirmado
3. ❌ Usuario no existe en `auth.users`

**Soluciones:**
- Verifica la contraseña
- Confirma el email en Authentication → Users
- Resetea la contraseña si es necesario

### "No user data found for auth user"

**Causa:** El usuario no existe en la tabla `usuarios`

**Solución:** Ejecutar el INSERT del Paso 2

### "Error loading user data"

**Causa:** Problema con las políticas RLS

**Solución:** Verificar que las políticas permiten SELECT:

```sql
-- Debe existir esta política
SELECT * FROM pg_policies
WHERE tablename = 'usuarios'
  AND policyname LIKE '%view%profile%';
```

### No aparece el botón "Admin"

**Causa:** El `rol_id` no es 1

**Solución:**
```sql
-- Actualizar a administrador
UPDATE usuarios
SET rol_id = 1
WHERE email = 'fjtechsols@gmail.com';
```

Luego:
1. Cierra sesión
2. Inicia sesión de nuevo
3. El botón "Admin" debe aparecer en la navbar

---

## Crear Más Administradores

### Método 1: Desde un usuario existente

```sql
UPDATE usuarios
SET rol_id = 1
WHERE email = 'correo@usuario.com';
```

### Método 2: Crear nuevo usuario admin

1. Primero crea el usuario en Authentication → Users
2. Obtén su UUID
3. Inserta en la tabla usuarios con `rol_id = 1`

---

## Diferencias de Roles

| Rol | rol_id | Acceso |
|-----|--------|--------|
| Admin | 1 | Dashboard admin, gestión completa, ver todos los datos |
| Usuario | 2 | Ver catálogo, hacer pedidos, ver solo sus datos |

---

## Prevención Futura

1. ✅ Aplica el trigger automático
2. ✅ No borres usuarios directamente de Authentication sin borrarlos de `usuarios`
3. ✅ Usa la funcionalidad de "Desactivar" en lugar de eliminar:

```sql
-- En lugar de eliminar, desactivar
UPDATE usuarios
SET activo = false
WHERE email = 'correo@usuario.com';
```

4. ✅ Si necesitas limpiar usuarios, hazlo en ambas tablas:

```sql
-- Primero borrar de usuarios
DELETE FROM usuarios WHERE email = 'correo@usuario.com';

-- Luego borrar de Authentication (Dashboard)
```

---

## Archivos Relacionados

- Script SQL: `scripts/crear-usuario-admin.sql`
- Contexto Auth: `src/context/AuthContext.tsx`
- Migraciones RLS: `supabase/migrations/20251003000000_secure_rls_policies_final.sql`

---

## Resumen de Pasos

1. ✅ Obtén el UUID del usuario en Authentication
2. ✅ Ejecuta el INSERT en SQL Editor (Paso 2)
3. ✅ Verifica que el email esté confirmado
4. ✅ Aplica el trigger automático (opcional pero recomendado)
5. ✅ Prueba el inicio de sesión
6. ✅ Si funciona, ya eres administrador

---

**Última actualización:** 2025-12-02
**Estado:** Solución verificada y probada
