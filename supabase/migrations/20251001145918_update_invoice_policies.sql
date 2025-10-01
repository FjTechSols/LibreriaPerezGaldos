/*
  # Actualizar políticas RLS para facturas

  1. Cambios
    - Eliminar políticas restrictivas existentes
    - Agregar políticas públicas temporales para desarrollo
    - Permitir acceso sin autenticación para pruebas
*/

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar items de facturas" ON invoice_items;

-- Crear políticas públicas para invoices (TEMPORAL - para desarrollo)
CREATE POLICY "Permitir lectura pública de facturas"
  ON invoices FOR SELECT
  USING (true);

CREATE POLICY "Permitir creación pública de facturas"
  ON invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualización pública de facturas"
  ON invoices FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir eliminación pública de facturas"
  ON invoices FOR DELETE
  USING (true);

-- Crear políticas públicas para invoice_items (TEMPORAL - para desarrollo)
CREATE POLICY "Permitir lectura pública de items"
  ON invoice_items FOR SELECT
  USING (true);

CREATE POLICY "Permitir creación pública de items"
  ON invoice_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualización pública de items"
  ON invoice_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir eliminación pública de items"
  ON invoice_items FOR DELETE
  USING (true);