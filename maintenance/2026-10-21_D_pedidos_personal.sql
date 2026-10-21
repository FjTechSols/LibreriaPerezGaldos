-- =====================================================================================
-- Migración D (aditiva): acciones de personal sobre pedidos (app y, más adelante, web)
-- Proyecto weaihscsaqxadxjgsfbt · 2026-10-21
--
-- Decisiones del usuario:
--   - Gestionan pedidos: super_admin, admin y editor (visualizador solo consulta).
--   - Regla de stock: EXACTAMENTE la de la web hoy (pedidoService.actualizarEstadoPedido):
--       descuenta al pasar a procesando/enviado/completado desde un estado sin descuento
--       (salvo express/flash, que descuentan al crearse); restaura al cancelar/devolver
--       (express/flash si no estaba ya cancelado/devuelto; resto solo si venía de
--       procesando/enviado/completado). Nunca baja de 0.
--   - Cancelar por falta de stock: la función existente (los libros que faltan quedan a 0).
--   - Facturas desde pedido: solo super_admin y admin.
--
-- Todas las funciones: SECURITY DEFINER, guarda de rol al inicio, bloqueo del pedido
-- (FOR UPDATE) antes de leer su estado, y auditoría con el usuario. Funcionan igual
-- antes y después del cierre de permisos (paso C).
--
-- Crea:
--   1. aceptar_pedido_web(bigint, numeric)
--   2. cambiar_estado_pedido(bigint, text, text, text, text)
--   3. guardar_envio_pedido(bigint, text, text, timestamptz)
--   4. emitir_factura_pedido(bigint, text)
-- Modifica:
--   5. cancel_order_out_of_stock: solo la guarda (is_admin -> super_admin/admin/editor)
--
-- Deshacer: bloque "ROLLBACK" al final.
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
-- 1. Aceptar un pedido web fijando el coste real del envío
--    pending_verification -> payment_pending; total = Σ líneas + envío. subtotal/iva no cambian.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aceptar_pedido_web(p_pedido_id bigint, p_coste_envio numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_lineas int;
  v_importe numeric;
  v_total numeric;
  v_usuario record;
BEGIN
  IF NOT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor']) THEN
    RAISE EXCEPTION 'No tienes permiso para aceptar pedidos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrado'); END IF;
  IF v_pedido.tipo::text <> 'interno' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'tipo_no_valido', 'tipo', v_pedido.tipo);
  END IF;
  IF v_pedido.estado::text <> 'pending_verification' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'estado_no_valido', 'estado_actual', v_pedido.estado);
  END IF;
  IF p_coste_envio IS NULL OR p_coste_envio < 0 OR p_coste_envio > 500 OR round(p_coste_envio, 2) <> p_coste_envio THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'coste_no_valido');
  END IF;

  PERFORM 1 FROM public.pedido_detalles WHERE pedido_id = p_pedido_id FOR UPDATE;
  SELECT count(*), round(coalesce(sum(cantidad * precio_unitario), 0), 2)
    INTO v_lineas, v_importe
  FROM public.pedido_detalles WHERE pedido_id = p_pedido_id;
  IF v_lineas = 0 THEN RETURN jsonb_build_object('ok', false, 'codigo', 'sin_lineas'); END IF;

  v_total := v_importe + p_coste_envio;

  UPDATE public.pedidos
     SET coste_envio = p_coste_envio, total = v_total, estado = 'payment_pending'
   WHERE id = p_pedido_id;

  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
  VALUES ('pedidos', p_pedido_id, 'UPDATE', public.get_current_user_id(),
          jsonb_build_object('coste_envio', v_pedido.coste_envio, 'total', v_pedido.total, 'estado', v_pedido.estado),
          jsonb_build_object('coste_envio', p_coste_envio, 'total', v_total, 'estado', 'payment_pending'));

  SELECT email, coalesce(nullif(btrim(nombre_completo), ''), nullif(btrim(nombre), ''), username) AS nombre
    INTO v_usuario FROM public.usuarios WHERE id = v_pedido.usuario_id;

  RETURN jsonb_build_object(
    'ok', true, 'pedido_id', p_pedido_id,
    'importe_productos', v_importe, 'coste_envio', p_coste_envio,
    'coste_envio_estimado', coalesce(v_pedido.coste_envio, 0), 'total', v_total,
    'ajustado', coalesce(v_pedido.coste_envio, 0) <> p_coste_envio,
    'usuario', jsonb_build_object('email', v_usuario.email, 'nombre', v_usuario.nombre));
