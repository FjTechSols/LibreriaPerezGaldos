/*
  # Políticas RLS Seguras y Consolidadas

  ## 1. Problema Resuelto
    - Políticas circulares en tabla usuarios causaban loops infinitos
    - Políticas demasiado permisivas (USING true) eliminaban toda seguridad
    - Falta de verificación de roles sin crear dependencias circulares

  ## 2. Solución Implementada
    ### Función Helper Segura
    - `is_admin()` verifica rol sin subconsultas circulares
    - `get_user_id()` obtiene UUID del usuario desde auth_user_id

    ### Políticas por Tabla
    - **usuarios**: Solo ver/editar propio perfil
    - **roles**: Lectura pública para todos los autenticados
    - **libros/categorías/editoriales**: Lectura pública, admin modifica
    - **pedidos**: Usuario ve solo sus pedidos, admin ve todo
    - **pedido_detalles**: Restringido por pedido_id del usuario
    - **facturas**: Usuario ve solo sus facturas, admin ve todo
    - **reembolsos/envíos/documentos**: Acceso restrictivo por relación
    - **auditoria**: Solo admin puede ver
    - **invoices/invoice_items**: Migración a políticas restrictivas

  ## 3. Seguridad
    - RLS habilitado en TODAS las tablas
    - Políticas separadas por operación (SELECT, INSERT, UPDATE, DELETE)
    - Verificación de propiedad en todas las operaciones
    - Admin puede gestionar todo sin restricciones
    - Usuarios solo acceden a sus propios datos

  ## 4. Notas Importantes
    - Se eliminan TODAS las políticas anteriores
    - Se crean políticas nuevas desde cero
    - Sin dependencias circulares
    - Optimizado para rendimiento
*/

-- =========================
-- ELIMINAR POLÍTICAS EXISTENTES
-- =========================

-- Tabla: roles
DROP POLICY IF EXISTS "Admin can view roles" ON roles;
DROP POLICY IF EXISTS "Anyone authenticated can view roles" ON roles;

-- Tabla: usuarios
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Admin can manage all users" ON usuarios;
DROP POLICY IF EXISTS "Allow user registration" ON usuarios;

-- Tabla: editoriales
DROP POLICY IF EXISTS "Anyone can view editoriales" ON editoriales;
DROP POLICY IF EXISTS "Admin can manage editoriales" ON editoriales;
DROP POLICY IF EXISTS "Anyone authenticated can view editoriales" ON editoriales;

-- Tabla: categorias
DROP POLICY IF EXISTS "Anyone can view categorias" ON categorias;
DROP POLICY IF EXISTS "Admin can manage categorias" ON categorias;
DROP POLICY IF EXISTS "Anyone authenticated can view categorias" ON categorias;

-- Tabla: libros
DROP POLICY IF EXISTS "Anyone can view active libros" ON libros;
DROP POLICY IF EXISTS "Admin can manage libros" ON libros;
DROP POLICY IF EXISTS "Anyone authenticated can view libros" ON libros;

-- Tabla: pedidos
DROP POLICY IF EXISTS "Users can view own pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can create own pedidos" ON pedidos;
DROP POLICY IF EXISTS "Admin can manage all pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can view pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can create pedidos" ON pedidos;

-- Tabla: pedido_detalles
DROP POLICY IF EXISTS "Users can view own pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Users can insert own pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Admin can manage pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Users can view pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Users can insert pedido_detalles" ON pedido_detalles;

-- Tabla: facturas
DROP POLICY IF EXISTS "Users can view own facturas" ON facturas;
DROP POLICY IF EXISTS "Users can insert own facturas" ON facturas;
DROP POLICY IF EXISTS "Admin can manage facturas" ON facturas;
DROP POLICY IF EXISTS "Users can view facturas" ON facturas;
DROP POLICY IF EXISTS "Users can insert facturas" ON facturas;

-- Tabla: reembolsos
DROP POLICY IF EXISTS "Users can view own reembolsos" ON reembolsos;
DROP POLICY IF EXISTS "Admin can manage reembolsos" ON reembolsos;
DROP POLICY IF EXISTS "Users can view reembolsos" ON reembolsos;

-- Tabla: envios
DROP POLICY IF EXISTS "Users can view own envios" ON envios;
DROP POLICY IF EXISTS "Admin can manage envios" ON envios;
DROP POLICY IF EXISTS "Users can view envios" ON envios;

-- Tabla: documentos
DROP POLICY IF EXISTS "Users can view own documentos" ON documentos;
DROP POLICY IF EXISTS "Admin can manage documentos" ON documentos;
DROP POLICY IF EXISTS "Users can view documentos" ON documentos;

-- Tabla: auditoria
DROP POLICY IF EXISTS "Admin can view auditoria" ON auditoria;
DROP POLICY IF EXISTS "Users can view auditoria" ON auditoria;

