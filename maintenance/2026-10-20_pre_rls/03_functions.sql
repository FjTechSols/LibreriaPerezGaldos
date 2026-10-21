-- Definiciones de todas las funciones de public
-- Copia del estado de producción (proyecto weaihscsaqxadxjgsfbt) generada el 2026-10-20, antes de la corrección de permisos.
-- Generado desde pg_policies / pg_proc / pg_trigger. Solo para restaurar; revisar antes de ejecutar.

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

CREATE OR REPLACE FUNCTION public.calcular_totales_pedido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    nuevo_subtotal DECIMAL(10,2);
    nuevo_iva DECIMAL(10,2);
    nuevo_total DECIMAL(10,2);
    tasa_iva DECIMAL(5,2) := 0.21;
BEGIN
    -- Calcular subtotal sumando todos los detalles del pedido
    SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
    INTO nuevo_subtotal
    FROM pedido_detalles
    WHERE pedido_id = NEW.id;

    -- Calcular IVA
    nuevo_iva := nuevo_subtotal * tasa_iva;

    -- Calcular total
    nuevo_total := nuevo_subtotal + nuevo_iva;

    -- Actualizar valores
    NEW.subtotal := nuevo_subtotal;
    NEW.iva := nuevo_iva;
    NEW.total := nuevo_total;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_books()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN is_editor();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_invoices()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  tiene_rol BOOLEAN;
