# Configurar Reset de Contraseña en Supabase

## Problema
Cuando el usuario recibe el email de reseteo de contraseña, el enlace lo redirige al inicio en lugar de a la página de cambio de contraseña.

## Solución

### Paso 1: Configurar Redirect URLs en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)

2. En el menú lateral, ve a **Authentication** → **URL Configuration**

3. En la sección **Redirect URLs**, agrega las siguientes URLs:

   **Para Producción:**
   ```
   https://perezgaldos.bolt.host/reset-password
   https://perezgaldos.bolt.host/**
   ```

   **Para Desarrollo (opcional):**
   ```
   http://localhost:5173/reset-password
   http://localhost:5173/**
   ```

4. En **Site URL**, asegúrate de que esté configurada como:
   ```
   https://perezgaldos.bolt.host
   ```

5. Click en **Save** para guardar los cambios

### Paso 2: Verificar Email Templates (Opcional)

1. Ve a **Authentication** → **Email Templates**

2. Busca el template **Reset Password**

3. Verifica que el contenido incluya algo como:
   ```html
   <a href="{{ .ConfirmationURL }}">Restablecer Contraseña</a>
   ```

4. El `{{ .ConfirmationURL }}` debería apuntar automáticamente a la URL configurada

### Paso 3: Probar el Flujo

1. Ve a `https://perezgaldos.bolt.host/recuperar`

2. Ingresa un email válido registrado en el sistema

3. Revisa el email recibido

4. Click en el enlace del email

5. Deberías ser redirigido a `https://perezgaldos.bolt.host/reset-password` con los tokens en el hash de la URL

6. La página debe mostrar el formulario para cambiar la contraseña

7. Ingresa la nueva contraseña y confirma

8. Deberías ver el mensaje de éxito y ser redirigido al login

## Cómo Funciona

1. **Usuario solicita reset**: En `/recuperar`, el usuario ingresa su email

2. **Supabase envía email**: Se envía un email con un enlace que incluye:
   - `access_token`
   - `refresh_token`
   - `type=recovery`

3. **Usuario hace click**: El enlace redirige a `/reset-password#access_token=xxx&type=recovery&...`

4. **Página procesa tokens**: El componente `ResetPassword` detecta los tokens en el hash y los usa para establecer la sesión

5. **Usuario cambia contraseña**: Con la sesión válida, el usuario puede actualizar su contraseña

6. **Redirección al login**: Después de cambiar la contraseña exitosamente, se redirige al usuario a `/login`

## Solución de Problemas

### El enlace redirige al home

**Causa**: La URL de redirección no está configurada en Supabase

**Solución**: Sigue el Paso 1 para agregar las URLs permitidas

### Error "Enlace inválido o expirado"

**Causa**: El token ha expirado (después de 1 hora) o ya fue usado

**Solución**: Solicita un nuevo enlace desde `/recuperar`

### El email no llega

**Causa**: Configuración de email en Supabase o el email está en spam

**Solución**:
- Revisa la carpeta de spam
- Verifica la configuración de Email en Supabase Dashboard → Project Settings → Auth → Email

### Wildcard URLs

Las URLs con `**` son wildcards que permiten cualquier ruta en ese dominio. Esto es útil para permitir múltiples rutas de redirección sin tener que agregar cada una manualmente.

## Notas Importantes

- Los enlaces de reset de contraseña expiran en **1 hora**
- Cada enlace solo puede usarse **una vez**
- Después de cambiar la contraseña, el usuario debe iniciar sesión nuevamente
- El código ya maneja automáticamente los tokens del hash de la URL
