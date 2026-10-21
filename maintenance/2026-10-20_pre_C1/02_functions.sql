-- Definiciones previas a C1.
CREATE OR REPLACE FUNCTION public.admin_merge_categories(p_book_ids bigint[], p_new_category_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check permission ONCE
    IF NOT (SELECT is_editor()) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Update ALL books instantly
    UPDATE libros
    SET categoria_id = p_new_category_id,
        updated_at = NOW()
    WHERE id = ANY(p_book_ids);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_all()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol IN (1, 2, 3, 4), false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_order_and_deduct_stock(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_detalle RECORD;
BEGIN
  -- Verificar que el pedido existe y está en un estado que permite confirmar
  IF NOT EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE id = p_pedido_id 
    AND estado IN ('payment_pending', 'pendiente', 'pending_verification')
  ) THEN
    RAISE LOG '[confirm_order] Pedido % no encontrado o en estado incorrecto', p_pedido_id;
    RETURN FALSE;
  END IF;

  -- 1. Descontar stock para cada libro en el pedido
  FOR v_detalle IN
    SELECT pd.libro_id, pd.cantidad
    FROM public.pedido_detalles pd
    WHERE pd.pedido_id = p_pedido_id
      AND pd.libro_id IS NOT NULL
  LOOP
    UPDATE public.libros
    SET stock = GREATEST(0, stock - v_detalle.cantidad)
    WHERE id = v_detalle.libro_id;
    
    RAISE LOG '[confirm_order] Pedido %, Libro %: descontadas % unidades', 
      p_pedido_id, v_detalle.libro_id, v_detalle.cantidad;
  END LOOP;

  -- 2. Actualizar el estado del pedido a 'procesando'
  UPDATE public.pedidos
  SET estado = 'procesando'
  WHERE id = p_pedido_id;

  -- 3. Registrar en auditoría
  INSERT INTO public.auditoria (tabla, registro_id, accion, datos_nuevos)
  VALUES ('pedidos', p_pedido_id, 'CONFIRM_AND_DEDUCT', '{"estado": "procesando", "stock_deducted": true}')
  ON CONFLICT DO NOTHING;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[confirm_order] ERROR en pedido %: %', p_pedido_id, SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrement_stock(row_id bigint, amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.libros
  SET stock = GREATEST(0, stock - amount)
  WHERE id = row_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.deduct_stock_force(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_detalle RECORD;
  v_current_stock integer;
BEGIN
    -- A cancelled missing-stock order must never deduct or restore inventory again.
    PERFORM 1 FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND estado::text = 'sin_stock') THEN
        RETURN false;
    END IF;
  -- Verificar que el pedido existe
  IF NOT EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id) THEN
    RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id;
  END IF;

  -- Iterar sobre cada línea de detalle del pedido que tenga un libro asociado
  FOR v_detalle IN
    SELECT pd.libro_id, pd.cantidad
    FROM public.pedido_detalles pd
    WHERE pd.pedido_id = p_pedido_id
      AND pd.libro_id IS NOT NULL
  LOOP
    -- Obtener stock actual
    SELECT stock INTO v_current_stock
    FROM public.libros
    WHERE id = v_detalle.libro_id;

    -- Descontar stock (no bajar de 0)
    UPDATE public.libros
    SET stock = GREATEST(0, stock - v_detalle.cantidad)
    WHERE id = v_detalle.libro_id;
    
    RAISE LOG '[deduct_stock_force] Pedido %, Libro %: stock % -> %', 
      p_pedido_id, v_detalle.libro_id, v_current_stock, 
      GREATEST(0, v_current_stock - v_detalle.cantidad);
  END LOOP;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[deduct_stock_force] ERROR en pedido %: %', p_pedido_id, SQLERRM;
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_reservations(p_page integer DEFAULT 1, p_limit integer DEFAULT 10)
 RETURNS TABLE(id integer, usuario_id text, libro_id integer, estado text, fecha_expiracion timestamp with time zone, fecha_confirmacion timestamp with time zone, fecha_rechazo timestamp with time zone, confirmado_por text, rechazado_por text, updated_at timestamp with time zone, created_at timestamp with time zone, usuario_email text, usuario_nombre_completo text, libro_titulo text, libro_legacy_id text, libro_stock integer, libro_imagen_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use existing is_admin() SECURITY DEFINER function
  IF NOT is_admin() AND NOT can_view_all() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.usuario_id::TEXT,
    r.libro_id,
    r.estado,
    r.fecha_expiracion,
    r.fecha_confirmacion,
    r.fecha_rechazo,
    r.confirmado_por::TEXT,
    r.rechazado_por::TEXT,
    r.updated_at,
    r.created_at,
    u.email AS usuario_email,
    COALESCE(u.nombre_completo, u.nombre, u.username, 'Sin nombre') AS usuario_nombre_completo,
    l.titulo AS libro_titulo,
    l.legacy_id AS libro_legacy_id,
    l.stock AS libro_stock,
    l.imagen_url AS libro_imagen_url
  FROM reservas r
  LEFT JOIN usuarios u ON u.id = r.usuario_id
  LEFT JOIN libros l ON l.id = r.libro_id
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET (p_page - 1) * p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_reservations_count()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count BIGINT;
BEGIN
  IF NOT is_admin() AND NOT can_view_all() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(*) INTO v_count FROM reservas;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hard_delete_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_max_id BIGINT;
    v_deleted_count INT;
BEGIN
    -- 1. Intentar eliminar dependencias de forma segura (ignorando errores si la columna no existe)
    
    -- Notificaciones
    BEGIN
        DELETE FROM notificaciones WHERE pedido_id = p_order_id;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignorar si falla (ej. columna no existe)
    END;

    -- Envios
    BEGIN
        DELETE FROM envios WHERE pedido_id = p_order_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Facturas
    BEGIN
        DELETE FROM facturas WHERE pedido_id = p_order_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Detalles de Pedido (Esto DEBE existir)
    DELETE FROM pedido_detalles WHERE pedido_id = p_order_id;

    -- 2. Eliminar el pedido principal
    DELETE FROM pedidos WHERE id = p_order_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pedido no encontrado');
    END IF;

    -- 3. Calcular el nuevo ID máximo y resetear secuencia
    SELECT MAX(id) INTO v_max_id FROM pedidos;
    
    IF v_max_id IS NULL THEN
        PERFORM setval('pedidos_id_seq', 1, false);
        RETURN jsonb_build_object('success', true, 'message', 'Pedido eliminado. Secuencia reiniciada.');
    END IF;
    
    PERFORM setval('pedidos_id_seq', v_max_id, true);
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', format('Pedido eliminado. Secuencia ajustada a %s', v_max_id)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol IN (1, 2), false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_editor()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol IN (1, 2, 3), false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_rol INT;
BEGIN
  SELECT rol_id INTO user_rol
  FROM usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_rol = 1, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_stock_force(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_detalle RECORD;
BEGIN
    -- A cancelled missing-stock order must never deduct or restore inventory again.
    PERFORM 1 FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND estado::text = 'sin_stock') THEN
        RETURN false;
    END IF;
    FOR v_detalle IN
        SELECT *
        FROM pedido_detalles
        WHERE pedido_id = p_pedido_id
    LOOP
        IF v_detalle.libro_id IS NOT NULL THEN
            UPDATE libros
            SET stock = stock + v_detalle.cantidad,
                updated_at = NOW()
            WHERE id = v_detalle.libro_id;
        END IF;
    END LOOP;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$function$
;