BEGIN
  -- Verificar en usuarios_roles (sistema nuevo)
  SELECT EXISTS (
    SELECT 1
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
      AND ur.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  IF tiene_rol THEN
    RETURN true;
  END IF;

  -- Verificar en usuarios.rol_id (sistema legacy)
  SELECT EXISTS (
    SELECT 1
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador')
      AND u.activo = true
      AND r.activo = true
  ) INTO tiene_rol;

  RETURN COALESCE(tiene_rol, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_orders()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN is_editor();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_users()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN is_admin();
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

CREATE OR REPLACE FUNCTION public.cancel_order_out_of_stock(p_pedido_id bigint, p_libros_sin_stock integer[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    current_order record;
    item record;
    restore_remaining boolean;
    missing_ids integer[];
    stock_changes jsonb := '[]'::jsonb;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo los administradores pueden cancelar por falta de stock' USING ERRCODE = '42501'; END IF;
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

CREATE OR REPLACE FUNCTION public.count_autor_libros(autor_id_param integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    total_libros INT;
BEGIN
    SELECT COUNT(*)
    INTO total_libros
    FROM libro_autores la
    JOIN libros l ON l.id = la.libro_id
    WHERE la.autor_id = autor_id_param
    AND l.activo = true;

    RETURN total_libros;
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

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
AS $function$
BEGIN
    RETURN public.unaccent($1);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generar_numero_factura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  nuevo_numero VARCHAR(50);
  anio INT;
  secuencia INT;
BEGIN
  -- Obtener año actual (CORREGIDO: usar issue_date en lugar de fecha_emision)
  anio := EXTRACT(YEAR FROM COALESCE(NEW.issue_date, now()));

  -- Obtener siguiente número de secuencia
  secuencia := nextval('seq_factura_numero');

  -- Generar número en formato F2024-0001
  nuevo_numero := 'F' || anio || '-' || LPAD(secuencia::TEXT, 4, '0');

  NEW.numero_factura := nuevo_numero;
  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.get_autor_libros(autor_id_param integer)
 RETURNS TABLE(libro_id integer, titulo character varying, isbn character varying, precio numeric, activo boolean, orden smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.titulo,
        l.isbn,
        l.precio,
        l.activo,
        la.orden
    FROM libro_autores la
    JOIN libros l ON l.id = la.libro_id
    WHERE la.autor_id = autor_id_param
    AND l.activo = true
    ORDER BY la.orden, l.titulo;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_book_average_rating(book_id bigint)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM reviews
  WHERE libro_id = book_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_book_counts_by_category()
 RETURNS TABLE(category_name text, total_count bigint, in_stock_count bigint)
 LANGUAGE plpgsql
AS $function$ BEGIN RETURN QUERY
SELECT COALESCE(c.nombre, 'Sin categoría') as category_name,
    COUNT(l.id) as total_count,
    COUNT(
        CASE
            WHEN l.stock > 0 THEN 1
        END
    ) as in_stock_count
FROM libros l
    LEFT JOIN categorias c ON l.categoria_id = c.id
GROUP BY COALESCE(c.nombre, 'Sin categoría')
ORDER BY total_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_book_review_count(book_id bigint)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COUNT(*)
  FROM reviews
  WHERE libro_id = book_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM public.usuarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN user_uuid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_libro_autores(libro_id_param integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    autores_list TEXT;
BEGIN
    SELECT STRING_AGG(a.nombre, ', ' ORDER BY la.orden)
    INTO autores_list
    FROM libro_autores la
    JOIN autores a ON a.id = la.autor_id
    WHERE la.libro_id = libro_id_param
    AND a.activo = true;

    RETURN COALESCE(autores_list, '');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_total_books_stock()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN (SELECT COALESCE(SUM(stock), 0) FROM libros WHERE activo = true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_total_stock_units()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(stock), 0) INTO total 
  FROM libros 
  WHERE activo = true;
  
  RETURN total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.guard_out_of_stock_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    IF OLD.estado::text = 'sin_stock' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
        RAISE EXCEPTION 'El pedido está cancelado por falta de stock. Comprueba el inventario y crea un nuevo pedido para retomarlo.';
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuarios (auth_user_id, username, email, rol_id, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    2,  -- usuarios nuevos = rol normal
    true
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_reservation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE admin_record RECORD;
user_name TEXT;
book_title TEXT;
BEGIN -- Get User Name
SELECT nombre_completo INTO user_name
FROM public.usuarios
WHERE id = NEW.usuario_id;
-- Get Book Title
SELECT titulo INTO book_title
FROM public.libros
WHERE id = NEW.libro_id;
-- Fallback values if null
IF user_name IS NULL THEN user_name := 'Usuario';
END IF;
IF book_title IS NULL THEN book_title := 'Libro desconocido';
END IF;
-- Loop through all admins (role 1 and 2)
FOR admin_record IN
SELECT id
FROM public.usuarios
WHERE rol_id IN (1, 2) LOOP
INSERT INTO public.notificaciones (
        usuario_id,
        tipo,
        titulo,
        mensaje,
        reserva_id,
        leida,
        created_at
    )
VALUES (
        admin_record.id,
        'reserva_creada',
        'Nueva Reserva',
        'Nueva solicitud de reserva: ' || user_name || ' ha reservado "' || book_title || '"',
        NEW.id,
        false,
        NOW()
    );
END LOOP;
RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuarios (auth_user_id, username, email, rol_id, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    2,
    true
  );
  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.mobile_book_author_key(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT coalesce(string_agg(DISTINCT token,' ' ORDER BY token),'')
  FROM regexp_split_to_table(public.mobile_book_text_key(coalesce(nullif(btrim(value),''),'Anónimo')),' ') AS token
  WHERE length(token)>1 AND token ~ '[[:alpha:]]' AND token NOT IN ('de','del','la','el','los','las','y','and');
$function$
;

CREATE OR REPLACE FUNCTION public.mobile_book_text_key(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT btrim(regexp_replace(public.f_unaccent(lower(coalesce(value,''))), '[^[:alnum:]]+', ' ', 'g'));
$function$
;

CREATE OR REPLACE FUNCTION public.mobile_check_book_candidates(p_code text DEFAULT ''::text, p_isbn text DEFAULT ''::text, p_title text DEFAULT ''::text, p_author text DEFAULT ''::text, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE result jsonb; title_pattern text; author_pattern text; aliases text[]; code_id integer; author_tokens text[];
BEGIN
  IF auth.uid() IS NULL OR NOT (coalesce(public.can_manage_books(),false) OR coalesce(public.can_view_all(),false)) THEN RAISE EXCEPTION 'Acceso de personal requerido' USING ERRCODE='42501'; END IF;
  IF p_offset < 0 OR p_offset > 100000 OR length(p_code)>64 OR length(p_title)>500 OR length(p_author)>255 OR length(p_isbn)>64 THEN RAISE EXCEPTION 'Búsqueda no válida'; END IF;
  IF btrim(p_code||p_isbn||p_title||p_author)='' THEN RAISE EXCEPTION 'Introduce al menos un criterio'; END IF;
  IF p_isbn<>'' AND public.mobile_isbn13(p_isbn) IS NULL THEN RAISE EXCEPTION 'ISBN no válido'; END IF;
  aliases := public.mobile_isbn_aliases(p_isbn);
  IF p_code ~ '^[0-9]{1,10}$' THEN
    IF p_code::numeric BETWEEN 1 AND 2147483647 THEN code_id := p_code::integer; END IF;
  END IF;
  title_pattern := '%' || replace(replace(replace(public.f_unaccent(lower(btrim(p_title))),'\','\\'),'%','\%'),'_','\_') || '%';
  author_pattern := '%' || replace(replace(replace(public.f_unaccent(lower(btrim(p_author))),'\','\\'),'%','\%'),'_','\_') || '%';
  author_tokens := string_to_array(public.mobile_book_author_key(p_author),' ');
  SELECT jsonb_build_object('books',coalesce(jsonb_agg(row_data ORDER BY rank,id) FILTER(WHERE position<=20),'[]'::jsonb),'hasMore',coalesce(bool_or(position=21),false)) INTO result
  FROM (
    SELECT row_number() OVER(ORDER BY rank,id) AS position, ranked.* FROM (
      SELECT l.id,
        CASE WHEN p_code<>'' AND (upper(l.legacy_id)=upper(btrim(p_code)) OR l.id=code_id) THEN 0
             WHEN public.mobile_isbn_key(l.isbn)=ANY(aliases) THEN 1 ELSE 2 END AS rank,
        jsonb_build_object('id',l.id,'legacy_id',l.legacy_id,'titulo',l.titulo,'autor',l.autor,'isbn',l.isbn,'precio',l.precio,'stock',l.stock,'ubicacion',l.ubicacion,'estado',l.estado,'idioma',l.idioma,'activo',l.activo,'imagen_url',l.imagen_url,'editorial',e.nombre,'anio',l.anio) AS row_data
      FROM public.libros l LEFT JOIN public.editoriales e ON e.id=l.editorial_id
      WHERE (p_code<>'' AND (upper(l.legacy_id)=upper(btrim(p_code)) OR l.id=code_id))
         OR (cardinality(aliases)>0 AND public.mobile_isbn_key(l.isbn)=ANY(aliases))
         OR ((p_title<>'' OR p_author<>'')
           AND (p_title='' OR public.f_unaccent(lower(l.titulo)) LIKE title_pattern OR public.mobile_book_text_key(l.titulo)=public.mobile_book_text_key(p_title))
           AND (p_author='' OR public.f_unaccent(lower(l.autor)) LIKE author_pattern
             OR (cardinality(author_tokens)>0 AND public.f_unaccent(lower(l.autor)) LIKE '%'||author_tokens[1]||'%'
                 AND NOT EXISTS(SELECT 1 FROM unnest(author_tokens) AS token WHERE public.f_unaccent(lower(l.autor)) NOT LIKE '%'||token||'%'))))
      ORDER BY rank,l.id OFFSET p_offset LIMIT 21
    ) ranked
  ) ranked_page;
  RETURN result;
END $function$
;

CREATE OR REPLACE FUNCTION public.mobile_isbn13(value text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE code text := public.mobile_isbn_key(coalesce(value,'')); total integer := 0; i integer; digit integer;
BEGIN
  IF code ~ '^[0-9]{9}[0-9X]$' THEN
    FOR i IN 1..10 LOOP
      digit := CASE WHEN substr(code,i,1)='X' THEN 10 ELSE substr(code,i,1)::integer END;
      total := total + digit * (11-i);
    END LOOP;
    IF total % 11 <> 0 THEN RETURN NULL; END IF;
    code := '978' || left(code,9); total := 0;
    FOR i IN 1..12 LOOP total := total + substr(code,i,1)::integer * CASE WHEN i%2=0 THEN 3 ELSE 1 END; END LOOP;
    RETURN code || ((10-total%10)%10)::text;
  ELSIF code ~ '^97[89][0-9]{10}$' THEN
    FOR i IN 1..13 LOOP total := total + substr(code,i,1)::integer * CASE WHEN i%2=0 THEN 3 ELSE 1 END; END LOOP;
    IF total%10=0 THEN RETURN code; END IF;
  END IF;
  RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.mobile_isbn_aliases(value text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE code text := public.mobile_isbn13(value); base text; total integer := 0; i integer; check_digit integer;
BEGIN
  IF code IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  IF left(code,3) <> '978' THEN RETURN ARRAY[code]; END IF;
  base := substr(code,4,9);
  FOR i IN 1..9 LOOP total := total + substr(base,i,1)::integer * (11-i); END LOOP;
  check_digit := (11-total%11)%11;
  RETURN ARRAY[code, base || CASE WHEN check_digit=10 THEN 'X' ELSE check_digit::text END];
END $function$
;

CREATE OR REPLACE FUNCTION public.mobile_isbn_key(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT regexp_replace(upper(value), '[-[:space:]]', '', 'g');
$function$
;

CREATE OR REPLACE FUNCTION public.mobile_receive_book(p_request_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  prior public.mobile_book_receipts%ROWTYPE; result_book public.libros%ROWTYPE;
  b jsonb := p_payload->'book'; operation text := p_payload->>'action';
  qty integer; isbn_value text; aliases text[]; publisher_id integer; category integer;
  location_name text; location_key text; suffix text; next_number bigint; next_code text;
  amount numeric; original_amount numeric; condition_value text; new_result jsonb; i integer; title_value text; author_value text;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.can_manage_books(),false) THEN RAISE EXCEPTION 'No tienes permiso para recibir libros' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_payload IS NULL OR operation NOT IN ('create','add_stock') OR operation IS NULL THEN RAISE EXCEPTION 'Operación no válida'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('mobile-receipt:'||p_request_id::text,0));
  SELECT * INTO prior FROM public.mobile_book_receipts WHERE request_id=p_request_id;
  IF FOUND THEN
    IF prior.actor_id<>auth.uid() OR prior.payload_hash<>md5(p_payload::text) THEN RAISE EXCEPTION 'El identificador ya pertenece a otra operación'; END IF;
    RETURN prior.result || jsonb_build_object('replayed',true);
  END IF;
  IF operation='add_stock' THEN
    IF coalesce(p_payload->>'quantity','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Cantidad no válida'; END IF;
    qty := (p_payload->>'quantity')::integer;
    IF qty<1 OR qty>100000 THEN RAISE EXCEPTION 'La cantidad debe estar entre 1 y 100000'; END IF;
    SELECT * INTO result_book FROM public.libros WHERE id=(p_payload->>'book_id')::integer FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Libro no disponible'; END IF;
    IF coalesce(result_book.stock,0)<0 THEN RAISE EXCEPTION 'El stock actual no es válido. Corrígelo en la ficha antes de recibir ejemplares.'; END IF;
    IF coalesce(result_book.stock,0)::bigint + qty > 2147483647 THEN RAISE EXCEPTION 'Stock fuera de rango'; END IF;
    UPDATE public.libros SET stock=coalesce(stock,0)+qty,updated_at=now() WHERE id=result_book.id RETURNING * INTO result_book;
  ELSE
    IF jsonb_typeof(b) <> 'object' OR b IS NULL THEN RAISE EXCEPTION 'Ficha no válida'; END IF;
    title_value := btrim(b->>'titulo'); author_value := coalesce(nullif(btrim(b->>'autor'),''),'Anónimo');
    IF coalesce(title_value,'')='' OR length(title_value)>2000 OR length(author_value)>255 THEN RAISE EXCEPTION 'Revisa título y autor'; END IF;
    isbn_value := public.mobile_isbn13(b->>'isbn');
    IF coalesce(b->>'isbn','') NOT IN ('','N/A') AND isbn_value IS NULL THEN RAISE EXCEPTION 'ISBN no válido'; END IF;
    aliases := public.mobile_isbn_aliases(isbn_value);
    PERFORM pg_advisory_xact_lock(hashtextextended('mobile-book-create',0));
    IF EXISTS(SELECT 1 FROM public.libros l WHERE (cardinality(aliases)>0 AND public.mobile_isbn_key(l.isbn)=ANY(aliases))
      OR (public.mobile_book_text_key(l.titulo)=public.mobile_book_text_key(title_value) AND public.mobile_book_author_key(l.autor)=public.mobile_book_author_key(author_value)))
    THEN RAISE EXCEPTION 'MOBILE_DUPLICATE_BOOK: ya hay un libro con ese ISBN o título y autor. Vuelve a comprobar las coincidencias.'; END IF;
    qty := (b->>'stock')::integer; amount := (b->>'precio')::numeric; original_amount := nullif(b->>'precio_original','')::numeric;
    IF qty IS NULL OR qty<0 OR qty>100000 OR amount IS NULL OR amount<0 OR amount>99999999 OR amount<>round(amount,2) THEN RAISE EXCEPTION 'Revisa precio y stock'; END IF;
    IF coalesce((b->>'oferta')::boolean,false) AND (original_amount IS NULL OR original_amount<=amount) THEN RAISE EXCEPTION 'Oferta no válida'; END IF;
    category := (b->>'categoria_id')::integer;
    IF NOT EXISTS(SELECT 1 FROM public.categorias WHERE id=category AND activa IS TRUE) THEN RAISE EXCEPTION 'Selecciona una categoría activa'; END IF;
    SELECT nombre INTO location_name FROM public.ubicaciones WHERE nombre=b->>'ubicacion' AND activa IS TRUE LIMIT 1;
    IF location_name IS NULL THEN RAISE EXCEPTION 'Selecciona una ubicación activa'; END IF;
    IF nullif(b->>'anio','') IS NOT NULL AND ((b->>'anio')::integer<1 OR (b->>'anio')::integer>9999) THEN RAISE EXCEPTION 'Año no válido'; END IF;
    IF nullif(b->>'paginas','') IS NOT NULL AND (b->>'paginas')::integer<0 THEN RAISE EXCEPTION 'Páginas no válidas'; END IF;
    condition_value := nullif(b->>'estado','');
    IF condition_value IS NOT NULL AND condition_value NOT IN ('nuevo','buen_estado','leido') THEN RAISE EXCEPTION 'Estado físico no válido'; END IF;
    IF coalesce(btrim(b->>'idioma'),'')='' OR length(b->>'idioma')>100 THEN RAISE EXCEPTION 'Idioma no válido'; END IF;
    IF coalesce(b->>'imagen_url','')<>'' AND b->>'imagen_url' !~ '^https://' THEN RAISE EXCEPTION 'La portada debe usar HTTPS'; END IF;
    IF jsonb_typeof(b->'contenidos')<>'array' OR jsonb_array_length(b->'contenidos')>100 THEN RAISE EXCEPTION 'Volúmenes no válidos'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(b->'contenidos') c WHERE length(c)>255 OR btrim(c)='') THEN RAISE EXCEPTION 'Revisa los títulos de los volúmenes'; END IF;
    IF coalesce(btrim(b->>'editorial'),'')<>'' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('mobile-publisher:'||public.f_unaccent(lower(btrim(b->>'editorial'))),0));
      SELECT id INTO publisher_id FROM public.editoriales WHERE public.f_unaccent(lower(btrim(nombre)))=public.f_unaccent(lower(btrim(b->>'editorial'))) ORDER BY id LIMIT 1;
      IF publisher_id IS NULL THEN INSERT INTO public.editoriales(nombre) VALUES(btrim(b->>'editorial')) RETURNING id INTO publisher_id; END IF;
    END IF;
    location_key := public.f_unaccent(lower(location_name));
    suffix := CASE location_key WHEN 'galeon' THEN 'G' WHEN 'hortaleza' THEN 'H' WHEN 'reina' THEN 'R' WHEN 'abebooks' THEN 'Ab' WHEN 'uniliber' THEN 'UL' WHEN 'general' THEN 'AG' ELSE '' END;
    SELECT coalesce(max(n),0)::bigint+1 INTO next_number FROM (
      SELECT (regexp_match(legacy_id,'^([0-9]{1,12})'||suffix||'$'))[1]::numeric AS n,legacy_id
      FROM public.libros WHERE legacy_id ~ ('^[0-9]{1,12}'||suffix||'$')
    ) codes WHERE n<CASE WHEN location_key='hortaleza' THEN 2000 WHEN location_key='galeon' THEN 20000 ELSE 200000000 END
      AND (location_key<>'almacen' OR legacy_id NOT LIKE '18%');
    FOR i IN 1..1000 LOOP
      next_code := lpad(next_number::text,greatest(8,length(next_number::text)),'0')||suffix;
      IF NOT EXISTS(SELECT 1 FROM public.libros WHERE legacy_id=next_code) THEN
        BEGIN
          INSERT INTO public.libros(titulo,autor,isbn,precio,precio_original,stock,ubicacion,descripcion,notas,imagen_url,paginas,anio,categoria_id,editorial_id,activo,destacado,novedad,oferta,descatalogado,estado,idioma,fecha_ingreso,updated_at,legacy_id)
          VALUES(title_value,author_value,coalesce(isbn_value,'N/A'),amount,original_amount,qty,location_name,nullif(b->>'descripcion',''),nullif(b->>'notas',''),nullif(b->>'imagen_url',''),nullif(b->>'paginas','')::integer,nullif(b->>'anio','')::smallint,category,publisher_id,true,coalesce((b->>'destacado')::boolean,false),coalesce((b->>'novedad')::boolean,false),coalesce((b->>'oferta')::boolean,false),coalesce((b->>'descatalogado')::boolean,false),condition_value,b->>'idioma',current_date,now(),next_code)
          RETURNING * INTO result_book;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          IF NOT EXISTS(SELECT 1 FROM public.libros WHERE legacy_id=next_code) THEN RAISE; END IF;
        END;
      END IF;
      next_number := next_number+1;
    END LOOP;
    IF result_book.id IS NULL THEN RAISE EXCEPTION 'No se ha podido asignar un código libre'; END IF;
    INSERT INTO public.libros_contenidos(libro_id,titulo,numero_volumen)
      SELECT result_book.id,value,ordinality::integer FROM jsonb_array_elements_text(b->'contenidos') WITH ORDINALITY;
  END IF;
  new_result := jsonb_build_object('book',to_jsonb(result_book)-'search_vector','action',operation,'quantity',qty,'replayed',false);
  INSERT INTO public.mobile_book_receipts(request_id,actor_id,payload_hash,result) VALUES(p_request_id,auth.uid(),md5(p_payload::text),new_result);
  RETURN new_result;
END $function$
;

CREATE OR REPLACE FUNCTION public.obtener_permisos_usuario()
 RETURNS TABLE(user_id uuid, username text, email text, rol_nombre text, rol_display_name text, nivel_jerarquia integer, is_super_admin boolean, is_admin boolean, is_editor boolean, can_manage_books boolean, can_manage_users boolean, can_manage_orders boolean, can_manage_invoices boolean, can_view_all boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.auth_user_id as user_id,
    u.username::text,
    u.email::text,
    r.nombre::text as rol_nombre,
    r.display_name::text as rol_display_name,
    r.nivel_jerarquia,
    (r.nombre = 'super_admin')::boolean as is_super_admin,
    (r.nombre IN ('super_admin', 'admin'))::boolean as is_admin,
    (r.nombre IN ('super_admin', 'admin', 'editor'))::boolean as is_editor,
    (r.nombre IN ('super_admin', 'admin', 'editor'))::boolean as can_manage_books,
    (r.nombre IN ('super_admin', 'admin'))::boolean as can_manage_users,
    (r.nombre IN ('super_admin', 'admin', 'editor'))::boolean as can_manage_orders,
    (r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador'))::boolean as can_manage_invoices,
    (r.nombre IN ('super_admin', 'admin', 'editor', 'visualizador'))::boolean as can_view_all
  FROM usuarios u
  INNER JOIN roles r ON u.rol_id = r.id
  WHERE u.auth_user_id = auth.uid()
    AND u.activo = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.obtener_permisos_usuario(usuario_id uuid)
 RETURNS TABLE(permiso_codigo text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.codigo::TEXT
  FROM permisos p
  INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
  WHERE rp.rol_id IN (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT ur.rol_id
    FROM usuarios_roles ur
    WHERE ur.user_id = usuario_id
      AND ur.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT u.rol_id
    FROM usuarios u
    WHERE u.auth_user_id = usuario_id
      AND u.activo = true
  )
  ORDER BY p.codigo::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.obtener_rol_principal(usuario_id uuid)
 RETURNS TABLE(rol_nombre text, rol_display_name text, nivel_jerarquia integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.nombre::TEXT as rol_nombre,
    r.display_name::TEXT as rol_display_name,
    r.nivel_jerarquia
  FROM (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT
      r.id,
      r.nombre,
      r.display_name,
      r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND ur.activo = true
      AND r.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT
      r.id,
      r.nombre,
      r.display_name,
      r.nivel_jerarquia
    FROM roles r
    INNER JOIN usuarios u ON u.rol_id = r.id
    WHERE u.auth_user_id = usuario_id
      AND u.activo = true
      AND r.activo = true
  ) r
  ORDER BY r.nivel_jerarquia ASC
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.obtener_roles_usuario(usuario_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'nombre', r.nombre,
        'display_name', r.display_name,
        'descripcion', r.descripcion,
        'nivel_jerarquia', r.nivel_jerarquia,
        'activo', r.activo,
        'es_sistema', r.es_sistema
      )
      ORDER BY r.nivel_jerarquia ASC
    ),
    '[]'::jsonb
  ) INTO result
  FROM (
    -- Roles desde usuarios_roles (sistema nuevo)
    SELECT DISTINCT
      r.id,
      r.nombre,
      r.display_name,
      r.descripcion,
      r.nivel_jerarquia,
      r.activo,
      r.es_sistema
    FROM roles r
    INNER JOIN usuarios_roles ur ON r.id = ur.rol_id
    WHERE ur.user_id = usuario_id
      AND ur.activo = true
      AND r.activo = true

    UNION

    -- Rol desde usuarios.rol_id (sistema legacy)
    SELECT DISTINCT
      r.id,
      r.nombre,
      r.display_name,
      r.descripcion,
      r.nivel_jerarquia,
      r.activo,
      r.es_sistema
    FROM roles r
    INNER JOIN usuarios u ON u.rol_id = r.id
    WHERE u.auth_user_id = usuario_id
      AND u.activo = true
      AND r.activo = true
  ) r;

  RETURN result;
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

CREATE OR REPLACE FUNCTION public.search_books(search_term text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_category_id integer DEFAULT NULL::integer, p_editorial_id integer DEFAULT NULL::integer, p_stock_status text DEFAULT NULL::text, p_is_visible boolean DEFAULT true, p_sort_by text DEFAULT 'relevance'::text)
 RETURNS TABLE(id integer, legacy_id text, isbn text, titulo text, autor text, editorial_id integer, categoria_id integer, anio integer, paginas integer, descripcion text, precio numeric, precio_original numeric, stock integer, ubicacion text, imagen_url text, activo boolean, destacado boolean, novedad boolean, oferta boolean, descatalogado boolean, estado text, idioma text, created_at timestamp with time zone, updated_at timestamp with time zone, editorial_nombre text, categoria_nombre text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    base_query text;
    where_clauses text[] := ARRAY['true']; 
    order_clause text;
    
    clean_search text;
    words text[];
    word text;
    word_conditions text[] := ARRAY[]::text[]; -- INICIALIZACIÓN IMPORTANTE
BEGIN
    clean_search := trim(search_term);

    -- 1. Construir Cláusulas WHERE Fijas (Usando array_append para seguridad)
    IF p_is_visible IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.activo = %L', p_is_visible));
    END IF;

    IF p_min_price IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.precio >= %L', p_min_price));
    END IF;

    IF p_max_price IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.precio <= %L', p_max_price));
    END IF;

    IF p_category_id IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.categoria_id = %L', p_category_id));
    END IF;

    IF p_editorial_id IS NOT NULL THEN
        where_clauses := array_append(where_clauses, format('l.editorial_id = %L', p_editorial_id));
    END IF;

    IF p_stock_status = 'in_stock' THEN
        where_clauses := array_append(where_clauses, 'l.stock > 0');
    ELSIF p_stock_status = 'out_of_stock' THEN
        where_clauses := array_append(where_clauses, 'l.stock <= 0');
    END IF;

    -- 2. Lógica de Búsqueda de Texto
    IF clean_search <> '' THEN
        words := regexp_split_to_array(trim(clean_search), '[[:space:],.:;()/_-]+');
        
        FOREACH word IN ARRAY words
        LOOP
            IF length(word) > 0 THEN
               word_conditions := array_append(word_conditions, format(
                   'l.id IN (
                       SELECT b.id FROM public.libros b WHERE b.legacy_id ILIKE %1$L
                       UNION
                       SELECT b.id FROM public.libros b WHERE b.isbn ILIKE %1$L
                       UNION
                       SELECT b.id FROM public.libros b WHERE public.f_unaccent(lower(b.titulo)) ILIKE %2$L
                       UNION
                       SELECT b.id FROM public.libros b WHERE public.f_unaccent(lower(b.autor)) ILIKE %2$L
                       UNION
                       SELECT b.id FROM public.libros b
                       JOIN public.editoriales publisher ON publisher.id = b.editorial_id
                       WHERE public.f_unaccent(lower(publisher.nombre)) ILIKE %2$L
                   )',
                   '%' || word || '%', 
                   '%' || public.f_unaccent(lower(word)) || '%' 
               ));
            END IF;
        END LOOP;
        
        -- Añadir el bloque AND de todas las palabras
        IF array_length(word_conditions, 1) > 0 THEN
             where_clauses := array_append(where_clauses, array_to_string(word_conditions, ' AND '));
        END IF;
    END IF;

    -- 3. Construir ORDER BY
    IF clean_search <> '' THEN
         order_clause := format(
            'CASE 
                WHEN l.legacy_id ILIKE %L THEN 0 
                WHEN public.f_unaccent(lower(l.titulo)) LIKE %L THEN 1
                ELSE 2 
             END, ',
             clean_search,
             public.f_unaccent(lower(clean_search)) || '%'
         );
    ELSE
         order_clause := '';
    END IF;

    IF p_sort_by = 'price_asc' THEN order_clause := order_clause || 'l.precio ASC';
    ELSIF p_sort_by = 'price_desc' THEN order_clause := order_clause || 'l.precio DESC';
    ELSIF p_sort_by = 'newest' THEN order_clause := order_clause || 'l.created_at DESC NULLS LAST';
    ELSIF p_sort_by = 'title' THEN order_clause := order_clause || 'l.titulo ASC';
    ELSE order_clause := order_clause || 'l.id DESC'; 
    END IF;

    -- 4. Construir Query Final
    base_query := format(
        'SELECT 
            l.id::integer, 
            l.legacy_id::text,
            l.isbn::text,
            l.titulo::text,
            l.autor::text,
            l.editorial_id::integer,
            l.categoria_id::integer,
            l.anio::integer,
            l.paginas::integer,
            l.descripcion::text,
            l.precio::numeric, 
            l.precio_original::numeric,
            l.stock::integer, 
            l.ubicacion::text,
            l.imagen_url::text,
            l.activo::boolean,
            l.destacado::boolean,
            l.novedad::boolean,
            l.oferta::boolean,
            l.descatalogado::boolean,
            l.estado::text,
            l.idioma::text,
            l.created_at,
            l.updated_at,
            e.nombre::text as editorial_nombre,
            c.nombre::text as categoria_nombre
        FROM public.libros l
        LEFT JOIN public.editoriales e ON l.editorial_id = e.id
        LEFT JOIN public.categorias c ON l.categoria_id = c.id
        WHERE %s
        ORDER BY %s
        LIMIT %L OFFSET %L',
        array_to_string(where_clauses, ' AND '),
        order_clause,
        p_limit,
        p_offset
    );

    RETURN QUERY EXECUTE base_query;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_books_advanced(p_titulo text DEFAULT NULL::text, p_autor text DEFAULT NULL::text, p_descripcion text DEFAULT NULL::text, p_isbn text DEFAULT NULL::text, p_publisher text DEFAULT NULL::text, p_category_id integer DEFAULT NULL::integer, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_stock_status text DEFAULT 'all'::text, p_min_pages integer DEFAULT NULL::integer, p_max_pages integer DEFAULT NULL::integer, p_start_year integer DEFAULT NULL::integer, p_end_year integer DEFAULT NULL::integer, p_language text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_is_visible boolean DEFAULT true, p_sort_by text DEFAULT 'newest'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_legacy_id text DEFAULT NULL::text, p_featured boolean DEFAULT false, p_is_new boolean DEFAULT false, p_is_on_sale boolean DEFAULT false, p_is_out_of_print boolean DEFAULT false, p_cover_status text DEFAULT 'all'::text)
 RETURNS TABLE(id integer, legacy_id text, isbn text, titulo text, autor text, editorial_id integer, categoria_id integer, anio integer, paginas integer, descripcion text, precio numeric, precio_original numeric, stock integer, ubicacion text, imagen_url text, activo boolean, destacado boolean, novedad boolean, oferta boolean, descatalogado boolean, estado text, idioma text, created_at timestamp with time zone, updated_at timestamp with time zone, editorial_nombre text, categoria_nombre text, total_count bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    clauses text[] := ARRAY['true'];
    field record;
    word text;
    pattern text;
    ordering text;
BEGIN
    IF p_is_visible IS NOT NULL THEN clauses := array_append(clauses, format('l.activo = %L', p_is_visible)); END IF;
    FOR field IN SELECT * FROM jsonb_each_text(jsonb_build_object(
        'titulo', p_titulo, 'autor', p_autor, 'descripcion', p_descripcion
    )) LOOP
        FOR word IN SELECT regexp_split_to_table(trim(coalesce(field.value, '')), '[[:space:],.;:()/_-]+') LOOP
            IF word = '' THEN CONTINUE; END IF;
            pattern := '%' || replace(replace(replace(public.f_unaccent(lower(word)), chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%';
            clauses := array_append(clauses, format('public.f_unaccent(lower(l.%I)) ILIKE %L', field.key, pattern));
        END LOOP;
    END LOOP;
    FOR field IN SELECT * FROM jsonb_each_text(jsonb_build_object(
        'e.nombre', p_publisher, 'l.legacy_id', p_legacy_id, 'l.idioma', p_language, 'l.ubicacion', p_location
    )) LOOP
        IF nullif(trim(field.value), '') IS NOT NULL THEN
            pattern := '%' || replace(replace(replace(public.f_unaccent(lower(trim(field.value))), chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%';
            clauses := array_append(clauses, format('public.f_unaccent(lower(%s)) ILIKE %L', field.key, pattern));
        END IF;
    END LOOP;
    IF nullif(trim(p_isbn), '') IS NOT NULL THEN
        pattern := '%' || replace(replace(replace(regexp_replace(p_isbn, '[-[:space:]]', '', 'g'), chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%';
        clauses := array_append(clauses, format('regexp_replace(l.isbn, ''[-[:space:]]'', '''', ''g'') ILIKE %L', pattern));
    END IF;
    IF p_category_id IS NOT NULL THEN clauses := array_append(clauses, format('l.categoria_id = %L', p_category_id)); END IF;
    IF p_min_price IS NOT NULL THEN clauses := array_append(clauses, format('l.precio >= %L', p_min_price)); END IF;
    IF p_max_price IS NOT NULL THEN clauses := array_append(clauses, format('l.precio <= %L', p_max_price)); END IF;
    IF p_min_pages IS NOT NULL THEN clauses := array_append(clauses, format('l.paginas >= %L', p_min_pages)); END IF;
    IF p_max_pages IS NOT NULL THEN clauses := array_append(clauses, format('l.paginas <= %L', p_max_pages)); END IF;
    IF p_start_year IS NOT NULL THEN clauses := array_append(clauses, format('l.anio >= %L', p_start_year)); END IF;
    IF p_end_year IS NOT NULL THEN clauses := array_append(clauses, format('l.anio <= %L', p_end_year)); END IF;
    IF p_stock_status = 'in_stock' THEN clauses := array_append(clauses, 'l.stock > 0');
    ELSIF p_stock_status = 'out_of_stock' THEN clauses := array_append(clauses, 'l.stock <= 0'); END IF;
    IF nullif(trim(p_condition), '') IS NOT NULL THEN clauses := array_append(clauses, format('lower(l.estado) = lower(%L)', trim(p_condition))); END IF;
    IF p_featured THEN clauses := array_append(clauses, 'l.destacado = true'); END IF;
    IF p_is_new THEN clauses := array_append(clauses, 'l.novedad = true'); END IF;
    IF p_is_on_sale THEN clauses := array_append(clauses, 'l.oferta = true'); END IF;
    IF p_is_out_of_print THEN clauses := array_append(clauses, 'l.descatalogado = true'); END IF;
    IF p_cover_status = 'with_cover' THEN clauses := array_append(clauses, 'nullif(l.imagen_url, '''') IS NOT NULL');
    ELSIF p_cover_status = 'without_cover' THEN clauses := array_append(clauses, 'nullif(l.imagen_url, '''') IS NULL'); END IF;
    ordering := CASE p_sort_by
        WHEN 'price_asc' THEN 'l.precio ASC, l.id DESC'
        WHEN 'price_desc' THEN 'l.precio DESC, l.id DESC'
        WHEN 'title' THEN 'l.titulo ASC, l.id DESC'
        WHEN 'title_desc' THEN 'l.titulo DESC, l.id DESC'
        WHEN 'oldest' THEN 'l.created_at ASC NULLS LAST, l.id ASC'
        WHEN 'newest' THEN 'l.created_at DESC NULLS LAST, l.id DESC'
        WHEN 'updated_asc' THEN 'l.updated_at ASC NULLS LAST, l.id ASC'
        WHEN 'updated_desc' THEN 'l.updated_at DESC NULLS LAST, l.id DESC'
        WHEN 'id_asc' THEN 'l.id ASC'
        ELSE 'l.id DESC'
    END;
    RETURN QUERY EXECUTE format(
        'SELECT l.id::integer, l.legacy_id::text, l.isbn::text, l.titulo::text, l.autor::text,
            l.editorial_id::integer, l.categoria_id::integer, l.anio::integer, l.paginas::integer,
            l.descripcion::text, l.precio::numeric, l.precio_original::numeric, l.stock::integer,
            l.ubicacion::text, l.imagen_url::text, l.activo::boolean, l.destacado::boolean,
            l.novedad::boolean, l.oferta::boolean, l.descatalogado::boolean, l.estado::text,
            l.idioma::text, l.created_at, l.updated_at, e.nombre::text, c.nombre::text,
            count(*) OVER ()
        FROM public.libros l
        LEFT JOIN public.editoriales e ON e.id = l.editorial_id
        LEFT JOIN public.categorias c ON c.id = l.categoria_id
        WHERE %s ORDER BY %s LIMIT %L OFFSET %L',
        array_to_string(clauses, ' AND '), ordering, greatest(coalesce(p_limit, 20), 1), greatest(coalesce(p_offset, 0), 0)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_factura_fecha()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.issue_date = COALESCE(NEW.issue_date, NOW());
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.sugerir_correccion(busqueda text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  sugerencia text;
begin
  -- Solo busca libros con STOCK DISPONIBLE (stock >= 1) y ACTIVOS
  select titulo into sugerencia
  from libros
  where activo = true
  and stock >= 1
  and similarity(titulo, busqueda) > 0.3
  order by similarity(titulo, busqueda) desc
  limit 1;
  
  return sugerencia;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tiene_permiso(usuario_id uuid, permiso_codigo text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM permisos p
    INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
    WHERE p.codigo = permiso_codigo
      AND rp.rol_id IN (
        -- Roles desde usuarios_roles (sistema nuevo)
        SELECT ur.rol_id
        FROM usuarios_roles ur
        WHERE ur.user_id = usuario_id
          AND ur.activo = true

        UNION

        -- Rol desde usuarios.rol_id (sistema legacy)
        SELECT u.rol_id
        FROM usuarios u
        WHERE u.auth_user_id = usuario_id
          AND u.activo = true
      )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$
;

CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$
;

CREATE OR REPLACE FUNCTION public.update_clientes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;
