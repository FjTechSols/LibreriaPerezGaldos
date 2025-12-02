# Guía: Crear Usuario Administrador

## ✅ Pre-requisito: Trigger Automático Instalado

Has aplicado el trigger automático, lo que significa que:
- ✅ Nuevos usuarios se crean automáticamente en ambas tablas (`auth.users` y `usuarios`)
- ✅ No necesitas hacer sincronización manual
- ✅ El sistema está listo para usar

---

## 🧹 Paso 1: Limpiar Todos los Usuarios (OPCIONAL)

Si quieres empezar desde cero:

### Limpiar tabla `usuarios`

En **SQL Editor** de Supabase:

```sql
-- Ver usuarios actuales
SELECT id, username, email, rol_id FROM usuarios;

-- Borrar todos
DELETE FROM usuarios;

-- Verificar
SELECT COUNT(*) FROM usuarios;
```

### Limpiar Authentication

**Desde el Dashboard:**
1. Ve a **Authentication** → **Users**
2. Borra cada usuario manualmente (3 puntos → Delete user)

---

## 🆕 Paso 2: Crear tu Usuario Administrador

### Desde la aplicación web:

1. **Abre tu aplicación** en el navegador
2. **Haz clic en "Registrarse"**
3. **Completa el formulario:**
   - Nombre: `Admin` (o el que prefieras)
   - Email: `fjtechsols@gmail.com`
   - Contraseña: Una contraseña segura (guárdala bien)
4. **Haz clic en "Registrarse"**

✅ **El trigger automáticamente crea:**
- Usuario en `auth.users`
- Registro en tabla `usuarios` con `rol_id = 2` (usuario normal)

---

## 👑 Paso 3: Convertir a Administrador

El usuario se creó como usuario normal. Para hacerlo admin:

### En SQL Editor de Supabase:

```sql
-- Actualizar a administrador
UPDATE usuarios
SET rol_id = 1
WHERE email = 'fjtechsols@gmail.com';

-- Verificar
SELECT id, username, email, rol_id, activo
FROM usuarios
WHERE email = 'fjtechsols@gmail.com';
```

**Resultado esperado:**
- `rol_id = 1` ✅
- `activo = true` ✅

---

## 🔄 Paso 4: Recargar Sesión

1. **Cierra sesión** en la aplicación (botón "Salir")
2. **Inicia sesión** de nuevo con:
   - Email: `fjtechsols@gmail.com`
   - Contraseña: La que elegiste en el registro
3. ✅ Ahora deberías ver el botón **"Admin"** en la navbar

---

## ✅ Verificación en Base de Datos

Para verificar que el usuario fue creado correctamente, pide a Bolt que ejecute:

```sql
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

## 🔒 Seguridad

### Recomendaciones

1. **Cambia la contraseña** después del primer login a una más personal
2. **No compartas** las credenciales de administrador
3. **Usa contraseñas seguras**: mínimo 12 caracteres, con mayúsculas, minúsculas, números y símbolos
4. **Revisa los logs** de acceso regularmente

### Cambiar Contraseña

Para cambiar la contraseña después del primer login:

1. Inicia sesión con las credenciales actuales
2. Ve a tu perfil (si hay sección de perfil)
3. O usa la función de "Olvidé mi contraseña" para resetearla

---

## 🛠️ Solución de Problemas

### "Email ya registrado"

Si el email ya existe pero necesitas actualizar el rol:

```sql
-- Verificar el usuario actual
SELECT * FROM usuarios WHERE email = 'fjtechsols@gmail.com';

-- Actualizar a admin si no lo es
UPDATE usuarios
SET rol_id = 1, username = 'WebMaster'
WHERE email = 'fjtechsols@gmail.com';
```

### "No aparece el botón Admin"

1. Cierra completamente la sesión (logout)
2. Cierra el navegador
3. Abre de nuevo y vuelve a iniciar sesión
4. Verifica que el rol_id sea 1 en la base de datos

### "No puedo iniciar sesión"

Verifica que:
- El email sea exactamente: `fjtechsols@gmail.com`
- La contraseña sea exactamente: `WebMaster2024!`
- No haya espacios al inicio o final
- La contraseña incluya la mayúscula en M, W y el símbolo !

---

## 📚 Funciones del Administrador

Como administrador, tendrás acceso a:

### Dashboard de Administración
- 📊 Estadísticas generales del sistema
- 📚 Gestión de libros (crear, editar, eliminar)
- 📦 Gestión de pedidos
- 🧾 Gestión de facturas
- 👥 Gestión de usuarios
- 📈 Reportes y analytics

### Gestión de Libros
- Agregar nuevos libros al catálogo
- Editar información de libros existentes
- Eliminar libros descatalogados
- Gestionar stock y precios
- Asignar categorías y editoriales

### Gestión de Pedidos
- Ver todos los pedidos del sistema
- Actualizar estado de pedidos
- Generar documentos de envío
- Gestionar reembolsos
- Ver historial completo

### Gestión de Facturas
- Crear facturas manualmente
- Generar facturas desde pedidos
- Crear facturas rectificativas
- Descargar facturas en PDF
- Ver historial de facturación

---

## 💡 Consejos

1. **Primer Login**: Familiarízate con todas las secciones del dashboard
2. **Permisos**: Como admin, tienes acceso total al sistema
3. **Responsabilidad**: Ten cuidado al eliminar datos, ya que puede ser irreversible
4. **Backup**: Considera hacer backups regulares de los datos importantes
5. **Otros Admins**: Para crear más administradores, sigue el mismo proceso (registro + actualizar rol)

---

## 🆘 Ayuda

Si necesitas ayuda adicional, simplemente pregúntale a tu asistente de Bolt:

- "Muéstrame todos los usuarios administradores"
- "Actualiza el email de mi admin"
- "Resetea la contraseña de fjtechsols@gmail.com"
- "Muéstrame el historial de accesos"
- Cualquier otra consulta relacionada

---

## ✅ Checklist de Verificación

Antes de considerar completado el proceso, verifica:

- [ ] Usuario registrado en la aplicación
- [ ] Rol actualizado a administrador (rol_id = 1)
- [ ] Puedes iniciar sesión correctamente
- [ ] Aparece el botón "Admin" en navbar
- [ ] Puedes acceder al Dashboard de Administrador
- [ ] Has cambiado la contraseña a una personal
- [ ] Has guardado las credenciales en un lugar seguro

---

**Fecha de creación**: 2025-10-02
**Última actualización**: 2025-10-02
**Estado**: Pendiente de crear usuario
