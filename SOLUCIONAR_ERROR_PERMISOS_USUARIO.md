# Solución al Error: Could not find function obtener_permisos_usuario

## Problema

Al iniciar la aplicación, aparece este error en la consola:

```
POST .../rpc/obtener_permisos_usuario 404 (Not Found)
Error: Could not find the function public.obtener_permisos_usuario(usuario_id) in the schema cache
```

## Causa

Las funciones RPC necesarias para el sistema de roles y permisos no están creadas en tu base de datos Supabase.

## Solución

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en **SQL Editor**
4. Haz clic en **New query**

### Paso 2: Ejecutar el Script de Creación de Funciones

1. Abre el archivo `CREAR_FUNCIONES_RPC_ROLES.sql` que se encuentra en la raíz del proyecto
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o presiona Ctrl/Cmd + Enter)

### Paso 3: Verificar que las Funciones se Crearon Correctamente

Ejecuta esta consulta para verificar:

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'obtener_permisos_usuario',
    'tiene_permiso',
    'obtener_rol_principal',
    'obtener_roles_usuario'
  )
ORDER BY routine_name;
```

Deberías ver 4 funciones listadas:

| routine_name | routine_type |
|--------------|--------------|
| obtener_permisos_usuario | FUNCTION |
| obtener_rol_principal | FUNCTION |
| obtener_roles_usuario | FUNCTION |
| tiene_permiso | FUNCTION |

### Paso 4: Probar la Aplicación

1. Recarga la aplicación (F5 o Ctrl/Cmd + R)
2. El error debería desaparecer de la consola
3. El sistema de permisos debería funcionar correctamente

## ¿Qué hacen estas funciones?

- **obtener_permisos_usuario**: Obtiene todos los permisos de un usuario basándose en sus roles
- **tiene_permiso**: Verifica si un usuario tiene un permiso específico
- **obtener_rol_principal**: Obtiene el rol de mayor jerarquía de un usuario
- **obtener_roles_usuario**: Lista todos los roles activos de un usuario

## Correcciones Aplicadas al Script

El script `CREAR_FUNCIONES_RPC_ROLES.sql` incluye las siguientes correcciones:

### 1. Agregado de Columnas a la Tabla Roles

El script agrega automáticamente las columnas necesarias si no existen:

- `display_name` (VARCHAR 100): Nombre amigable para mostrar
- `nivel_jerarquia` (INTEGER): Nivel jerárquico del rol (1 = mayor autoridad)

### 2. Conversión de Tipos de Datos

Las funciones usan `::TEXT` para convertir VARCHAR a TEXT y evitar conflictos de tipo:

```sql
SELECT r.nombre::TEXT, r.display_name::TEXT, r.nivel_jerarquia
```

### 3. Corrección de Columnas en Tabla Usuarios

El script usa `fecha_registro` en lugar de `created_at` para la tabla `usuarios`:

```sql
-- Correcto para tabla usuarios
u.fecha_registro

-- Correcto para tabla usuarios_roles
ur.created_at
```

## Problemas Comunes

### Error: "permission denied for schema public"

Si recibes este error, significa que no tienes permisos para crear funciones. Soluciones:

1. Asegúrate de estar usando una cuenta con permisos de administrador en Supabase
2. Contacta al administrador del proyecto para que ejecute el script

### Las funciones se crean pero el error persiste

1. Recarga completamente la página (Ctrl/Cmd + Shift + R)
2. Limpia el caché del navegador
3. Cierra sesión y vuelve a iniciar sesión

### Error: "function already exists"

Esto es normal si ya ejecutaste el script antes. Las funciones incluyen `DROP FUNCTION IF EXISTS` por lo que deberían actualizarse automáticamente.

## Verificación de Permisos

Si después de crear las funciones sigues teniendo problemas de permisos, verifica:

```sql
-- Ver tus roles asignados
SELECT
  u.email,
  r.nombre as rol,
  r.display_name,
  ur.activo
FROM auth.users u
LEFT JOIN usuarios_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.rol_id = r.id
WHERE u.email = 'tu-email@ejemplo.com';
```

Si no aparece ningún rol, necesitas asignar un rol siguiendo las instrucciones en `docs/SOLUCIONAR_ERROR_403_ADMIN.md`.

## Referencia

- Script SQL: `CREAR_FUNCIONES_RPC_ROLES.sql`
- Documentación de roles: `docs/SISTEMA_ROLES_PERMISOS.md`
- Guía de asignación de roles: `docs/SOLUCIONAR_ERROR_403_ADMIN.md`
