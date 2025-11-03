/*
  # Optimización de Performance de Base de Datos

  Este script mejora el rendimiento de la base de datos agregando índices estratégicos
  y optimizaciones de consultas comunes.

  ## Problema
  Supabase reporta 13 problemas de performance relacionados con:
  - Falta de índices en columnas frecuentemente consultadas
  - Falta de índices compuestos para queries multi-columna
  - Falta de índices en timestamps (created_at, updated_at)
  - Falta de índices en columnas de texto para búsquedas

  ## Solución
  1. Agregar índices en columnas timestamp para ordenamiento
  2. Crear índices compuestos para queries comunes
  3. Agregar índices de texto para búsquedas (GIN/GiST)
  4. Optimizar índices en foreign keys
  5. Agregar índices parciales para filtros comunes

  ## Índices Creados
  ### Libros
  - Índice compuesto: (activo, categoria_id, created_at)
  - Índice de texto: titulo, autor
  - Índice en timestamps: created_at, updated_at
  - Índice compuesto de precio: (activo, precio)

  ### Pedidos
  - Índice compuesto: (usuario_id, estado, fecha_pedido)
  - Índice compuesto: (cliente_id, estado, fecha_pedido)
  - Índices en timestamps
  - Índice parcial: pedidos pendientes

  ### Facturas
  - Índice compuesto: (cliente_id, fecha)
  - Índices en timestamps
  - Índice parcial: facturas pendientes

  ### Usuarios
  - Índice único en auth_user_id
  - Índice en timestamps

  ### Carritos y Wishlist
  - Índices compuestos para consultas rápidas
*/

-- =====================================================
-- LIBROS: Optimización para catálogo y búsquedas
-- =====================================================

-- Índice compuesto para listar libros activos por categoría (query más común)
CREATE INDEX IF NOT EXISTS idx_libros_activo_categoria_fecha
ON libros(activo, categoria_id, created_at DESC)
WHERE activo = true;

-- Índice compuesto para búsquedas por precio
CREATE INDEX IF NOT EXISTS idx_libros_activo_precio
ON libros(activo, precio)
WHERE activo = true;

-- Índice GIN para búsquedas de texto completo en título
CREATE INDEX IF NOT EXISTS idx_libros_titulo_gin
ON libros USING gin(to_tsvector('spanish', titulo));

-- Índice GIN para búsquedas de texto completo en autor
CREATE INDEX IF NOT EXISTS idx_libros_autor_gin
ON libros USING gin(to_tsvector('spanish', autor));