END;
$function$;

REVOKE ALL ON FUNCTION public.aceptar_pedido_web(bigint, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceptar_pedido_web(bigint, numeric) TO authenticated;

-- -------------------------------------------------------------------------------------
-- 2. Cambiar el estado de un pedido con la regla de stock de la web
--    p_estado_esperado: el estado que vio el personal; si ha cambiado -> 'conflicto'.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cambiar_estado_pedido(
  p_pedido_id bigint,
  p_estado_nuevo text,
  p_estado_esperado text,
  p_transportista text DEFAULT NULL,
  p_tracking text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_actual text;
  v_tipo text;
  v_inmediato boolean;
  v_descontados constant text[] := ARRAY['procesando', 'enviado', 'completado'];
  v_accion text := 'ninguna';
  v_stock jsonb := '[]'::jsonb;
  v_item record;
  v_transportista text := nullif(btrim(p_transportista), '');
  v_tracking text := nullif(btrim(p_tracking), '');
  v_usuario record;
  v_cliente record;
BEGIN
  IF NOT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor']) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar pedidos.' USING ERRCODE = '42501';
  END IF;

  IF p_estado_nuevo IS NULL OR p_estado_nuevo NOT IN ('pendiente', 'procesando', 'enviado', 'completado', 'cancelado', 'devolucion') THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'destino_no_valido');
  END IF;
  IF length(v_transportista) > 100 OR length(v_tracking) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'envio_no_valido');
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrado'); END IF;
  v_actual := v_pedido.estado::text;
  v_tipo := v_pedido.tipo::text;

  IF v_actual = 'sin_stock' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'sin_stock_cerrado');
  END IF;
  IF v_actual = p_estado_nuevo THEN
    RETURN jsonb_build_object('ok', true, 'ya_aplicado', true, 'estado_nuevo', v_actual);
  END IF;
  IF v_actual IS DISTINCT FROM p_estado_esperado THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'conflicto', 'estado_actual', v_actual);
  END IF;

  IF v_tipo = 'interno' AND p_estado_nuevo = 'enviado'
     AND (coalesce(v_transportista, v_pedido.transportista) IS NULL OR coalesce(v_tracking, v_pedido.tracking) IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'falta_envio');
  END IF;

  -- Regla de stock de la web (pedidoService.actualizarEstadoPedido)
  v_inmediato := v_tipo IN ('express', 'flash');
  IF p_estado_nuevo = ANY (v_descontados) AND NOT (v_actual = ANY (v_descontados)) AND NOT v_inmediato THEN
    v_accion := 'descontar';
  ELSIF p_estado_nuevo IN ('cancelado', 'devolucion') AND (
          (v_inmediato AND v_actual NOT IN ('cancelado', 'devolucion'))
       OR (NOT v_inmediato AND v_actual = ANY (v_descontados))) THEN
    v_accion := 'restaurar';
  END IF;

  IF v_accion <> 'ninguna' THEN
    PERFORM 1 FROM public.pedido_detalles WHERE pedido_id = p_pedido_id FOR UPDATE;
    -- Bloqueo de libros en orden consistente (como cancel_order_out_of_stock)
    PERFORM l.id FROM public.libros l
     WHERE l.id IN (SELECT d.libro_id FROM public.pedido_detalles d WHERE d.pedido_id = p_pedido_id)
     ORDER BY l.id FOR UPDATE;

    FOR v_item IN
      SELECT l.id, coalesce(l.stock, 0) AS stock, sum(d.cantidad)::int AS cantidad
      FROM public.pedido_detalles d JOIN public.libros l ON l.id = d.libro_id
      WHERE d.pedido_id = p_pedido_id
      GROUP BY l.id, l.stock ORDER BY l.id
    LOOP
      IF v_accion = 'descontar' THEN
        UPDATE public.libros SET stock = GREATEST(0, coalesce(stock, 0) - v_item.cantidad) WHERE id = v_item.id;
        v_stock := v_stock || jsonb_build_array(jsonb_build_object(
          'libro_id', v_item.id, 'anterior', v_item.stock, 'nuevo', GREATEST(0, v_item.stock - v_item.cantidad),
          'insuficiente', v_item.stock < v_item.cantidad));
      ELSE
        UPDATE public.libros SET stock = coalesce(stock, 0) + v_item.cantidad WHERE id = v_item.id;
        v_stock := v_stock || jsonb_build_array(jsonb_build_object(
          'libro_id', v_item.id, 'anterior', v_item.stock, 'nuevo', v_item.stock + v_item.cantidad, 'insuficiente', false));
      END IF;
    END LOOP;
  END IF;

  UPDATE public.pedidos
     SET estado = p_estado_nuevo::estado_pedido,
         transportista = coalesce(v_transportista, transportista),
         tracking = coalesce(v_tracking, tracking)
   WHERE id = p_pedido_id;

  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
  VALUES ('pedidos', p_pedido_id, 'UPDATE', public.get_current_user_id(),
          jsonb_build_object('estado', v_actual, 'transportista', v_pedido.transportista, 'tracking', v_pedido.tracking),
          jsonb_build_object('estado', p_estado_nuevo, 'transportista', coalesce(v_transportista, v_pedido.transportista),
                             'tracking', coalesce(v_tracking, v_pedido.tracking), 'stock', v_accion, 'detalle_stock', v_stock));

  SELECT email, coalesce(nullif(btrim(nombre_completo), ''), nullif(btrim(nombre), ''), username) AS nombre
    INTO v_usuario FROM public.usuarios WHERE id = v_pedido.usuario_id;
  SELECT email, tipo, nombre, apellidos INTO v_cliente FROM public.clientes WHERE id = v_pedido.cliente_id;

  RETURN jsonb_build_object(
    'ok', true, 'ya_aplicado', false,
    'estado_anterior', v_actual, 'estado_nuevo', p_estado_nuevo, 'tipo', v_tipo,
    'stock_accion', v_accion, 'stock', v_stock,
    'libros_afectados', coalesce((SELECT jsonb_agg(e->'libro_id') FROM jsonb_array_elements(v_stock) e), '[]'::jsonb),
    'transportista', coalesce(v_transportista, v_pedido.transportista),
    'tracking', coalesce(v_tracking, v_pedido.tracking),
    'total', v_pedido.total,
    'usuario', CASE WHEN v_usuario.email IS NULL THEN NULL ELSE jsonb_build_object('email', v_usuario.email, 'nombre', v_usuario.nombre) END,
    'cliente', CASE WHEN v_cliente.email IS NULL THEN NULL ELSE jsonb_build_object('email', v_cliente.email, 'tipo', v_cliente.tipo,
               'nombre', btrim(concat_ws(' ', v_cliente.nombre, v_cliente.apellidos))) END);
