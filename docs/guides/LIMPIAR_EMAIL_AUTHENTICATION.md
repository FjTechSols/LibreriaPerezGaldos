# Solución: Email Ya Registrado en Authentication

## 🔴 Problema

Ejecutaste `DELETE FROM usuarios;` pero aún te dice "Email ya registrado".

**Causa:** El email está en la tabla `auth.users` de Authentication, que **NO se puede borrar con SQL**.

---

## ✅ Solución: Borrar desde el Dashboard

### Paso 1: Ve al Dashboard de Supabase

1. Abre [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** en el menú lateral izquierdo

### Paso 2: Ve a la sección Users

1. Haz clic en **Users** (debajo de Authentication)
2. Verás una lista de usuarios

### Paso 3: Buscar y borrar el usuario

**IMPORTANTE:** Aunque dices que no ves usuarios, puede ser que:
- La lista esté paginada (revisa si hay páginas)
- El filtro esté activo
- Necesites refrescar la página

**Intenta:**
1. Refresca la página (F5)
2. Busca en la barra de búsqueda: `fjtechsols@gmail.com`
3. Si aparece el usuario:
   - Haz clic en los **3 puntos** a la derecha
   - Selecciona **"Delete user"**
   - Confirma la eliminación

### Paso 4: Si NO ves usuarios pero el error persiste

Es posible que el usuario esté "soft-deleted" (marcado como eliminado pero no borrado). Prueba estos métodos alternativos:

#### Método A: Usar un email diferente

En lugar de `fjtechsols@gmail.com`, usa una variación:
- `fjtechsols+1@gmail.com` (Gmail ignora el `+1` pero Supabase lo ve como diferente)
- `fjtechsols+admin@gmail.com`
- `admin@fjtechsols.com`

Todos estos emails llegarán a tu bandeja de `fjtechsols@gmail.com`.

#### Método B: Contactar soporte de Supabase

Si es crítico usar ese email exacto:
1. Ve a tu Dashboard de Supabase
2. Busca el botón de soporte/ayuda
3. Solicita que eliminen completamente el usuario con ese email

---

## 🔍 Verificación Completa

### En SQL Editor, ejecuta:

```sql
-- 1. Verificar tabla usuarios (debe estar vacía)
SELECT COUNT(*) as usuarios_tabla FROM usuarios;

-- 2. Verificar tabla clientes (por si acaso)
SELECT COUNT(*) as clientes_con_email FROM clientes
WHERE email ILIKE '%fjtechsols%';

-- 3. Intentar ver auth.users (puede dar error de permisos)
SELECT id, email, created_at
FROM auth.users
WHERE email ILIKE '%fjtechsols%';
```

### Si la consulta de `auth.users` funciona:

Si puedes ver registros en `auth.users`, significa que el usuario SÍ está ahí pero el Dashboard no lo muestra por algún bug de UI.

**Workaround:** Usa el método del email con `+`:

---

## 🆕 Crear Usuario con Email Alternativo

### Opción 1: Usar alias de Gmail

```
Email: fjtechsols+admin@gmail.com
```

**Ventaja:** Todos los emails llegarán a `fjtechsols@gmail.com`

### Opción 2: Usar otro email temporal

Si tienes otro email, úsalo temporalmente y luego puedes cambiarlo.

---

## 📋 Pasos Completos para Registrarte

### 1. Limpiar todas las tablas

En SQL Editor:

```sql
-- Limpiar usuarios
DELETE FROM usuarios WHERE email ILIKE '%fjtechsols%';

-- Limpiar clientes
DELETE FROM clientes WHERE email ILIKE '%fjtechsols%';

-- Verificar
SELECT 'usuarios' as tabla, COUNT(*) FROM usuarios WHERE email ILIKE '%fjtechsols%'
UNION ALL
SELECT 'clientes' as tabla, COUNT(*) FROM clientes WHERE email ILIKE '%fjtechsols%';
```

### 2. Intentar borrar de Authentication

- Ve a Authentication → Users
- Refresca la página varias veces
- Si aparece el usuario, bórralo
- Si no aparece, usa el email con `+admin`

### 3. Registrarte en la aplicación

1. Ve a tu aplicación web
2. Haz clic en "Registrarse"
3. Usa el email:
   - Preferido: `fjtechsols@gmail.com` (si lograste borrarlo)
   - Alternativo: `fjtechsols+admin@gmail.com`
4. Contraseña: Una segura que guardarás
5. Nombre: `Admin`

### 4. Convertir a administrador

En SQL Editor:

```sql
UPDATE usuarios
SET rol_id = 1
WHERE email ILIKE '%fjtechsols%';

-- Verificar
SELECT id, username, email, rol_id FROM usuarios WHERE email ILIKE '%fjtechsols%';
```

### 5. Iniciar sesión

1. Cierra sesión si estás logueado
2. Inicia sesión con el email y contraseña que usaste
3. ✅ Deberías ver el botón "Admin"

---

## 🐛 Problema Conocido de Supabase

A veces Supabase Authentication tiene un cache o los usuarios eliminados quedan en un estado "fantasma":

- El Dashboard no los muestra
- Pero el sistema dice "email ya registrado"
- La consulta SQL a `auth.users` puede fallar por permisos

**Soluciones comprobadas:**
1. ✅ Usar alias de email (`+admin`)
2. ✅ Esperar 5-10 minutos y reintentar
3. ✅ Limpiar cache del navegador y reintentar
4. ✅ Contactar soporte de Supabase

---

## 🎯 Recomendación Final

**Usa el email con alias para avanzar rápido:**

```
fjtechsols+admin@gmail.com
```

**Ventajas:**
- Funciona inmediatamente
- Recibes los emails en tu cuenta principal
- Puedes tener múltiples "identidades" de prueba
- No requiere contactar soporte

**Desventaja:**
- No es exactamente el email que querías (pero funciona igual)

---

## 📝 Script de Verificación

He creado `scripts/buscar-email-en-todas-partes.sql` que:
- Busca el email en todas las tablas
- Limpia de todos lados
- Verifica que se eliminó

---

## ⚡ Acción Inmediata

**Opción A (Recomendada):**
1. Ve a tu app
2. Regístrate con: `fjtechsols+admin@gmail.com`
3. Convierte a admin con SQL
4. Listo ✅

**Opción B (Si quieres el email exacto):**
1. Espera 10 minutos
2. Refresca Authentication → Users
3. Intenta borrar el usuario
4. Si no aparece, contacta soporte de Supabase

---

**Resumen:** El email está en `auth.users` que no se puede borrar con SQL. Usa el Dashboard o un alias de email (`+admin`) para continuar.
