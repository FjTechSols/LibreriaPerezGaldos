# 🔐 Vulnerabilidad: Search Path Mutable en PostgreSQL

## 🚨 ¿Qué es Search Path Mutable?

Es una vulnerabilidad de seguridad en funciones PostgreSQL que tienen `SECURITY DEFINER` pero **NO** tienen un `search_path` fijo.

---

## 🎯 ¿Por Qué es Peligroso?

### El Problema

Cuando una función tiene:
- ✅ `SECURITY DEFINER` (se ejecuta con privilegios del creador)
- ❌ **SIN** `SET search_path` (usa el del usuario que la llama)

Un atacante puede:
1. Crear un schema malicioso con su usuario
2. Crear funciones maliciosas con nombres de funciones comunes
3. Manipular su `search_path` para que apunte a su schema
4. Llamar a tu función, que ejecutará su código malicioso

### Ejemplo de Ataque

```sql
-- Tu función vulnerable (ejecuta con privilegios de admin)
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid();
  -- ❌ Sin search_path fijo, puede buscar en cualquier schema
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atacante crea schema malicioso
CREATE SCHEMA attacker_schema;
SET search_path = attacker_schema, public;

-- Atacante crea tabla falsa
CREATE TABLE attacker_schema.usuarios (
  auth_user_id UUID,
  rol_id INT DEFAULT 1  -- ¡Siempre admin!
);

-- Cuando el atacante llama is_admin(), lee su tabla falsa
-- y obtiene privilegios de admin
SELECT is_admin();  -- ❌ Retorna true para el atacante
```

---

## ✅ La Solución

### Antes (Vulnerable)

```sql
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ❌ Sin search_path fijo
```

### Después (Seguro)

```sql
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  SELECT rol_id FROM public.usuarios WHERE auth_user_id = auth.uid();
  -- ✅ Especifica schema explícitamente
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;
-- ✅ search_path fijo: solo busca en public y pg_temp
```

---

## 🛡️ Mejores Prácticas

### 1. Siempre Usar SET search_path

```sql
CREATE FUNCTION mi_funcion()
RETURNS ... AS $$
...
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;  -- ✅ OBLIGATORIO
```

### 2. Usar Schema Explícito en Queries

```sql
-- ❌ Vulnerable
SELECT * FROM usuarios WHERE id = p_user_id;

-- ✅ Seguro
SELECT * FROM public.usuarios WHERE id = p_user_id;
```

### 3. Incluir pg_temp en search_path

```sql
SET search_path = public, pg_temp;
-- pg_temp permite tablas temporales legítimas
```

### 4. NUNCA usar search_path = ''

```sql
SET search_path = '';  -- ❌ Rompe funciones built-in de PostgreSQL
```

---

## 📊 Funciones Afectadas en Este Proyecto

El script `CRITICAL_SECURITY_PATCHES.sql` corrige estas 13 funciones:

### Funciones Helper de Seguridad
1. `is_admin()` - Verifica si usuario es administrador
2. `get_current_user_id()` - Obtiene UUID del usuario actual
3. `obtener_permisos_usuario()` - Obtiene permisos del usuario

### Funciones de Triggers
4. `update_updated_at_column()` - Actualiza timestamp automáticamente
5. `update_settings_updated_at()` - Actualiza timestamp de settings
6. `generar_numero_factura()` - Genera números únicos de factura

### Otras (según tu base de datos)
7-13. Funciones adicionales detectadas por Supabase Advisor

---

## 🧪 Cómo Verificar la Corrección

### Antes de Aplicar el Parche

```sql
-- En Supabase Dashboard → SQL Editor
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_config
FROM pg_proc
WHERE proname IN ('is_admin', 'get_current_user_id', 'generar_numero_factura')
AND pronamespace = 'public'::regnamespace;

-- Si search_path_config es NULL, está vulnerable
```

### Después de Aplicar el Parche

```sql
-- Debería mostrar search_path_config = '{search_path=public, pg_temp}'
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_config
FROM pg_proc
WHERE proname IN ('is_admin', 'get_current_user_id', 'generar_numero_factura')
AND pronamespace = 'public'::regnamespace;
```

---

## 🚀 Aplicar la Corrección

El script `CRITICAL_SECURITY_PATCHES.sql` ya incluye todas las correcciones.

1. Copia el contenido de `CRITICAL_SECURITY_PATCHES.sql`
2. Pega en Supabase Dashboard → SQL Editor
3. Ejecuta (Run)
4. Verifica que los 13 problemas desaparezcan del Advisor

---

## 📚 Referencias

- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL Search Path](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)
- [OWASP: SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/security)

---

## ⚠️ Severidad del Problema

| Aspecto | Nivel |
|---------|-------|
| **Severidad** | 🔴 CRÍTICA |
| **Explotabilidad** | 🟡 MEDIA (requiere cuenta autenticada) |
| **Impacto** | 🔴 ALTO (escalación de privilegios) |
| **Prioridad** | 🔴 URGENTE |

### Por Qué es Crítico

- ✅ Permite escalación de privilegios (usuario → admin)
- ✅ Bypass completo de RLS (Row Level Security)
- ✅ Acceso no autorizado a datos sensibles
- ✅ Manipulación de datos críticos

### Por Qué NO es Crítico en Todos los Casos

- ⚠️ Requiere cuenta autenticada (no es acceso anónimo)
- ⚠️ Requiere conocimiento técnico avanzado
- ⚠️ Supabase tiene mitigaciones adicionales

---

## ✅ Resumen

1. **Search path mutable** es vulnerable en funciones `SECURITY DEFINER`
2. Permite ataques de inyección SQL sofisticados
3. Se corrige agregando `SET search_path = public, pg_temp`
4. El script `CRITICAL_SECURITY_PATCHES.sql` lo corrige automáticamente
5. **Ejecuta el script AHORA** para proteger tu aplicación

---

**Última Actualización**: 2024-12-08
**Prioridad**: 🔴 CRÍTICA
**Estado**: ✅ Corrección disponible en `CRITICAL_SECURITY_PATCHES.sql`
