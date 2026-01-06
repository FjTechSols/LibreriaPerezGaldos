# ============================================
# COMANDO PARA EJECUTAR UPSERT EN PRODUCCIÓN
# ============================================

# IMPORTANTE: Ejecuta este comando en PowerShell

# Opción 1: Usando Docker con PostgreSQL (Recomendado)
docker run --rm -v ${PWD}/laboratorio:/sql postgres:15 psql "postgresql://postgres:693310893471_693sTs@db.weaihscsaqxadxjgsfbt.supabase.co:5432/postgres" -f /sql/production_upsert.sql

# Opción 2: Si el comando anterior falla, usa esta alternativa
# (Copia el archivo SQL al contenedor primero)
docker run --rm -i -v ${PWD}/laboratorio:/sql postgres:15 psql "postgresql://postgres:693310893471_693sTs@db.weaihscsaqxadxjgsfbt.supabase.co:5432/postgres" < laboratorio/production_upsert.sql

# ============================================
# QUÉ ESPERAR
# ============================================
# - El comando se conectará a Supabase producción
# - Comenzará a ejecutar los 412,697 UPSERT statements
# - Verás progreso en la terminal (puede tardar 10-20 minutos)
# - Al finalizar verás: "COMMIT"
# - Si hay error, verás: "ROLLBACK" (no se aplicarán cambios)

# ============================================
# DESPUÉS DE EJECUTAR
# ============================================
# Verifica en Supabase SQL Editor:

# SELECT COUNT(*) FROM public.libros;
# -- Esperado: 412,697

# SELECT COUNT(CASE WHEN updated_at > created_at THEN 1 END) as actualizados 
# FROM public.libros;
# -- Esperado: ~412,697
