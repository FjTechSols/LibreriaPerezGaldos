# Solución al Error 403 en Gestión de Usuarios

## Problema
Al intentar acceder a la gestión de usuarios, recibes un error 403 (Forbidden) desde la edge function `admin-list-users`.

## Causa
La edge function verifica que el usuario tenga rol de "admin", "webmaster" o "super_admin" en la tabla `usuarios_roles`, pero tu usuario no tiene estos roles asignados.

## Solución

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **SQL Editor**
4. Haz clic en **New query**

### Paso 2: Obtener tu User ID

Ejecuta esta consulta para ver tu ID de usuario:

```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'tu-email@ejemplo.com';
```

Reemplaza `'tu-email@ejemplo.com'` con el email que usas para iniciar sesión.

**Copia el `id` que aparece en el resultado.**

### Paso 3: Verificar que existe el rol admin

Ejecuta esta consulta:

```sql
SELECT id, nombre, display_name, nivel_jerarquia
FROM roles
WHERE nombre IN ('admin', 'webmaster');
```

Si no aparece ningún resultado, primero necesitas crear los roles básicos ejecutando:

```sql
-- Crear roles básicos si no existen
INSERT INTO roles (nombre, display_name, descripcion, nivel_jerarquia, activo, es_sistema)
VALUES
  ('webmaster', 'Webmaster', 'Acceso total al sistema', 1, true, true),
  ('admin', 'Administrador', 'Acceso administrativo completo', 2, true, true),
  ('empleado', 'Empleado', 'Acceso para gestión de inventario', 3, true, true),
  ('cliente', 'Cliente', 'Acceso básico para clientes', 4, true, true)
ON CONFLICT (nombre) DO NOTHING;
```

### Paso 4: Asignar el rol admin

Una vez que tengas tu `user_id` y confirmes que existe el rol admin, ejecuta:

```sql
DO $$
DECLARE
  v_user_id uuid := 'PEGA-AQUI-TU-USER-ID'; -- Reemplaza con tu user_id del Paso 2
  v_rol_admin_id uuid;
BEGIN
  -- Obtener el ID del rol admin
  SELECT id INTO v_rol_admin_id
  FROM roles
  WHERE nombre = 'admin'
  LIMIT 1;

  IF v_rol_admin_id IS NULL THEN
    RAISE EXCEPTION 'Rol admin no encontrado';
  END IF;

  -- Asignar el rol admin
  INSERT INTO usuarios_roles (user_id, rol_id, activo)
  VALUES (v_user_id, v_rol_admin_id, true)
  ON CONFLICT (user_id, rol_id)
  DO UPDATE SET activo = true;

  RAISE NOTICE 'Rol admin asignado exitosamente';
END $$;
```

**IMPORTANTE:** Reemplaza `'PEGA-AQUI-TU-USER-ID'` con el UUID que copiaste en el Paso 2.

### Paso 5: Verificar la asignación

Confirma que el rol se asignó correctamente:

```sql
SELECT
  u.email,
  r.nombre as rol,
  r.display_name,
  ur.activo
FROM auth.users u
JOIN usuarios_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'tu-email@ejemplo.com';
```

Deberías ver algo como:

| email | rol | display_name | activo |
|-------|-----|--------------|--------|
| tu-email@ejemplo.com | admin | Administrador | true |

### Paso 6: Probar

1. Cierra sesión en la aplicación
2. Vuelve a iniciar sesión
3. Intenta acceder a la gestión de usuarios
4. El error 403 debería desaparecer

## Verificación de permisos

Si el problema persiste, verifica los permisos RLS de las tablas:

```sql
-- Verificar políticas de usuarios_roles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('usuarios_roles', 'roles');
```

## Problemas comunes

### Error: "Usuario no encontrado"
- Verifica que el email sea exactamente el mismo con el que inicias sesión
- Asegúrate de estar buscando en `auth.users` y no en otra tabla

### Error: "Rol admin no encontrado"
- Ejecuta primero la consulta del Paso 3 para crear los roles básicos

### El rol se asigna pero sigue dando error 403
- Cierra sesión completamente y vuelve a iniciar sesión
- Verifica que `activo = true` en la tabla `usuarios_roles`
- Revisa los logs de la edge function en el Dashboard de Supabase

## Contacto

Si después de seguir estos pasos el problema persiste, revisa los logs de la edge function en:
Dashboard → Edge Functions → admin-list-users → Logs
