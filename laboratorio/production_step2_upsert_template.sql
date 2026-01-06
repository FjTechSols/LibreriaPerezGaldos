-- ============================================
-- PRODUCTION UPDATE SCRIPT - PART 2: UPSERT
-- Execute AFTER completing Part 1 (cleanup)
-- ============================================

-- IMPORTANTE: Este script asume que ya has:
-- 1. Ejecutado production_step1_cleanup.sql
-- 2. Subido el CSV desde el laboratorio a Supabase Storage o tienes acceso al archivo

-- OPCIÓN A: Si subes el CSV a Supabase Storage
-- Primero sube libros_for_production.csv a tu bucket de Supabase
-- Luego ejecuta:

/*
COPY public.libros_temp (isbn, titulo, anio, paginas, descripcion, notas, categoria_id, editorial_id, legacy_id, precio, ubicacion, fecha_ingreso, activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original)
FROM 'https://[TU_PROYECTO].supabase.co/storage/v1/object/public/[BUCKET]/libros_for_production.csv'
WITH (FORMAT csv, HEADER true, NULL '');
*/

-- OPCIÓN B: UPSERT Manual (Recomendado para control total)
-- Usaremos un script Python que generará los INSERT statements

-- Este archivo contiene el template SQL
-- El script Python real está en: production_upsert_generator.py

-- Template de UPSERT:
/*
INSERT INTO public.libros (
    legacy_id, isbn, titulo, anio, paginas, descripcion, notas,
    categoria_id, editorial_id, precio, ubicacion, fecha_ingreso,
    activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original
)
VALUES (
    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
)
ON CONFLICT (legacy_id) DO UPDATE SET
    isbn = EXCLUDED.isbn,
    titulo = EXCLUDED.titulo,
    anio = EXCLUDED.anio,
    paginas = EXCLUDED.paginas,
    descripcion = EXCLUDED.descripcion,
    notas = EXCLUDED.notas,
    categoria_id = EXCLUDED.categoria_id,
    editorial_id = EXCLUDED.editorial_id,
    precio = EXCLUDED.precio,
    ubicacion = EXCLUDED.ubicacion,
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    activo = EXCLUDED.activo,
    imagen_url = EXCLUDED.imagen_url,
    stock = EXCLUDED.stock,
    autor = EXCLUDED.autor,
    destacado = EXCLUDED.destacado,
    novedad = EXCLUDED.novedad,
    oferta = EXCLUDED.oferta,
    precio_original = EXCLUDED.precio_original,
    updated_at = NOW();
*/

-- VERIFICACIÓN POST-UPDATE
SELECT 
    COUNT(*) as total_libros,
    COUNT(CASE WHEN updated_at > created_at THEN 1 END) as libros_actualizados,
    MAX(updated_at) as ultima_actualizacion
FROM public.libros;