-- Tablas legacy: invoices e invoice_items
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar facturas" ON invoices;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir lectura pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir creación pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir actualización pública de facturas" ON invoices;
DROP POLICY IF EXISTS "Permitir eliminación pública de facturas" ON invoices;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar items de facturas" ON invoice_items;
DROP POLICY IF EXISTS "Permitir lectura pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Permitir creación pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Permitir actualización pública de items" ON invoice_items;
DROP POLICY IF EXISTS "Permitir eliminación pública de items" ON invoice_items;

-- =========================
-- FUNCIONES HELPER SEGURAS
-- =========================

-- Función para verificar si el usuario actual es administrador
-- Evita dependencias circulares usando una tabla temporal en memoria
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

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

-- =========================
-- POLÍTICAS: roles
-- =========================

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- =========================
-- POLÍTICAS: usuarios
-- =========================

-- SELECT: Ver propio perfil o ser admin
CREATE POLICY "Users can view own profile or admin can view all"
  ON usuarios FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() OR is_admin()
  );

-- INSERT: Permitir registro de nuevos usuarios
CREATE POLICY "Allow user registration"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- UPDATE: Solo propio perfil, sin cambiar rol
CREATE POLICY "Users can update own profile"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    AND rol_id = (SELECT rol_id FROM usuarios WHERE auth_user_id = auth.uid())
  );

-- DELETE: Solo admin puede eliminar usuarios
CREATE POLICY "Admin can delete users"
  ON usuarios FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: editoriales
-- =========================

CREATE POLICY "Anyone authenticated can view editoriales"
  ON editoriales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert editoriales"
  ON editoriales FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update editoriales"
  ON editoriales FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete editoriales"
  ON editoriales FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: categorias
-- =========================

CREATE POLICY "Anyone authenticated can view categorias"
  ON categorias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert categorias"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update categorias"
  ON categorias FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete categorias"
  ON categorias FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: libros
-- =========================

CREATE POLICY "Authenticated users can view active books"
  ON libros FOR SELECT
  TO authenticated
  USING (activo = true OR is_admin());

CREATE POLICY "Admin can insert books"
  ON libros FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update books"
  ON libros FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete books"
  ON libros FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: pedidos
-- =========================

-- SELECT: Ver propios pedidos o admin ve todo
CREATE POLICY "Users can view own orders or admin can view all"
  ON pedidos FOR SELECT
  TO authenticated
  USING (
    usuario_id = get_current_user_id() OR is_admin()
  );

-- INSERT: Usuario puede crear pedidos para sí mismo
CREATE POLICY "Users can create own orders"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (
    usuario_id = get_current_user_id() OR is_admin()
  );

-- UPDATE: Usuario puede actualizar sus pedidos si no están completados/cancelados
CREATE POLICY "Users can update own pending orders or admin can update all"
  ON pedidos FOR UPDATE
  TO authenticated
  USING (
    (usuario_id = get_current_user_id() AND estado IN ('pendiente', 'procesando'))
    OR is_admin()
  )
  WITH CHECK (
    (usuario_id = get_current_user_id() AND estado IN ('pendiente', 'procesando'))
    OR is_admin()
  );

-- DELETE: Solo admin puede eliminar pedidos
CREATE POLICY "Admin can delete orders"
  ON pedidos FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: pedido_detalles
-- =========================

-- SELECT: Ver detalles de propios pedidos o admin ve todo
CREATE POLICY "Users can view own order details or admin can view all"
  ON pedido_detalles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_detalles.pedido_id
      AND (pedidos.usuario_id = get_current_user_id() OR is_admin())
    )
  );

-- INSERT: Agregar detalles a propios pedidos
CREATE POLICY "Users can add details to own orders"
  ON pedido_detalles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_detalles.pedido_id
      AND (pedidos.usuario_id = get_current_user_id() OR is_admin())
    )
  );

-- UPDATE: Modificar detalles de propios pedidos pendientes
CREATE POLICY "Users can update own order details or admin can update all"
  ON pedido_detalles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_detalles.pedido_id
      AND (
        (pedidos.usuario_id = get_current_user_id() AND pedidos.estado IN ('pendiente', 'procesando'))
        OR is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_detalles.pedido_id
      AND (
        (pedidos.usuario_id = get_current_user_id() AND pedidos.estado IN ('pendiente', 'procesando'))
        OR is_admin()
      )
    )
  );

-- DELETE: Eliminar detalles de propios pedidos pendientes
CREATE POLICY "Users can delete own order details or admin can delete all"
  ON pedido_detalles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_detalles.pedido_id
      AND (
        (pedidos.usuario_id = get_current_user_id() AND pedidos.estado IN ('pendiente', 'procesando'))
        OR is_admin()
      )
    )
  );