END;
$function$;

REVOKE ALL ON FUNCTION public.cambiar_estado_pedido(bigint, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_pedido(bigint, text, text, text, text) TO authenticated;

-- -------------------------------------------------------------------------------------
-- 3. Guardar transportista y seguimiento sin cambiar el estado
--    p_actualizado_esperado: updated_at que vio el personal; si cambió -> 'conflicto'.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_envio_pedido(
  p_pedido_id bigint,
  p_transportista text,
  p_tracking text,
  p_actualizado_esperado timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_transportista text := nullif(btrim(p_transportista), '');
  v_tracking text := nullif(btrim(p_tracking), '');
BEGIN
  IF NOT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor']) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar pedidos.' USING ERRCODE = '42501';
  END IF;
  IF length(v_transportista) > 100 OR length(v_tracking) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'envio_no_valido');
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrado'); END IF;
  IF v_pedido.updated_at IS DISTINCT FROM p_actualizado_esperado THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'conflicto', 'estado_actual', v_pedido.estado);
  END IF;

  UPDATE public.pedidos SET transportista = v_transportista, tracking = v_tracking WHERE id = p_pedido_id;

  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
  VALUES ('pedidos', p_pedido_id, 'UPDATE', public.get_current_user_id(),
          jsonb_build_object('transportista', v_pedido.transportista, 'tracking', v_pedido.tracking),
          jsonb_build_object('transportista', v_transportista, 'tracking', v_tracking));

  RETURN jsonb_build_object('ok', true, 'transportista', v_transportista, 'tracking', v_tracking);
