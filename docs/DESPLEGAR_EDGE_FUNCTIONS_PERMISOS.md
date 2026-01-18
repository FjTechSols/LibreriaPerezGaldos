# Desplegar Edge Functions Actualizadas - Corrección Permisos

## Problema Resuelto

El error "Insufficient permission" en gestión de usuarios administrativos ha sido corregido.

### Causa del problema

Las Edge Functions (`admin-list-users`, `admin-delete-user`, `admin-update-password`) solo verificaban permisos en la tabla `usuarios_roles`, pero el sistema principal usa la tabla `usuarios` con el campo `rol_id`.

### Solución implementada

Las Edge Functions ahora verifican permisos en **ambas tablas**:
1. Primero verifica en `usuarios` (sistema principal)
2. Si no encuentra, verifica en `usuarios_roles` (sistema alternativo)

## Edge Functions Actualizadas

Las siguientes funciones han sido actualizadas:

1. **admin-list-users**
   - Ubicación: `supabase/functions/admin-list-users/index.ts`
   - Verifica permisos en ambas tablas
   - Obtiene roles de usuarios desde ambas tablas

2. **admin-delete-user**
   - Ubicación: `supabase/functions/admin-delete-user/index.ts`
   - Verifica permisos en ambas tablas

3. **admin-update-password**
   - Ubicación: `supabase/functions/admin-update-password/index.ts`
   - Verifica permisos en ambas tablas

## Cómo Desplegar

### Opción 1: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Edge Functions**
3. Para cada función:
   - Haz clic en la función
   - Haz clic en **Deploy new version**
   - Copia y pega el contenido del archivo actualizado
   - Haz clic en **Deploy**

### Opción 2: Usando CLI de Supabase (si tienes acceso)

```bash
# Desplegar todas las funciones
supabase functions deploy admin-list-users
supabase functions deploy admin-delete-user
supabase functions deploy admin-update-password

# O desplegar todas a la vez
supabase functions deploy
```

### Opción 3: Desde VS Code con extensión Supabase

1. Abre la extensión de Supabase en VS Code
2. Navega a Edge Functions
3. Haz clic derecho en cada función → Deploy

## Verificar que funciona

Después de desplegar:

1. Inicia sesión con tu cuenta fjtechsols
2. Ve a **Panel Admin** → **Gestión de Usuarios**
3. Deberías ver la lista de usuarios sin errores

## Roles Aceptados

Las Edge Functions aceptan estos roles con permisos administrativos:
- `admin`
- `webmaster`
- `super_admin`

Tu cuenta debe tener uno de estos roles asignados en la tabla `usuarios`.
