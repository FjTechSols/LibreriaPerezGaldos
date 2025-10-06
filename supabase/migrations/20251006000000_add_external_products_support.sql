/*
  # Soporte para Productos Externos en Pedidos

  ## Cambios
  1. Modificar tabla `pedido_detalles` para soportar productos externos
    - Hacer `libro_id` nullable (permitir productos que no están en el inventario)
    - Agregar `nombre_externo` (nombre del producto externo)
    - Agregar `url_externa` (URL de donde se compra el producto)

  2. Seguridad
    - Las políticas RLS existentes se mantienen
    - Validación: o bien libro_id existe, o bien nombre_externo está presente

  ## Notas
    - Los productos internos seguirán teniendo libro_id
    - Los productos externos no tendrán libro_id pero sí nombre_externo y url_externa
    - El subtotal se calculará igual en ambos casos
*/

-- Hacer libro_id nullable para permitir productos externos
ALTER TABLE pedido_detalles
  ALTER COLUMN libro_id DROP NOT NULL;

-- Agregar columnas para productos externos
ALTER TABLE pedido_detalles
  ADD COLUMN IF NOT EXISTS nombre_externo TEXT,
  ADD COLUMN IF NOT EXISTS url_externa TEXT;

-- Agregar constraint para asegurar que o es interno o externo (no ambos ni ninguno)
ALTER TABLE pedido_detalles
  ADD CONSTRAINT check_producto_tipo CHECK (
    (libro_id IS NOT NULL AND nombre_externo IS NULL AND url_externa IS NULL) OR
    (libro_id IS NULL AND nombre_externo IS NOT NULL)
  );

-- Comentarios para documentación
COMMENT ON COLUMN pedido_detalles.libro_id IS 'ID del libro en inventario (NULL si es producto externo)';
COMMENT ON COLUMN pedido_detalles.nombre_externo IS 'Nombre del producto externo (NULL si es producto interno)';
COMMENT ON COLUMN pedido_detalles.url_externa IS 'URL donde se compra el producto externo (opcional)';
