# Desplegar Edge Functions de Administración

## Problema Resuelto

El error 403 "User not allowed" ocurría porque la aplicación intentaba usar métodos de administración de Supabase (`auth.admin.*`) desde el frontend con la clave anónima (ANON_KEY).

**Estos métodos requieren la SERVICE_ROLE_KEY**, que nunca debe exponerse en el frontend por seguridad.

## Solución Implementada

Se crearon 3 Edge Functions de Supabase que manejan las operaciones de administración de forma segura en el servidor:

1. **admin-list-users**: Lista todos los usuarios con sus roles
2. **admin-delete-user**: Elimina un usuario
3. **admin-update-password**: Actualiza la contraseña de un usuario

## Archivos Creados

- `/supabase/functions/admin-list-users/index.ts`
- `/supabase/functions/admin-delete-user/index.ts`
- `/supabase/functions/admin-update-password/index.ts`

## Archivos Modificados

- `/src/services/rolesService.ts`: Actualizado para llamar a las Edge Functions en lugar de usar `auth.admin` directamente

## Características de Seguridad

Todas las Edge Functions incluyen:

- Verificación de autenticación del usuario solicitante
- Verificación de rol admin/webmaster
- Validación de parámetros
- Protección contra auto-eliminación (no puedes eliminar tu propia cuenta)
- Headers CORS correctos
- Manejo de errores completo

## Cómo Desplegar

Las Edge Functions ya están creadas en tu proyecto local. Para desplegarlas a Supabase:

### Opción 1: Despliegue Automático (Recomendado)

Si tu proyecto está conectado a Vercel o GitHub, las Edge Functions se desplegarán automáticamente cuando hagas push de los cambios.

### Opción 2: Despliegue Manual con Supabase CLI

Si tienes instalado Supabase CLI:

```bash
# Desplegar todas las funciones
supabase functions deploy admin-list-users
supabase functions deploy admin-delete-user
supabase functions deploy admin-update-password
```

### Opción 3: Despliegue desde Dashboard de Supabase

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Navega a Edge Functions
3. Sube cada función manualmente desde los archivos creados

## Variables de Entorno

Las Edge Functions usan automáticamente estas variables que ya están configuradas en Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo disponible en el servidor)
- `SUPABASE_ANON_KEY`

No necesitas configurar nada adicional.

## Probar las Funciones

Una vez desplegadas, puedes probar desde el Dashboard de Supabase o desde tu aplicación:

1. Inicia sesión como usuario admin/webmaster
2. Ve a la sección de Gestión de Usuarios
3. Las operaciones de listar, eliminar y cambiar contraseña ahora funcionarán correctamente

## Endpoints de las Edge Functions

```
GET  {SUPABASE_URL}/functions/v1/admin-list-users
POST {SUPABASE_URL}/functions/v1/admin-delete-user
POST {SUPABASE_URL}/functions/v1/admin-update-password
```

Todos requieren el header `Authorization: Bearer {token}` con el token de sesión del usuario.

## Notas Importantes

- Las Edge Functions solo funcionan con usuarios que tienen rol `admin` o `webmaster`
- El token de sesión del usuario autenticado se envía automáticamente desde el frontend
- La SERVICE_ROLE_KEY nunca se expone al frontend, permanece segura en el servidor
- Los usuarios no pueden eliminar su propia cuenta (protección incluida)
