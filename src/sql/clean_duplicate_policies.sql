-- ====================================================================
-- SCRIPT DE LIMPIEZA DE POLÍTICAS DUPLICADAS (CLIENTES)
-- Instrucciones: Ejecuta este script en el SQL EDITOR de Supabase.
-- ====================================================================

-- 1. ELIMINAR POLÍTICAS ANTIGUAS/REDUNDANTES LOCALIZADAS EN EL DIAGNÓSTICO
DROP POLICY IF EXISTS "Authenticated users can view active clients" ON clientes;
DROP POLICY IF EXISTS "Only admins can create clients" ON clientes;
DROP POLICY IF EXISTS "Only admins can update clients" ON clientes;
DROP POLICY IF EXISTS "Only admins can delete clients" ON clientes;

-- 2. VERIFICACIÓN: Comprobar que solo quedan las políticas estandarizadas
SELECT 
    schemaname, tablename, policyname, permissive, cmd, with_check, qual
FROM pg_policies
WHERE tablename = 'clientes';
