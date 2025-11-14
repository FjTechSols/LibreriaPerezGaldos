/*
  # Limpieza de Datos para Producción

  1. Propósito
    - Eliminar todos los datos de prueba/desarrollo
    - Dejar las tablas vacías y listas para producción
    - Mantener la estructura y políticas intactas

  2. Tablas a Limpiar
    - libros (inventario mock)
    - pedidos + pedido_items (pedidos de prueba)
    - facturas + factura_items (facturas de prueba)
    - clientes (clientes de prueba)
    - cart (carritos de prueba)
    - wishlist (listas de deseos de prueba)
    - autores (autores de prueba)
    - ubicaciones (ubicaciones de prueba)

  3. Tablas a Mantener
    - usuarios (mantener usuarios reales)
    - settings (mantener configuración)

  4. Notas Importantes
    ⚠️ ESTE SCRIPT ELIMINA TODOS LOS DATOS
    ⚠️ SOLO EJECUTAR EN PRODUCCIÓN NUEVA O DESARROLLO
    ⚠️ HACER BACKUP ANTES DE EJECUTAR SI HAY DATOS IMPORTANTES
*/

-- ============================================================================
-- LIMPIEZA DE DATOS DE PRUEBA
-- ============================================================================

-- 1. Limpiar carritos y listas de deseos
-- (No tienen dependencias, se limpian primero)
DELETE FROM wishlist WHERE true;
DELETE FROM cart WHERE true;

-- 2. Limpiar items de facturas (dependen de facturas)
DELETE FROM factura_items WHERE true;

-- 3. Limpiar facturas
DELETE FROM facturas WHERE true;

-- 4. Limpiar items de pedidos (dependen de pedidos)
DELETE FROM pedido_items WHERE true;

-- 5. Limpiar pedidos
DELETE FROM pedidos WHERE true;

-- 6. Limpiar libros (mantener estructura, eliminar datos)
DELETE FROM libros WHERE true;

-- 7. Limpiar autores
DELETE FROM autores WHERE true;

-- 8. Limpiar clientes de prueba
-- (Mantener solo si hay clientes reales que quieras conservar)
DELETE FROM clientes WHERE true;

-- 9. Limpiar ubicaciones de prueba
DELETE FROM ubicaciones WHERE true;

-- ============================================================================
-- RESETEAR SECUENCIAS (OPCIONAL)
-- ============================================================================

-- Si quieres que los IDs empiecen desde 1 de nuevo, descomentar:
-- ALTER SEQUENCE libros_id_seq RESTART WITH 1;
-- ALTER SEQUENCE pedidos_id_seq RESTART WITH 1;
-- ALTER SEQUENCE facturas_id_seq RESTART WITH 1;
-- ALTER SEQUENCE clientes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE ubicaciones_id_seq RESTART WITH 1;
-- ALTER SEQUENCE autores_id_seq RESTART WITH 1;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas están vacías
DO $$
DECLARE
  libros_count INTEGER;
  pedidos_count INTEGER;
  facturas_count INTEGER;
  clientes_count INTEGER;
  cart_count INTEGER;
  wishlist_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO libros_count FROM libros;
  SELECT COUNT(*) INTO pedidos_count FROM pedidos;
  SELECT COUNT(*) INTO facturas_count FROM facturas;
  SELECT COUNT(*) INTO clientes_count FROM clientes;
  SELECT COUNT(*) INTO cart_count FROM cart;
  SELECT COUNT(*) INTO wishlist_count FROM wishlist;

  RAISE NOTICE '===== RESULTADO DE LIMPIEZA =====';
  RAISE NOTICE 'Libros: % registros', libros_count;
  RAISE NOTICE 'Pedidos: % registros', pedidos_count;
  RAISE NOTICE 'Facturas: % registros', facturas_count;
  RAISE NOTICE 'Clientes: % registros', clientes_count;
  RAISE NOTICE 'Cart: % registros', cart_count;
  RAISE NOTICE 'Wishlist: % registros', wishlist_count;
  RAISE NOTICE '==================================';

  IF libros_count = 0 AND pedidos_count = 0 AND facturas_count = 0 THEN
    RAISE NOTICE '✅ Base de datos limpia y lista para producción';
  ELSE
    RAISE WARNING '⚠️ Algunas tablas aún tienen datos';
  END IF;
END $$;