END;
$function$;

REVOKE ALL ON FUNCTION public.guardar_envio_pedido(bigint, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_envio_pedido(bigint, text, text, timestamptz) TO authenticated;

-- -------------------------------------------------------------------------------------
-- 4. Factura desde pedido (super_admin y admin), con numeración centralizada.
--    Bloquea el pedido primero: serializa con confirmar_pago_pedido y con reintentos,
--    así no se crean facturas duplicadas del mismo pedido.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.emitir_factura_pedido(p_pedido_id bigint, p_estado text DEFAULT 'Pagada')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_existia boolean;
  v_factura uuid;
  v_numero text;
BEGIN
  IF NOT public.tiene_algun_rol(ARRAY['super_admin', 'admin']) THEN
    RAISE EXCEPTION 'Solo administradores pueden emitir facturas.' USING ERRCODE = '42501';
  END IF;
  IF p_estado IS NULL OR p_estado NOT IN ('Pendiente', 'Pagada') THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'estado_factura_no_valido');
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'codigo', 'no_encontrado'); END IF;
  IF v_pedido.estado::text IN ('cancelado', 'sin_stock', 'pending_verification') THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'estado_no_valido', 'estado_actual', v_pedido.estado);
  END IF;

  v_existia := EXISTS (SELECT 1 FROM public.invoices WHERE order_id = p_pedido_id::text);
  v_factura := public.crear_factura_desde_pedido(p_pedido_id, p_estado);
  SELECT invoice_number INTO v_numero FROM public.invoices WHERE id = v_factura;

  IF NOT v_existia THEN
    INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, datos_nuevos)
    VALUES ('pedidos', p_pedido_id, 'FACTURA_EMITIDA', public.get_current_user_id(),
            jsonb_build_object('factura_id', v_factura, 'numero', v_numero, 'estado', p_estado));
  END IF;

  RETURN jsonb_build_object('ok', true, 'factura_id', v_factura, 'numero', v_numero, 'creada', NOT v_existia);
END;
$function$;

