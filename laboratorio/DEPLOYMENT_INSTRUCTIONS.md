# 🚀 Instrucciones de Despliegue a Producción

## ✅ Scripts Generados

1. **`production_step1_cleanup.sql`** (Preparación)
   - Crea backup: `libros_backup_20260105`
   - Elimina 11 libros de prueba sin legacy_id
2. **`production_upsert.sql`** (Actualización)
   - 412,697 statements UPSERT
   - Tamaño: ~XXX MB
   - Actualiza todos los libros normalizados

## 📋 Procedimiento de Ejecución

### PASO 1: Backup y Limpieza (5 minutos)

**Ejecuta en Supabase Production SQL Editor:**

```sql
-- Archivo: production_step1_cleanup.sql
```

**Verificaciones:**

- ✅ Backup creado: 412,730 registros
- ✅ Libros eliminados: 11
- ✅ Total actual: 412,719 (todos con legacy_id)

---

### PASO 2: Actualización Masiva (15-30 minutos)

⚠️ **IMPORTANTE:** Este proceso puede tardar 15-30 minutos dependiendo de Supabase.

**Ejecuta en Supabase Production SQL Editor:**

```sql
-- Archivo: production_upsert.sql
```

**Progreso esperado:**

- Supabase mostrará progreso de ejecución
- Si hay timeout, el script está en transacción (se revertirá automáticamente)
- Si completa: verás "COMMIT" al final

---

### PASO 3: Verificación Post-Despliegue

**Ejecuta estas queries de verificación:**

```sql
-- 1. Verificar total de registros
SELECT COUNT(*) as total_libros FROM public.libros;
-- Esperado: 412,697

-- 2. Verificar actualizaciones
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN updated_at > created_at THEN 1 END) as actualizados,
    MAX(updated_at) as ultima_actualizacion
FROM public.libros;
-- Esperado: ~412,697 actualizados

-- 3. Verificar ubicaciones
SELECT ubicacion, COUNT(*)
FROM public.libros
GROUP BY ubicacion
ORDER BY COUNT(*) DESC;
-- Esperado: Almacén (242k), General (151k), Reina (14k), Galeon (3.5k), Hortaleza (1.2k)

-- 4. Verificar categoria_id y editorial_id
SELECT
    COUNT(categoria_id) as con_categoria,
    COUNT(editorial_id) as con_editorial
FROM public.libros;
-- Esperado: ~329k con categoria, ~291k con editorial

-- 5. Verificar pedidos intactos
SELECT COUNT(DISTINCT libro_id) as libros_en_pedidos
FROM public.pedido_detalles;
-- Esperado: 16 (sin cambios)
```

---

## 🔄 Plan de Rollback (Si algo sale mal)

Si necesitas revertir los cambios:

```sql
-- 1. Eliminar datos actualizados
TRUNCATE TABLE public.libros RESTART IDENTITY CASCADE;

-- 2. Restaurar desde backup
INSERT INTO public.libros
SELECT * FROM public.libros_backup_20260105;

-- 3. Verificar restauración
SELECT COUNT(*) FROM public.libros;
-- Esperado: 412,730
```

⚠️ **NOTA:** El rollback CASCADE eliminará pedidos/carritos creados DESPUÉS del backup.

---

## ⏱️ Tiempos Estimados

| Paso                 | Tiempo        | Downtime                                 |
| -------------------- | ------------- | ---------------------------------------- |
| Paso 1: Cleanup      | 1-2 min       | No                                       |
| Paso 2: UPSERT       | 15-30 min     | **Sí** (lectura OK, escritura bloqueada) |
| Paso 3: Verificación | 2-3 min       | No                                       |
| **TOTAL**            | **20-35 min** | **15-30 min**                            |

---

## 🎯 Recomendaciones

1. **Horario:** Ejecutar en horario de bajo tráfico (madrugada)
2. **Comunicación:** Avisar a usuarios de mantenimiento programado
3. **Monitoreo:** Tener acceso a logs de Supabase durante ejecución
4. **Backup:** El backup se crea automáticamente, pero puedes hacer uno manual adicional

---

## ✅ Checklist Pre-Ejecución

- [ ] Backup manual adicional realizado (opcional)
- [ ] Horario de bajo tráfico confirmado
- [ ] Usuarios notificados de mantenimiento
- [ ] Acceso a Supabase Production SQL Editor verificado
- [ ] Scripts descargados y revisados
- [ ] Plan de rollback entendido

---

## 📞 Soporte

Si encuentras algún error durante la ejecución:

1. **NO ENTRES EN PÁNICO** - El backup existe
2. Copia el mensaje de error completo
3. Verifica si la transacción se revirtió (ROLLBACK)
4. Si es necesario, ejecuta el plan de rollback
5. Contacta para análisis del error

---

**¿Listo para ejecutar?** 🚀
