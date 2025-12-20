-- MIGRACIÓN ESTRICTA Y LIMPIEZA DE UBICACIONES
-- Ejecuta este script en el Editor SQL de Supabase para aplicar los cambios definitivamente.
-- Esto es necesario porque los scripts de JS pueden ser bloqueados por políticas de seguridad (RLS).
BEGIN;
-- 1. MOVIMIENTOS POSITIVOS (Llevar libros a su sitio correcto según ID)
-- Mover a Hortaleza (Terminados en H)
UPDATE libros
SET ubicacion = 'Hortaleza'
WHERE legacy_id ~* '^\d+H$'
    AND ubicacion NOT ILIKE '%Hortaleza%';
-- Mover a Reina (Terminados en R)
UPDATE libros
SET ubicacion = 'Reina'
WHERE legacy_id ~* '^\d+R$'
    AND ubicacion NOT ILIKE '%Reina%';
-- Mover a Galeon (Terminados en G)
UPDATE libros
SET ubicacion = 'Galeon'
WHERE legacy_id ~* '^\d+G$'
    AND ubicacion NOT ILIKE '%Galeon%';
-- 2. LIMPIEZA ESTRICTA (Expulsar intrusos a General)
-- Limpiar Hortaleza: Si está en Hortaleza pero NO termina en H -> General
UPDATE libros
SET ubicacion = 'General'
WHERE ubicacion ILIKE '%Hortaleza%'
    AND legacy_id !~* '^\d+H$';
-- Limpiar Reina: Si está en Reina pero NO termina en R -> General
UPDATE libros
SET ubicacion = 'General'
WHERE ubicacion ILIKE '%Reina%'
    AND legacy_id !~* '^\d+R$';
-- Limpiar Galeon: Si está en Galeon pero NO termina en G -> General
UPDATE libros
SET ubicacion = 'General'
WHERE ubicacion ILIKE '%Galeon%'
    AND legacy_id !~* '^\d+G$';
-- Limpiar Almacen: Si está en Almacen pero NO es puramente numérico -> General
UPDATE libros
SET ubicacion = 'General'
WHERE (
        ubicacion ILIKE '%Almacen%'
        OR ubicacion ILIKE '%Almacén%'
    )
    AND legacy_id !~* '^\d+$';
COMMIT;
-- Verificación rápida (Opcional, para ver resultados)
SELECT ubicacion,
    count(*)
FROM libros
WHERE ubicacion IN ('Hortaleza', 'Reina', 'Galeon')
GROUP BY ubicacion;