REVOKE ALL ON FUNCTION public.emitir_factura_pedido(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emitir_factura_pedido(bigint, text) TO authenticated;

-- -------------------------------------------------------------------------------------
-- 5. cancel_order_out_of_stock: solo cambia la guarda (antes is_admin(), que tras el
--    cierre dejaría fuera a los editores). Cuerpo idéntico a 2026-10-18_cancel_order_out_of_stock.sql
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order_out_of_stock(p_pedido_id bigint, p_libros_sin_stock integer[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    current_order record;
    item record;
    restore_remaining boolean;
    missing_ids integer[];
    stock_changes jsonb := '[]'::jsonb;
BEGIN
    IF NOT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor']) THEN RAISE EXCEPTION 'Solo el personal puede cancelar por falta de stock' USING ERRCODE = '42501'; END IF;
    SELECT * INTO current_order FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
    -- Retried or double-clicked requests must never restore stock twice.
    IF current_order.estado::text = 'sin_stock' THEN RETURN true; END IF;
    SELECT array_agg(DISTINCT id) INTO missing_ids FROM unnest(p_libros_sin_stock) AS id WHERE id IS NOT NULL;
    IF coalesce(array_length(missing_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'Selecciona al menos un libro sin stock'; END IF;
    PERFORM id FROM public.pedido_detalles WHERE pedido_id = p_pedido_id FOR UPDATE;
    IF EXISTS (
        SELECT 1 FROM unnest(missing_ids) AS selected(id)
        WHERE NOT EXISTS (SELECT 1 FROM public.pedido_detalles d JOIN public.libros l ON l.id = d.libro_id WHERE d.pedido_id = p_pedido_id AND d.libro_id = selected.id)
    ) THEN RAISE EXCEPTION 'Hay libros seleccionados que no pertenecen al pedido'; END IF;
    -- Always acquire book locks in a consistent order, including repeated book lines.
    PERFORM l.id FROM public.libros l
    WHERE l.id IN (SELECT d.libro_id FROM public.pedido_detalles d WHERE d.pedido_id = p_pedido_id)
    ORDER BY l.id FOR UPDATE;
    restore_remaining := coalesce(current_order.estado::text IN ('procesando', 'enviado', 'completado') OR
        (current_order.tipo::text IN ('express', 'flash') AND current_order.estado::text NOT IN ('cancelado', 'devolucion')), false);
    FOR item IN
        SELECT l.id, l.stock, sum(d.cantidad)::integer AS quantity
        FROM public.pedido_detalles d JOIN public.libros l ON l.id = d.libro_id
        WHERE d.pedido_id = p_pedido_id GROUP BY l.id, l.stock ORDER BY l.id
    LOOP
        IF item.id = ANY(missing_ids) THEN
            UPDATE public.libros SET stock = 0 WHERE id = item.id;
        ELSIF restore_remaining THEN
            UPDATE public.libros SET stock = coalesce(stock, 0) + item.quantity WHERE id = item.id;
        END IF;
        stock_changes := stock_changes || jsonb_build_array(jsonb_build_object('libro_id', item.id, 'stock_anterior', item.stock,
            'stock_nuevo', CASE WHEN item.id = ANY(missing_ids) THEN 0 WHEN restore_remaining THEN coalesce(item.stock, 0) + item.quantity ELSE item.stock END));
    END LOOP;
    UPDATE public.pedidos SET estado = 'sin_stock' WHERE id = p_pedido_id;
    INSERT INTO public.auditoria(tabla, registro_id, accion, datos_anteriores, datos_nuevos)
    VALUES ('pedidos', p_pedido_id, 'UPDATE', jsonb_build_object('estado', current_order.estado),
        jsonb_build_object('estado', 'sin_stock', 'motivo', 'Cancelado por falta de stock', 'libros_sin_stock', missing_ids, 'stock', stock_changes));
    RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.cancel_order_out_of_stock(bigint, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_out_of_stock(bigint, integer[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================================================
-- ROLLBACK (manual)
-- =====================================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.emitir_factura_pedido(bigint, text);
-- DROP FUNCTION IF EXISTS public.guardar_envio_pedido(bigint, text, text, timestamptz);
-- DROP FUNCTION IF EXISTS public.cambiar_estado_pedido(bigint, text, text, text, text);
-- DROP FUNCTION IF EXISTS public.aceptar_pedido_web(bigint, numeric);
-- -- cancel_order_out_of_stock: volver a ejecutar 2026-10-18_cancel_order_out_of_stock.sql (guarda is_admin()).
-- COMMIT;
