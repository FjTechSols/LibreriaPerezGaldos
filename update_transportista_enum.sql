-- Script para actualizar el ENUM de transportistas
-- Debes ejecutar esto en el Editor SQL de Supabase
-- 1. Añadir 'Correos' al tipo enum
ALTER TYPE transportista
ADD VALUE IF NOT EXISTS 'Correos';
-- 2. Asegurar que 'Otro' (con mayúscula) también esté si se usa en el front
ALTER TYPE transportista
ADD VALUE IF NOT EXISTS 'Otro';
-- Nota: Si 'otro' (minúscula) ya existía, no pasa nada, ambos coexistirán.