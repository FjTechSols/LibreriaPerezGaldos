# ⚠️ PROBLEMA ACTUAL: Aplicación Se Queda Cargando

## 🔍 Diagnóstico

La aplicación se queda cargando infinitamente debido a **políticas RLS circulares** en Supabase.

**Causa:**
- Las políticas RLS de la tabla `usuarios` hacen SELECT en la misma tabla `usuarios` para verificar roles
- Esto crea un loop infinito que bloquea la carga de la aplicación

**Síntoma:**
- Pantalla "Cargando..." que nunca termina
- No se puede hacer login ni registro
- La aplicación parece congelada

---

## ✅ SOLUCIÓN: Aplicar Migración SQL

He creado una migración que corrige este problema. Necesitas aplicarla en Supabase.

### Archivo de Migración

📄 `supabase/migrations/20251002000000_fix_rls_circular_policies.sql`

### Cómo Aplicar la Migración

Dado que el proyecto Supabase (`0ec90b57d6e95fcbda19832f`) es manejado por Bolt, **pídele al asistente de Bolt**:

```
"Aplica la migración supabase/migrations/20251002000000_fix_rls_circular_policies.sql en Supabase"
```

O:

```
"Ejecuta el contenido del archivo supabase/migrations/20251002000000_fix_rls_circular_policies.sql en el SQL Editor de Supabase"
```

---

## 📝 Qué Hace la Migración

### Problema que Soluciona

```sql
-- ❌ ANTES (Circular - Causa loop infinito)
CREATE POLICY "Users can view own profile" ON usuarios FOR SELECT
USING (
  auth_user_id = auth.uid() OR
  (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid()) = 1
);
-- Esto intenta SELECT en usuarios mientras se está aplicando la política de usuarios!
```

### Solución Aplicada

```sql
-- ✅ DESPUÉS (No circular - Funciona correctamente)
CREATE POLICY "Users can view own profile" ON usuarios FOR SELECT
USING (auth_user_id = auth.uid());
-- Simple, directo, sin subconsultas circulares
```

### Cambios Específicos

1. **Elimina políticas circulares** de todas las tablas
2. **Crea políticas simplificadas** basadas en `auth.uid()`
3. **Permite autenticación correcta** sin loops infinitos
4. **Mantiene la seguridad** usando RLS pero sin circularidad

---

## 🚀 Después de Aplicar la Migración

### Paso 1: Verificar que la App Carga

1. Recarga la aplicación en el navegador
2. Deberías ver la página de inicio normalmente
3. Ya no debe quedarse en "Cargando..."

### Paso 2: Registrar Usuario WebMaster

Ahora puedes crear el usuario administrador:

**Credenciales:**
- **Nombre**: `WebMaster`
- **Email**: `fjtechsols@gmail.com`
- **Contraseña**: `WebMaster2024!`

**Pasos:**
1. Haz clic en "Registrarse"
2. Completa el formulario con los datos anteriores
3. Haz clic en "Registrarse"
4. Deberías entrar automáticamente a la aplicación

### Paso 3: Actualizar a Rol Administrador

El registro crea el usuario con rol normal (rol_id: 2). Para hacerlo administrador:

Pídele al asistente de Bolt:

```
"Ejecuta este SQL en Supabase:

UPDATE usuarios
SET rol_id = 1
WHERE email = 'fjtechsols@gmail.com';
"
```

### Paso 4: Verificar Acceso Admin

1. **Cierra sesión** (botón "Salir")
2. **Inicia sesión** de nuevo con:
   - Email: `fjtechsols@gmail.com`
   - Contraseña: `WebMaster2024!`
3. Deberías ver en la navbar:
   - Icono de usuario (lleva a "Mi Cuenta")
   - Botón **"Admin"** (lleva al Dashboard de Administrador)
4. Haz clic en "Admin" para acceder al panel

---

## 🔍 Verificación en Base de Datos

Para confirmar que todo está correcto:

```sql
-- Ver usuario creado
SELECT
  u.id,
  u.username,
  u.email,
  u.rol_id,
  r.nombre as rol,
  u.activo,
  u.fecha_registro
FROM usuarios u
JOIN roles r ON r.id = u.rol_id
WHERE u.email = 'fjtechsols@gmail.com';
```

