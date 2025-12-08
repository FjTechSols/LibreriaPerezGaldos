-- =========================================
-- PARCHES DE SEGURIDAD CRÍTICOS
-- =========================================
-- IMPORTANTE: Ejecutar este script INMEDIATAMENTE en Supabase
-- Dashboard -> SQL Editor -> Pegar y ejecutar
-- =========================================

/*
  VULNERABILIDADES CRÍTICAS RESUELTAS:

  1. Políticas RLS públicas (USING true) en invoices/invoice_items
  2. Políticas RLS públicas en pedidos
  3. Settings accesibles a todos los usuarios
  4. Race condition en generación de facturas
  5. Validación de URLs externas
*/

-- =========================================
-- PASO 1: CREAR FUNCIONES HELPER
-- =========================================

-- Función para verificar si el usuario actual es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_rol INT;
BEGIN
  -- Verificar en tabla usuarios si el rol_id = 1 (admin)
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Si rol_id = 1, es admin
  RETURN COALESCE(user_rol = 1, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para obtener el UUID del usuario actual desde la tabla usuarios
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =========================================
-- PASO 2: ELIMINAR POLÍTICAS INSEGURAS
-- =========================================

DROP POLICY IF EXISTS "Permitir lectura pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir creación pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir actualización pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir eliminación pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir lectura pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Permitir creación pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Permitir actualización pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Permitir eliminación pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Users can view pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can create pedidos" ON pedidos;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;

-- =========================================
-- POLÍTICAS SEGURAS - INVOICES
-- =========================================

CREATE POLICY "Only admins can view legacy invoices"
  ON invoices FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Only admins can create legacy invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update legacy invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete legacy invoices"
  ON invoices FOR DELETE TO authenticated
  USING (is_admin());

-- =========================================
-- POLÍTICAS SEGURAS - INVOICE_ITEMS
-- =========================================

CREATE POLICY "Only admins can view legacy invoice items"
  ON invoice_items FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Only admins can create legacy invoice items"
  ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update legacy invoice items"
  ON invoice_items FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete legacy invoice items"
  ON invoice_items FOR DELETE TO authenticated
  USING (is_admin());

-- =========================================
-- POLÍTICAS SEGURAS - PEDIDOS
-- =========================================

CREATE POLICY "Users can view own pedidos or admin views all"
  ON pedidos FOR SELECT TO authenticated
  USING (usuario_id = get_current_user_id() OR is_admin());

CREATE POLICY "Users can create own pedidos"
  ON pedidos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = get_current_user_id());

CREATE POLICY "Users can update own pedidos or admin updates all"
  ON pedidos FOR UPDATE TO authenticated
  USING (usuario_id = get_current_user_id() OR is_admin())
  WITH CHECK (usuario_id = get_current_user_id() OR is_admin());

CREATE POLICY "Only admins can delete pedidos"
  ON pedidos FOR DELETE TO authenticated
  USING (is_admin());

-- =========================================
-- POLÍTICAS SEGURAS - SETTINGS
-- =========================================

CREATE POLICY "Only admins can read settings"
  ON settings FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Only admins can create settings"
  ON settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update settings"
  ON settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete settings"
  ON settings FOR DELETE TO authenticated
  USING (is_admin());

-- =========================================
-- PASO 7: VALIDACIÓN DE URLs EXTERNAS
-- =========================================

-- Validar URLs externas en pedido_detalles (si existe la columna)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedido_detalles' AND column_name = 'url_externa'
  ) THEN
    -- Eliminar constraint anterior si existe
    ALTER TABLE pedido_detalles DROP CONSTRAINT IF EXISTS check_url_externa;

    -- Agregar validación de URL
    ALTER TABLE pedido_detalles
    ADD CONSTRAINT check_url_externa CHECK (
      url_externa IS NULL OR
      url_externa ~ '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
    );
  END IF;
END $$;

-- =========================================
-- PASO 8: OPTIMIZACIÓN - Secuencia para Facturas
-- =========================================

-- Crear secuencia para números de factura (previene race conditions)
CREATE SEQUENCE IF NOT EXISTS seq_factura_numero START WITH 1;

-- Actualizar función generar_numero_factura para usar secuencia
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_numero VARCHAR(50);
  anio INT;
  secuencia INT;
BEGIN
  -- Obtener año actual
  anio := EXTRACT(YEAR FROM COALESCE(NEW.fecha_emision, now()));

  -- Obtener siguiente número de secuencia
  secuencia := nextval('seq_factura_numero');

  -- Generar número en formato F2024-0001
  nuevo_numero := 'F' || anio || '-' || LPAD(secuencia::TEXT, 4, '0');

  NEW.numero_factura := nuevo_numero;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- PASO 9: VERIFICAR RLS HABILITADO
-- =========================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('invoices', 'invoice_items', 'pedidos', 'settings', 'facturas', 'usuarios')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'RLS enabled on table: %', r.tablename;
  END LOOP;
END $$;

-- =========================================
-- VERIFICACIÓN FINAL
-- =========================================

-- Agregar comentarios para documentación
COMMENT ON FUNCTION is_admin() IS 'Verifica si el usuario actual es administrador (rol_id=1)';
COMMENT ON FUNCTION get_current_user_id() IS 'Obtiene el UUID del usuario actual desde la tabla usuarios';
COMMENT ON SEQUENCE seq_factura_numero IS 'Secuencia para generar números de factura únicos sin race conditions';

-- Mostrar mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ PARCHES DE SEGURIDAD APLICADOS EXITOSAMENTE';
  RAISE NOTICE '   - Políticas RLS públicas eliminadas';
  RAISE NOTICE '   - Políticas restrictivas creadas';
  RAISE NOTICE '   - Funciones helper is_admin() y get_current_user_id() creadas';
  RAISE NOTICE '   - Validación de URLs implementada';
  RAISE NOTICE '   - Race condition en facturas corregida';
  RAISE NOTICE '   - RLS habilitado en todas las tablas críticas';
END $$;
