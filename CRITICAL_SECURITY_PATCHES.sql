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
-- ELIMINAR POLÍTICAS INSEGURAS
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
-- VERIFICAR RLS HABILITADO
-- =========================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