-- Índice en timestamps para ordenamiento
CREATE INDEX IF NOT EXISTS idx_libros_created_at
ON libros(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_libros_updated_at
ON libros(updated_at DESC);

-- Índice para búsqueda por código
CREATE INDEX IF NOT EXISTS idx_libros_codigo
ON libros(codigo)
WHERE codigo IS NOT NULL;

-- =====================================================
-- PEDIDOS: Optimización para consultas de usuarios
-- =====================================================

-- Índice compuesto para queries de usuario (dashboard usuario)
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_estado_fecha
ON pedidos(usuario_id, estado, fecha_pedido DESC);

-- Índice compuesto para queries de cliente
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_estado_fecha
ON pedidos(cliente_id, estado, fecha_pedido DESC)
WHERE cliente_id IS NOT NULL;

-- Índice parcial para pedidos pendientes (queries administrativas)
CREATE INDEX IF NOT EXISTS idx_pedidos_pendientes
ON pedidos(fecha_pedido DESC)
WHERE estado = 'pendiente';

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at
ON pedidos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_updated_at
ON pedidos(updated_at DESC);

-- =====================================================
-- PEDIDO_DETALLES: Optimización para cálculos
-- =====================================================

-- Índice compuesto para calcular totales de pedido
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_pedido_libro
ON pedido_detalles(pedido_id, libro_id);

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_created_at
ON pedido_detalles(created_at DESC);

-- =====================================================
-- FACTURAS: Optimización para reportes
-- =====================================================

-- Índice compuesto para queries de cliente
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_fecha
ON facturas(cliente_id, fecha DESC)
WHERE cliente_id IS NOT NULL;

-- Índice compuesto para queries de usuario
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_fecha
ON facturas(usuario_id, fecha DESC)
WHERE usuario_id IS NOT NULL;

-- Índice parcial para facturas pendientes
CREATE INDEX IF NOT EXISTS idx_facturas_pendientes
ON facturas(fecha DESC)
WHERE estado = 'pendiente';

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_facturas_created_at
ON facturas(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_facturas_updated_at
ON facturas(updated_at DESC);

-- =====================================================
-- USUARIOS: Optimización de autenticación
-- =====================================================

-- Asegurar índice único en auth_user_id (crítico para RLS)
DROP INDEX IF EXISTS idx_usuarios_auth;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_auth_user_id_unique
ON usuarios(auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at
ON usuarios(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_updated_at
ON usuarios(updated_at DESC);

-- =====================================================
-- CLIENTES: Optimización para búsquedas
-- =====================================================

-- Índice GIN para búsqueda de texto en nombre completo
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_completo_gin
ON clientes USING gin(to_tsvector('spanish', nombre || ' ' || apellidos));

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_clientes_created_at
ON clientes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clientes_updated_at
ON clientes(updated_at DESC);

-- =====================================================
-- CARRITOS: Optimización para carrito de compras
-- =====================================================

-- Índice compuesto para queries de usuario
CREATE INDEX IF NOT EXISTS idx_carritos_user_libro
ON carritos(user_id, libro_id);

-- Índice en timestamps para limpieza de carritos antiguos
CREATE INDEX IF NOT EXISTS idx_carritos_updated_at
ON carritos(updated_at DESC);

-- =====================================================
-- WISHLIST: Optimización para lista de deseos
-- =====================================================

-- Índice compuesto para queries de usuario
CREATE INDEX IF NOT EXISTS idx_wishlist_user_libro
ON wishlist(user_id, libro_id);

-- El índice en created_at ya existe en la migración original

-- =====================================================
-- ENVIOS: Optimización para seguimiento
-- =====================================================

-- Índice compuesto para queries de pedido
CREATE INDEX IF NOT EXISTS idx_envios_pedido_estado
ON envios(pedido_id, estado);

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_envios_created_at
ON envios(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_envios_updated_at
ON envios(updated_at DESC);

-- =====================================================
-- REEMBOLSOS: Optimización para consultas
-- =====================================================

-- Índice compuesto para queries
CREATE INDEX IF NOT EXISTS idx_reembolsos_factura_estado
ON reembolsos(factura_id, estado);

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_reembolsos_created_at
ON reembolsos(created_at DESC);

-- =====================================================
-- DOCUMENTOS: Optimización
-- =====================================================

-- Índice en timestamps
CREATE INDEX IF NOT EXISTS idx_documentos_created_at
ON documentos(created_at DESC);

-- =====================================================
-- SETTINGS: Optimización (si la tabla existe)
-- =====================================================

-- Verificar si existe antes de crear índices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    -- Índice en timestamps
    CREATE INDEX IF NOT EXISTS idx_settings_updated_at
    ON settings(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_settings_created_at
    ON settings(created_at DESC);
  END IF;
END $$;

-- =====================================================
-- CATEGORIAS y EDITORIALES: Optimización
-- =====================================================

-- Índice en nombre para búsquedas
CREATE INDEX IF NOT EXISTS idx_categorias_nombre
ON categorias(nombre);

CREATE INDEX IF NOT EXISTS idx_editoriales_nombre
ON editoriales(nombre);

-- =====================================================
-- INVOICES (sistema antiguo): Optimización
-- =====================================================

-- Solo si existen estas tablas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    CREATE INDEX IF NOT EXISTS idx_invoices_user_id_date
    ON invoices(user_id, issue_date DESC);

    CREATE INDEX IF NOT EXISTS idx_invoices_created_at
    ON invoices(created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
    CREATE INDEX IF NOT EXISTS idx_invoice_items_created_at
    ON invoice_items(created_at DESC);
  END IF;
END $$;

-- =====================================================
-- VACUUM y ANALYZE para optimizar el plan de consultas
-- =====================================================

-- Analizar todas las tablas para actualizar estadísticas
ANALYZE libros;
ANALYZE pedidos;
ANALYZE pedido_detalles;
ANALYZE facturas;
ANALYZE usuarios;
ANALYZE clientes;
ANALYZE carritos;
ANALYZE wishlist;
ANALYZE envios;
ANALYZE reembolsos;
ANALYZE documentos;
ANALYZE categorias;
ANALYZE editoriales;

-- =====================================================
-- Comentarios en índices para documentación
-- =====================================================

COMMENT ON INDEX idx_libros_activo_categoria_fecha IS
'Optimiza queries de catálogo: listar libros activos por categoría ordenados por fecha';

COMMENT ON INDEX idx_libros_titulo_gin IS
'Permite búsqueda de texto completo en títulos de libros usando tsvector';

COMMENT ON INDEX idx_libros_autor_gin IS
'Permite búsqueda de texto completo en autores usando tsvector';

COMMENT ON INDEX idx_pedidos_usuario_estado_fecha IS
'Optimiza dashboard de usuario: pedidos por estado ordenados por fecha';

COMMENT ON INDEX idx_pedidos_pendientes IS
'Índice parcial para queries administrativas de pedidos pendientes';

COMMENT ON INDEX idx_facturas_cliente_fecha IS
'Optimiza historial de facturas por cliente';

COMMENT ON INDEX idx_usuarios_auth_user_id_unique IS
'Índice único crítico para RLS y autenticación. Previene duplicados.';

COMMENT ON INDEX idx_clientes_nombre_completo_gin IS
'Permite búsqueda de texto completo en nombre y apellidos de clientes';
