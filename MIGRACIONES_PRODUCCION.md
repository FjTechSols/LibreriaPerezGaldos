# 🗄️ Guía de Migraciones: Dev → Producción

## 📋 Estrategia de Migraciones

### **Orden Correcto:**

```
1. Desarrollo Local → Pruebas
2. Base de Datos DEV → Verificación
3. Base de Datos PROD → Deploy Final
```

⚠️ **NUNCA aplicar directamente a producción sin probar en dev primero**

---

## 🔄 Workflow de Migraciones

### **Paso 1: Crear Migración en Local**

Cuando necesites cambios en la BD:

```bash
# Crear archivo de migración
# Formato: YYYYMMDDHHMMSS_descripcion.sql
# Ejemplo: 20251115120000_add_campo_nuevo.sql
```

**Ubicación:** `supabase/migrations/`

**Ejemplo de migración:**

```sql
/*
  # Agregar campo de teléfono a usuarios

  1. Cambios
    - Agregar columna `phone` a tabla `usuarios`
    - Agregar validación de formato

  2. Seguridad
    - Usuarios pueden ver su propio teléfono
    - Solo admin puede ver todos los teléfonos
*/

-- Agregar columna
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Agregar constraint
ALTER TABLE usuarios
ADD CONSTRAINT phone_format CHECK (phone ~ '^\+?[0-9]{9,15}$');

-- Actualizar RLS (si necesario)
-- ...
```

---

### **Paso 2: Aplicar a Desarrollo**

#### **Opción A: Supabase CLI (Recomendado)**

```bash
# 1. Instalar Supabase CLI (una vez)
npm install -g supabase

# 2. Login
supabase login

# 3. Linkear a proyecto DEV
supabase link --project-ref TU_REF_DEV

# 4. Aplicar migraciones
supabase db push

# 5. Verificar
supabase db diff
```

#### **Opción B: Supabase Dashboard**

1. Ve a tu proyecto DEV en Supabase
2. **SQL Editor**
3. Copia y pega el contenido de tu archivo `.sql`
4. Click "Run"
5. Verificar que no hay errores

#### **Opción C: Script Node.js**

Usa los scripts que ya tienes en `/docs`:

```bash
# Aplicar todas las migraciones
node docs/apply_all_migrations.mjs
```

---

### **Paso 3: Probar en Desarrollo**

```bash
# 1. Iniciar app en modo desarrollo
npm run dev

# 2. Probar las funcionalidades afectadas
# - Si agregaste campo → Verificar formularios
# - Si cambiaste tabla → Verificar queries
# - Si modificaste RLS → Verificar permisos

# 3. Revisar console del navegador
# No debe haber errores
```

**Pruebas específicas:**

```bash
# Ver estructura de tabla
SELECT * FROM usuarios LIMIT 1;

# Verificar RLS
-- Login como usuario normal
-- Intentar acceder a datos de otro usuario
-- Debe fallar si RLS está correcto

# Verificar constraints
INSERT INTO usuarios (phone) VALUES ('invalido');
-- Debe rechazar si formato es incorrecto
```

---

### **Paso 4: Aplicar a Producción**

⚠️ **SOLO cuando todo funciona en dev**

#### **ANTES de aplicar:**

1. **Backup de Producción:**
   ```
   Supabase Dashboard → Database → Backups → Create backup
   ```

2. **Documentar cambios:**
   - ¿Qué tablas afecta?
   - ¿Hay downtime?
   - ¿Cómo hacer rollback?

3. **Notificar (si es necesario):**
   - Si hay downtime, avisar a usuarios
   - Si cambia comportamiento, actualizar docs

#### **Aplicar migración:**

**Opción 1: Supabase CLI**

```bash
# 1. Linkear a proyecto PROD
supabase link --project-ref TU_REF_PROD

# 2. Ver qué se va a aplicar
supabase db diff

# 3. Aplicar
supabase db push

# 4. Verificar
# - Revisar que no hay errores
# - Probar app en producción
```

**Opción 2: Dashboard (Más seguro para prod)**

```bash
# 1. Copiar contenido del archivo de migración
cat supabase/migrations/20251115120000_mi_migracion.sql

# 2. Supabase Dashboard PROD → SQL Editor
# 3. Pegar código
# 4. Revisar cuidadosamente
# 5. Run
# 6. Verificar output
```

---

## 📊 Tipos de Migraciones

### **1. Migraciones Simples (Sin downtime)**

✅ Seguras, no afectan app en funcionamiento:

- Agregar columnas opcionales
- Crear nuevas tablas
- Agregar índices (puede ser lento)
- Crear funciones/triggers

**Ejemplo:**

```sql
-- SEGURO: Agregar columna opcional
ALTER TABLE libros
ADD COLUMN IF NOT EXISTS editorial TEXT;

-- SEGURO: Nueva tabla
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL
);
```

---

### **2. Migraciones con Riesgo (Posible downtime)**

⚠️ Requieren cuidado:

- Eliminar columnas
- Cambiar tipos de datos
- Modificar columnas existentes
- Eliminar constraints

**Estrategia segura:**

