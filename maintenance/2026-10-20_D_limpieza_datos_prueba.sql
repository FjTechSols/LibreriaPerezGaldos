-- =====================================================================================
-- Limpieza de los datos de prueba que dejó 2026-10-21_D_verify.sql al ejecutarse sin
-- ROLLBACK (2026-10-20 13:58:17 UTC).
--   · Pedidos sintéticos 2530–2537 (cliente de prueba, sin cobro) y sus líneas.
--   · Factura 2026-0099 (pedido 2534) y su línea: es la última; la siguiente real vuelve a ser 2026-0099.
--   · Auditoría 3570–3580 de esas acciones.
--   · Stock del libro 1008460 ("LA PERFECCION DEL YOGA"): la prueba lo dejó a 0.
--     >>> Poner el stock real antes de ejecutar (no hay registro del valor anterior). <<<
-- Cada borrado comprueba que afecta exactamente a lo esperado; si no, aborta sin cambios.
-- =====================================================================================
BEGIN;

DO $$
DECLARE
  c_stock_real CONSTANT int := 1;
  c_marca CONSTANT timestamptz := '2026-10-20 13:58:17.230434+00';
  c_factura CONSTANT uuid := '2f4ec617-cc64-4ed7-b6b9-7111ff99240a';
  n int;
BEGIN
  IF c_stock_real IS NULL OR c_stock_real < 0 THEN
    RAISE EXCEPTION 'Falta el stock real del libro 1008460 (c_stock_real).';
  END IF;

  -- Factura de prueba (las líneas caen en cascada)
  IF EXISTS (SELECT 1 FROM invoices WHERE created_at > c_marca) THEN
    RAISE EXCEPTION 'Hay facturas posteriores a la de prueba: revisar antes de borrar la 2026-0099.';
  END IF;
  DELETE FROM invoices WHERE id = c_factura AND invoice_number = '2026-0099' AND order_id = '2534' AND created_at = c_marca;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Factura de prueba: esperaba 1 fila, encontré %', n; END IF;

  -- Pedidos de prueba (líneas, envíos y documentos caen en cascada)
  DELETE FROM pedidos WHERE id BETWEEN 2530 AND 2537 AND created_at = c_marca;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 8 THEN RAISE EXCEPTION 'Pedidos de prueba: esperaba 8 filas, encontré %', n; END IF;

  -- Auditoría de las acciones de prueba
  DELETE FROM auditoria WHERE id BETWEEN 3570 AND 3580 AND tabla = 'pedidos'
    AND registro_id BETWEEN 2530 AND 2537 AND fecha = c_marca;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 11 THEN RAISE EXCEPTION 'Auditoría de prueba: esperaba 11 filas, encontré %', n; END IF;

  -- Stock del libro usado en la prueba
  UPDATE libros SET stock = c_stock_real WHERE id = 1008460 AND stock = 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Libro 1008460: esperaba stock 0 para restaurar, no coincide.'; END IF;

  -- Constancia de la limpieza
  INSERT INTO auditoria (tabla, registro_id, accion, datos_nuevos)
  VALUES ('pedidos', 2530, 'LIMPIEZA_PRUEBA', jsonb_build_object(
    'motivo', 'Datos de prueba de la verificación D ejecutada sin ROLLBACK',
    'pedidos', '2530-2537', 'factura', '2026-0099', 'auditoria', '3570-3580',
    'libro_1008460_stock', c_stock_real));
END $$;

SELECT
  (SELECT count(*) FROM pedidos WHERE id BETWEEN 2530 AND 2537) AS pedidos_prueba,
  (SELECT max(invoice_number) FROM invoices) AS ultima_factura,
  (SELECT stock FROM libros WHERE id = 1008460) AS stock_libro;

COMMIT;
