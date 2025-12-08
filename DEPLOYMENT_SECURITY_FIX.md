# 🚨 GUÍA DE APLICACIÓN DE PARCHES DE SEGURIDAD

## ⚠️ IMPORTANTE - LEER ANTES DE EJECUTAR

Este script corrige **5 vulnerabilidades críticas** en tu base de datos Supabase.

---

## 📋 PASOS PARA APLICAR EL PARCHE

### 1. Preparación (2 minutos)

#### a) Acceder a Supabase Dashboard
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral

#### b) Respaldo de Seguridad (RECOMENDADO)
Antes de aplicar cambios, crea un respaldo:
1. Ve a **Database** → **Backups** en Supabase Dashboard
2. Click en "Create backup now"
3. Espera confirmación

### 2. Aplicar el Parche (1 minuto)

#### a) Copiar el Script
1. Abre el archivo `CRITICAL_SECURITY_PATCHES.sql` (raíz del proyecto)
2. Copia **TODO** el contenido (Ctrl+A, Ctrl+C)

#### b) Ejecutar en Supabase
1. En SQL Editor, pega el contenido (Ctrl+V)
2. Click en **"Run"** o presiona Ctrl+Enter
3. Espera a que aparezca "Success" ✅

**⚠️ NOTA IMPORTANTE:**
- ✅ El script es **idempotente** (puedes ejecutarlo múltiples veces sin errores)
- ✅ Si ves "policy already exists" u otro error, simplemente ejecuta el script completo de nuevo
- ✅ El script elimina políticas existentes antes de crear nuevas
- ✅ No necesitas limpiar nada manualmente

### 3. Verificación (2 minutos)

#### a) Verificar Mensajes de Éxito
Deberías ver en los logs:
```
✅ PARCHES DE SEGURIDAD APLICADOS EXITOSAMENTE
   - Políticas RLS públicas eliminadas
   - Políticas restrictivas creadas
   - Funciones helper is_admin() y get_current_user_id() creadas
   - Validación de URLs implementada
   - Race condition en facturas corregida
   - RLS habilitado en todas las tablas críticas
```

#### b) Probar Políticas RLS
Ejecuta esta query en SQL Editor para verificar:
```sql
-- Verificar que las funciones existen
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('is_admin', 'get_current_user_id');

-- Verificar RLS habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('invoices', 'pedidos', 'settings')
ORDER BY tablename;

-- Debería mostrar rowsecurity = true para todas
```

---

## ✅ QUÉ CORRIGE ESTE SCRIPT

### Vulnerabilidades Críticas Corregidas

1. **Políticas RLS Públicas en Facturas**
   - ❌ Antes: `USING (true)` - Cualquiera veía todas las facturas
   - ✅ Ahora: Solo administradores pueden ver facturas

2. **Políticas RLS Públicas en Invoice Items**
   - ❌ Antes: `USING (true)` - Items de facturas públicos
   - ✅ Ahora: Solo administradores

3. **Pedidos sin Restricción**
   - ❌ Antes: Todos veían todos los pedidos
   - ✅ Ahora: Solo ves tus pedidos o eres admin

4. **Settings del Sistema Expuestas**
   - ❌ Antes: Cualquier usuario autenticado leía configuración
   - ✅ Ahora: Solo administradores

5. **Race Condition en Facturas**
   - ❌ Antes: Números de factura podían duplicarse
   - ✅ Ahora: Secuencia única garantizada

6. **Search Path Mutable en Funciones (13 funciones afectadas)**
   - ❌ Antes: Funciones con `SECURITY DEFINER` sin `search_path` fijo
   - ✅ Ahora: Todas las funciones tienen `SET search_path = public, pg_temp`
   - 🛡️ **Por qué es crítico**: Previene ataques de inyección donde un atacante manipula el search_path para ejecutar código malicioso

### Mejoras Adicionales

- ✅ Validación de URLs externas (previene inyección)
- ✅ Funciones helper `is_admin()` y `get_current_user_id()` creadas con search_path seguro
- ✅ RLS habilitado en todas las tablas críticas
- ✅ Documentación añadida a funciones
- ✅ Todas las funciones SECURITY DEFINER protegidas contra inyección SQL

---

## 🔍 PROBLEMAS COMUNES

### Error: "relation X does not exist"
**Causa**: La tabla no existe en tu base de datos.

**Solución**: Revisa qué migraciones faltan:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### Error: "column X does not exist"
**Causa**: La tabla existe pero no tiene todas las columnas esperadas.

**Solución**: Ejecuta las migraciones base primero.

### Error: "duplicate key value violates unique constraint"
**Causa**: Ya existe una política con ese nombre.

**Solución**: El script usa `DROP POLICY IF EXISTS` así que esto no debería pasar. Si pasa, ejecuta manualmente:
```sql
-- Listar todas las políticas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('invoices', 'pedidos', 'settings');

-- Eliminar política específica
DROP POLICY "nombre_de_politica" ON nombre_tabla;
```

---

## 🧪 PROBAR QUE FUNCIONA

### Test 1: Usuario Normal no ve Facturas de Otros

Crea un usuario de prueba y verifica que:
1. No puede leer `invoices` de otros usuarios
2. Solo ve sus propios `pedidos`
3. No puede leer `settings`

### Test 2: Admin ve Todo

Con cuenta admin:
1. Puede ver todas las `invoices`
2. Puede ver todos los `pedidos`
3. Puede leer/modificar `settings`

### Test 3: Números de Factura Únicos

Crea 3 facturas simultáneamente. Verifica que:
- Todas tienen números diferentes
- No hay duplicados
- Formato correcto: F2024-0001, F2024-0002, etc.

---

## 🆘 SI ALGO SALE MAL

### Rollback Inmediato

Si algo falla, restaura el backup:
1. Ve a **Database** → **Backups**
2. Selecciona el backup más reciente
3. Click "Restore"

### Soporte

Revisa los logs completos en:
- Supabase Dashboard → **Logs** → **Postgres Logs**

Busca errores específicos para diagnosticar.

---

## 📊 DESPUÉS DE APLICAR

### Actualizar Documentación

El archivo `SECURITY_AUDIT_SUMMARY.md` ya está actualizado con:
- Estado de las correcciones
- Próximos pasos recomendados
- Checklist de verificación

### Próximos Pasos Recomendados

1. **Configurar SITE_URL** (para CORS en Edge Functions)
2. **Actualizar otras Edge Functions** (admin-delete-user, admin-list-users)
3. **Implementar rate limiting**
4. **Probar en staging primero** antes de producción

---

## ⏱️ TIEMPO ESTIMADO

- Preparación: 2 minutos
- Ejecución: 1 minuto
- Verificación: 2 minutos
- **Total: ~5 minutos**

---

## ✅ CHECKLIST

- [ ] Backup creado
- [ ] Script copiado completo
- [ ] Ejecutado en SQL Editor
- [ ] Mensajes de éxito visibles
- [ ] Funciones verificadas (is_admin, get_current_user_id)
- [ ] RLS habilitado verificado
- [ ] Tests de acceso realizados
- [ ] Documentación revisada

---

**Última Actualización**: 2024-12-08
**Versión del Parche**: 1.0
**Archivo**: `CRITICAL_SECURITY_PATCHES.sql`