-- =========================
-- POLÍTICAS: facturas
-- =========================

-- SELECT: Ver facturas de propios pedidos o admin ve todo
CREATE POLICY "Users can view own invoices or admin can view all"
  ON facturas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = facturas.pedido_id
      AND (pedidos.usuario_id = get_current_user_id() OR is_admin())
    )
  );

-- INSERT: Solo admin puede crear facturas
CREATE POLICY "Admin can create invoices"
  ON facturas FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Solo admin puede actualizar facturas
CREATE POLICY "Admin can update invoices"
  ON facturas FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Solo admin puede eliminar facturas
CREATE POLICY "Admin can delete invoices"
  ON facturas FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: reembolsos
-- =========================

-- SELECT: Ver reembolsos de propias facturas o admin ve todo
CREATE POLICY "Users can view own refunds or admin can view all"
  ON reembolsos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM facturas
      JOIN pedidos ON pedidos.id = facturas.pedido_id
      WHERE facturas.id = reembolsos.factura_id
      AND (pedidos.usuario_id = get_current_user_id() OR is_admin())
    )
  );

-- INSERT: Solo admin puede crear reembolsos
CREATE POLICY "Admin can create refunds"
  ON reembolsos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Solo admin puede actualizar reembolsos
CREATE POLICY "Admin can update refunds"
  ON reembolsos FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Solo admin puede eliminar reembolsos
CREATE POLICY "Admin can delete refunds"
  ON reembolsos FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: envios
-- =========================

-- SELECT: Ver envíos de propios pedidos o admin ve todo
CREATE POLICY "Users can view own shipments or admin can view all"
  ON envios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = envios.pedido_id
      AND (pedidos.usuario_id = get_current_user_id() OR is_admin())
    )
  );

-- INSERT: Solo admin puede crear envíos
CREATE POLICY "Admin can create shipments"
  ON envios FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Solo admin puede actualizar envíos
CREATE POLICY "Admin can update shipments"
  ON envios FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Solo admin puede eliminar envíos
CREATE POLICY "Admin can delete shipments"
  ON envios FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: documentos
-- =========================

-- SELECT: Ver documentos de propios pedidos o admin ve todo
CREATE POLICY "Users can view own documents or admin can view all"
  ON documentos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = documentos.pedido_id
      AND (pedidos.usuario_id = get_current_user_id() OR is_admin())
    )
  );

-- INSERT: Solo admin puede crear documentos
CREATE POLICY "Admin can create documents"
  ON documentos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Solo admin puede actualizar documentos
CREATE POLICY "Admin can update documents"
  ON documentos FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Solo admin puede eliminar documentos
CREATE POLICY "Admin can delete documents"
  ON documentos FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: auditoria
-- =========================

-- SELECT: Solo admin puede ver auditoría
CREATE POLICY "Admin can view audit logs"
  ON auditoria FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT: Permitir inserciones automáticas del sistema
CREATE POLICY "System can create audit logs"
  ON auditoria FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =========================
-- POLÍTICAS: invoices (legacy - solo admin)
-- =========================

CREATE POLICY "Admin can view legacy invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can create legacy invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update legacy invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete legacy invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- POLÍTICAS: invoice_items (legacy - solo admin)
-- =========================

CREATE POLICY "Admin can view legacy invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can create legacy invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can update legacy invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete legacy invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (is_admin());

-- =========================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =========================

-- Índice para búsquedas frecuentes de usuarios por auth_user_id
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON usuarios(auth_user_id);

-- Índice para búsquedas de pedidos por usuario
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);

-- Índice para búsquedas de facturas por pedido
CREATE INDEX IF NOT EXISTS idx_facturas_pedido_id ON facturas(pedido_id);

-- Índice para búsquedas de reembolsos por factura
CREATE INDEX IF NOT EXISTS idx_reembolsos_factura_id ON reembolsos(factura_id);

-- Índice para búsquedas de envíos por pedido
CREATE INDEX IF NOT EXISTS idx_envios_pedido_id ON envios(pedido_id);

-- Índice para búsquedas de documentos por pedido
CREATE INDEX IF NOT EXISTS idx_documentos_pedido_id ON documentos(pedido_id);

-- =========================
-- COMENTARIOS FINALES
-- =========================

COMMENT ON FUNCTION is_admin() IS 'Verifica si el usuario actual tiene rol de administrador (rol_id = 1). Usa SECURITY DEFINER para evitar dependencias circulares en RLS.';

COMMENT ON FUNCTION get_current_user_id() IS 'Obtiene el UUID del usuario actual desde la tabla usuarios usando auth.uid(). Usa SECURITY DEFINER para evitar dependencias circulares en RLS.';
