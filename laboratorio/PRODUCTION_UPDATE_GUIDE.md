# Guía de Actualización Segura a Producción

## ⚠️ IMPORTANTE: NO USAR TRUNCATE EN PRODUCCIÓN

El comando `TRUNCATE CASCADE` destruiría todos los datos relacionados:

- ❌ Pedidos históricos (`pedido_detalles`)
- ❌ Reviews de clientes
- ❌ Carritos activos
- ❌ Wishlists
- ❌ Reservas

## Estrategia: UPDATE Masivo (UPSERT)

Usaremos `INSERT ... ON CONFLICT DO UPDATE` para actualizar registros existentes sin perder relaciones.

---

## Paso 1: Análisis de Producción

**Ejecuta este script en Supabase Production SQL Editor:**

📄 Archivo: `laboratorio/production_analysis.sql`

Este script verificará:

1. ✅ Si existe constraint UNIQUE en `legacy_id`
2. ✅ Cuántos libros no tienen `legacy_id`
3. ✅ Si hay `legacy_id` duplicados
4. ✅ Cuántos libros están en pedidos (datos críticos)
5. ✅ Tamaño actual de la tabla

**Copia los resultados y envíamelos para determinar la estrategia exacta.**

---

## Paso 2: Preparar Producción (Según Resultados)

### Si NO existe UNIQUE constraint en legacy_id:

```sql
-- Crear constraint UNIQUE en legacy_id
-- IMPORTANTE: Solo si no hay duplicados
ALTER TABLE public.libros
ADD CONSTRAINT libros_legacy_id_unique UNIQUE (legacy_id);
```

### Si hay duplicados de legacy_id:

Necesitaremos una estrategia diferente (te la prepararé según los resultados).

---

## Paso 3: Exportar Datos Normalizados del Lab

Ejecuta en tu máquina local:

```bash
# Exportar desde laboratorio local
docker exec supabase-db psql -U postgres -c "COPY (SELECT isbn, titulo, anio, paginas, descripcion, notas, categoria_id, editorial_id, legacy_id, precio, ubicacion, fecha_ingreso, activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original FROM public.libros) TO STDOUT WITH CSV HEADER" > c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\laboratorio\libros_for_production.csv
```

---

## Paso 4: Crear Script de UPSERT

Una vez tengamos los resultados del análisis, te prepararé el script SQL exacto para ejecutar en producción.

El script será del tipo:

```sql
-- Ejemplo (se ajustará según análisis)
INSERT INTO public.libros (legacy_id, titulo, autor, ...)
VALUES (...)
ON CONFLICT (legacy_id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  autor = EXCLUDED.autor,
  descripcion = EXCLUDED.descripcion,
  -- ... todos los campos
  updated_at = NOW();
```

---

## Paso 5: Backup de Producción

**ANTES de cualquier cambio:**

```sql
-- Crear tabla de backup en producción
CREATE TABLE public.libros_backup_pre_normalizacion AS
SELECT * FROM public.libros;
```

---

## Siguiente Acción

**Por favor ejecuta `laboratorio/production_analysis.sql` en Supabase Production y envíame los resultados.**

Con esa información prepararé el script de actualización seguro y específico para tu caso.
