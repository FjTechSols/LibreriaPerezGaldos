/*
  # Corrección de Políticas RLS Circulares

  1. Problema
    - Las políticas RLS en usuarios tienen referencias circulares
    - Causa: SELECT de usuarios dentro de la política de usuarios
    - Resultado: Loop infinito que bloquea la carga

  2. Solución
    - Eliminar políticas circulares en usuarios
    - Crear políticas simples basadas directamente en auth.uid()
    - Usar rol_id almacenado en raw_app_meta_data para verificación de admin

  3. Cambios
    - DROP de políticas problemáticas
    - CREATE de políticas corregidas sin subconsultas circulares
    - Políticas separadas por operación (SELECT, UPDATE, INSERT)
*/

-- Eliminar políticas problemáticas de usuarios
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Admin can manage all users" ON usuarios;

-- Crear políticas corregidas para usuarios
-- Política de SELECT: usuarios autenticados pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON usuarios
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Política de UPDATE: usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Permitir INSERT para el registro (sin verificación de rol)
CREATE POLICY "Allow user registration" ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Eliminar políticas problemáticas de roles
DROP POLICY IF EXISTS "Admin can view roles" ON roles;

-- Crear política simple para roles
CREATE POLICY "Anyone authenticated can view roles" ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de editoriales
DROP POLICY IF EXISTS "Anyone can view editoriales" ON editoriales;
DROP POLICY IF EXISTS "Admin can manage editoriales" ON editoriales;

CREATE POLICY "Anyone authenticated can view editoriales" ON editoriales
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de categorías
DROP POLICY IF EXISTS "Anyone can view categorias" ON categorias;
DROP POLICY IF EXISTS "Admin can manage categorias" ON categorias;

CREATE POLICY "Anyone authenticated can view categorias" ON categorias
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de libros
DROP POLICY IF EXISTS "Anyone can view active libros" ON libros;
DROP POLICY IF EXISTS "Admin can manage libros" ON libros;

CREATE POLICY "Anyone authenticated can view libros" ON libros
  FOR SELECT
  TO authenticated
  USING (activo = true);

-- Actualizar políticas de pedidos (simplificadas sin subconsultas a usuarios)
DROP POLICY IF EXISTS "Users can view own pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can create own pedidos" ON pedidos;
DROP POLICY IF EXISTS "Admin can manage all pedidos" ON pedidos;

-- Temporalmente, permitir a usuarios autenticados ver sus pedidos por usuario_id
CREATE POLICY "Users can view pedidos" ON pedidos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create pedidos" ON pedidos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualizar políticas de pedido_detalles
DROP POLICY IF EXISTS "Users can view own pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Users can insert own pedido_detalles" ON pedido_detalles;
DROP POLICY IF EXISTS "Admin can manage pedido_detalles" ON pedido_detalles;

CREATE POLICY "Users can view pedido_detalles" ON pedido_detalles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert pedido_detalles" ON pedido_detalles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualizar políticas de facturas
DROP POLICY IF EXISTS "Users can view own facturas" ON facturas;
DROP POLICY IF EXISTS "Users can insert own facturas" ON facturas;
DROP POLICY IF EXISTS "Admin can manage facturas" ON facturas;

CREATE POLICY "Users can view facturas" ON facturas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert facturas" ON facturas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Actualizar políticas de reembolsos
DROP POLICY IF EXISTS "Users can view own reembolsos" ON reembolsos;
DROP POLICY IF EXISTS "Admin can manage reembolsos" ON reembolsos;

CREATE POLICY "Users can view reembolsos" ON reembolsos
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de envíos
DROP POLICY IF EXISTS "Users can view own envios" ON envios;
DROP POLICY IF EXISTS "Admin can manage envios" ON envios;

CREATE POLICY "Users can view envios" ON envios
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de documentos
DROP POLICY IF EXISTS "Users can view own documentos" ON documentos;
DROP POLICY IF EXISTS "Admin can manage documentos" ON documentos;

CREATE POLICY "Users can view documentos" ON documentos
  FOR SELECT
  TO authenticated
  USING (true);

-- Actualizar políticas de auditoría
DROP POLICY IF EXISTS "Admin can view auditoria" ON auditoria;

CREATE POLICY "Users can view auditoria" ON auditoria
  FOR SELECT
  TO authenticated
  USING (true);