```sql
-- FASE 1: Agregar nueva columna
ALTER TABLE usuarios ADD COLUMN email_nuevo TEXT;

-- FASE 2: Copiar datos (en código o script)
UPDATE usuarios SET email_nuevo = email;

-- FASE 3: Actualizar código para usar email_nuevo
-- Deploy de código

-- FASE 4: Eliminar columna vieja (días después)
ALTER TABLE usuarios DROP COLUMN email;
```

---

### **3. Migraciones de Datos**

Para mover/transformar datos:

```sql
-- Migración de datos con validación
DO $$
BEGIN
  -- Verificar que datos existen
  IF EXISTS (SELECT 1 FROM tabla_origen WHERE condicion) THEN
    -- Migrar
    INSERT INTO tabla_destino (campo1, campo2)
    SELECT campo1, campo2 FROM tabla_origen
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Migración completada';
  ELSE
    RAISE NOTICE 'No hay datos para migrar';
  END IF;
END $$;
```

---

## 🔙 Rollback de Migraciones

### **Estrategia 1: Migración Reversa**

Para cada migración, crea su reversa:

**Archivo:** `20251115120000_add_campo.sql`
```sql
ALTER TABLE usuarios ADD COLUMN phone TEXT;
```

**Archivo:** `20251115120000_add_campo_rollback.sql`
```sql
ALTER TABLE usuarios DROP COLUMN IF EXISTS phone;
```

### **Estrategia 2: Restore desde Backup**

```bash
# Supabase Dashboard PROD
Database → Backups → Click en backup anterior → Restore
```

⚠️ **Cuidado:** Pierdes datos creados después del backup

---

## 📝 Checklist de Migración a Producción

### **Pre-Deploy:**

- [ ] Migración probada en desarrollo
- [ ] Backup de producción creado
- [ ] Migración documentada
- [ ] Rollback plan preparado
- [ ] Código actualizado (si necesario)
- [ ] Tests pasando
- [ ] No hay errores en dev

### **Durante Deploy:**

- [ ] Aplicar migración a base de datos prod
- [ ] Verificar que no hay errores
- [ ] Deploy código actualizado (si aplica)
- [ ] Verificar que app carga

### **Post-Deploy:**

- [ ] Probar funcionalidades afectadas
- [ ] Revisar logs de errores
- [ ] Monitorear performance
- [ ] Verificar que usuarios pueden usar app
- [ ] Confirmar que datos están intactos

---

## 🧪 Testing de Migraciones

### **Test en Local:**

```bash
# 1. Crear base de datos temporal
docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres

# 2. Aplicar todas las migraciones
# Verificar que no hay errores

# 3. Aplicar nueva migración
# Verificar que funciona

# 4. Aplicar rollback
# Verificar que vuelve al estado anterior
```

### **Test de Performance:**

```sql
-- Antes de migración
EXPLAIN ANALYZE
SELECT * FROM libros WHERE categoria = 'Fantasía';

-- Aplicar índice
CREATE INDEX idx_libros_categoria ON libros(categoria);

-- Después de migración
EXPLAIN ANALYZE
SELECT * FROM libros WHERE categoria = 'Fantasía';

-- Comparar tiempos
```

---

## 🚨 Errores Comunes y Soluciones

### **Error: "Column already exists"**

**Causa:** Migración ya aplicada

**Solución:**
```sql
-- Usar IF NOT EXISTS
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS phone TEXT;
```

---

### **Error: "Cannot drop column, is referenced by..."**

**Causa:** Columna tiene foreign keys

**Solución:**
```sql
-- 1. Eliminar constraint primero
ALTER TABLE pedidos
DROP CONSTRAINT IF EXISTS fk_usuario;

-- 2. Eliminar columna
ALTER TABLE usuarios
DROP COLUMN user_id;
```

---

### **Error: RLS policies bloqueando operación**

**Causa:** Tu usuario no tiene permisos

**Solución:**
```sql
-- Temporalmente deshabilitar RLS
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Hacer operación
-- ...

-- Re-habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Monitoreo Post-Migración

### **Métricas a revisar:**

```sql
-- 1. Verificar integridad de datos
SELECT COUNT(*) FROM tabla_modificada;
SELECT COUNT(*) FROM tabla_modificada WHERE nuevo_campo IS NULL;

-- 2. Verificar performance
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE tablename = 'tu_tabla';

-- 3. Verificar RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'tu_tabla';
```

---

## 📚 Recursos

- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

## 💡 Tips Finales

### **DO's ✅**

- Probar SIEMPRE en dev primero
- Hacer backup antes de migrar prod
- Usar IF EXISTS / IF NOT EXISTS
- Documentar cada migración
- Hacer migraciones pequeñas e incrementales
- Revisar performance después de migrar

### **DON'Ts ❌**

- Nunca aplicar directamente a prod
- Nunca modificar migraciones ya aplicadas
- Nunca hacer rollback sin backup
- Nunca eliminar columnas sin plan
- Nunca migrar en horario pico
- Nunca asumir que funcionará en prod

---

**¡Buena suerte con tus migraciones!** 🚀