**Resultado esperado:**
- ✅ username: `WebMaster`
- ✅ email: `fjtechsols@gmail.com`
- ✅ rol_id: `1`
- ✅ rol: `admin`
- ✅ activo: `true`

---

## 🛠️ Solución de Problemas

### Si la App Sigue Cargando Después de la Migración

1. **Limpia el caché del navegador:**
   - Abre DevTools (F12)
   - Ve a: Application → Storage → Clear site data
   - Recarga la página (Ctrl + Shift + R)

2. **Verifica que la migración se aplicó:**
   ```sql
   -- Ver políticas actuales de usuarios
   SELECT policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE tablename = 'usuarios';
   ```

   Deberías ver políticas simples sin subconsultas.

3. **Verifica errores en la consola:**
   - Abre DevTools (F12)
   - Ve a la pestaña Console
   - Busca errores de Supabase o autenticación

### Error: "Email already registered"

Si el email ya existe pero necesitas actualizar el rol:

```sql
-- Actualizar usuario existente a admin
UPDATE usuarios
SET rol_id = 1, username = 'WebMaster'
WHERE email = 'fjtechsols@gmail.com';
```

### No Aparece el Botón "Admin"

1. Verifica que el rol_id sea 1:
   ```sql
   SELECT rol_id FROM usuarios WHERE email = 'fjtechsols@gmail.com';
   ```

2. Si no es 1, actualízalo:
   ```sql
   UPDATE usuarios SET rol_id = 1 WHERE email = 'fjtechsols@gmail.com';
   ```

3. Cierra sesión completamente
4. Cierra el navegador
5. Abre de nuevo e inicia sesión

---

## 📚 Funciones del Usuario Normal

Antes de actualizar a admin, como usuario normal tendrás acceso a:

### Mi Cuenta (`/mi-cuenta`)
- ✅ Ver estadísticas personales (pedidos, facturas, favoritos)
- ✅ Editar nombre de usuario
- ✅ Cambiar contraseña
- ✅ Ver fecha de registro
- ✅ Enlaces rápidos a: Favoritos, Carrito, Catálogo

### Funciones Generales
- ✅ Ver catálogo de libros
- ✅ Agregar libros al carrito
- ✅ Crear lista de deseos
- ✅ Realizar pedidos
- ✅ Ver mis pedidos y facturas

---

## 📚 Funciones del Administrador

Una vez que tengas rol de administrador:

### Dashboard Admin (`/admin`)
- 📊 Estadísticas del sistema
- 📚 Gestión completa de libros
- 📦 Gestión de todos los pedidos
- 🧾 Gestión de facturas
- 👥 Gestión de usuarios

### Gestión de Libros
- Crear nuevos libros
- Editar información
- Gestionar stock y precios
- Asignar categorías y editoriales

### Gestión de Pedidos
- Ver todos los pedidos
- Actualizar estados
- Generar facturas desde pedidos
- Ver historial completo

### Gestión de Facturas
- Crear facturas manualmente
- Generar desde pedidos
- Crear rectificativas
- Descargar PDF

---

## 💡 Consejos

1. **Primero aplica la migración** - Sin esto, nada funcionará
2. **Usa el formulario de registro** - No intentes crear el usuario directamente en SQL
3. **Actualiza el rol DESPUÉS** del registro
4. **Limpia el caché** si tienes problemas
5. **Guarda las credenciales** en un lugar seguro
6. **Cambia la contraseña** después del primer login

---

## 🆘 Ayuda Adicional

Si necesitas más ayuda, pregúntale a tu asistente de Bolt:

- `"Muéstrame el contenido de la migración 20251002000000"`
- `"Aplica la migración de RLS"`
- `"Verifica las políticas de la tabla usuarios"`
- `"Muéstrame todos los usuarios en la base de datos"`
- `"Actualiza fjtechsols@gmail.com a administrador"`

---

**Fecha**: 2025-10-02
**Estado**: ⚠️ Pendiente - Aplicar migración primero
**Prioridad**: 🔥 CRÍTICA - La app no funciona sin esto
