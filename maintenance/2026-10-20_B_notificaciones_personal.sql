-- =====================================================================================
-- Paso B (aditivo): avisos al personal calculados en el servidor
-- Proyecto weaihscsaqxadxjgsfbt · 2026-10-20
--
-- Corrige la fuga de datos: los avisos de pedidos y reservas se enviaban a rol_id IN (1, 2),
-- es decir, a todos los clientes (27.788 avisos de pedidos a clientes en 60 días).
--   1. ids_personal(text[])               -> destinatarios: solo personal (rol antiguo o usuarios_roles)
--   2. notificar_personal_pedido(bigint)  -> sustituye al reparto desde el navegador
--   3. handle_new_reservation (redefinida) -> avisa solo al personal
--
-- Deshacer: ver el bloque "ROLLBACK" al final.
-- =====================================================================================

BEGIN;

-- 1. Destinatarios de personal (interno: sin permisos para la API)
CREATE OR REPLACE FUNCTION public.ids_personal(p_roles text[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT u.id
  FROM public.usuarios u
  JOIN public.roles r ON r.id = u.rol_id
  WHERE coalesce(u.activo, true) AND r.nombre::text = ANY (p_roles)
  UNION
  SELECT u.id
  FROM public.usuarios u
  JOIN public.usuarios_roles ur ON ur.user_id = u.auth_user_id AND ur.activo
  JOIN public.roles r ON r.id = ur.rol_id AND coalesce(r.activo, true)
  WHERE coalesce(u.activo, true) AND r.nombre::text = ANY (p_roles);
$function$;

REVOKE ALL ON FUNCTION public.ids_personal(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ids_personal(text[]) TO service_role;

-- 2. Aviso al personal de un pedido nuevo
--    Lo llama quien crea el pedido (el cliente en la web, o el personal en pedidos de tienda)
--    después de insertar las líneas. Mismo texto que la web, con el número de pedido.
--    Idempotente: si ya existe el aviso de ese pedido, no repite.
CREATE OR REPLACE FUNCTION public.notificar_personal_pedido(p_pedido_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pedido record;
  v_marca text := '#' || p_pedido_id::text;
  v_titulo text;
  v_mensaje text;
  v_items text;
  v_username text;
  v_id_display text;
  v_origen text;
  v_insertados integer;
BEGIN
  SELECT p.id, p.tipo::text AS tipo, p.estado::text AS estado, p.usuario_id, p.created_at,
         u.username, u.legacy_id, u.id AS u_id
    INTO v_pedido
  FROM public.pedidos p
  LEFT JOIN public.usuarios u ON u.id = p.usuario_id
  WHERE p.id = p_pedido_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Solo el dueño del pedido o el personal pueden pedir el aviso
  IF v_pedido.usuario_id IS DISTINCT FROM public.get_current_user_id()
     AND NOT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor', 'visualizador']) THEN
    RAISE EXCEPTION 'No puedes notificar este pedido.' USING ERRCODE = '42501';
  END IF;

  -- No avisar de pedidos antiguos ni dos veces del mismo
  IF v_pedido.created_at < now() - interval '1 day' THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.notificaciones
              WHERE tipo = 'pedido' AND created_at >= v_pedido.created_at
                AND mensaje LIKE '%' || v_marca || '%') THEN
    RETURN 0;
  END IF;

  v_username := coalesce(v_pedido.username, 'Desconocido');
  v_id_display := CASE WHEN v_pedido.legacy_id IS NOT NULL THEN 'ID: ' || v_pedido.legacy_id
                       ELSE 'ID: ' || left(coalesce(v_pedido.u_id::text, ''), 8) || '...' END;

  IF v_pedido.tipo = 'interno' THEN
    SELECT coalesce(string_agg(coalesce(l.titulo, d.nombre_externo, 'Producto') || ' (' || coalesce(l.legacy_id::text, 'S/C') || ')', ', ' ORDER BY d.id), 'varios artículos')
      INTO v_items
    FROM public.pedido_detalles d LEFT JOIN public.libros l ON l.id = d.libro_id
    WHERE d.pedido_id = p_pedido_id;
    v_titulo := 'Nueva Compra Solicitada';
    v_mensaje := format('El usuario (%s - %s) ha realizado la solicitud de la compra %s del libro. Pedido %s.',
                        v_id_display, v_username, v_items, v_marca);
  ELSE
    v_origen := upper(replace(coalesce(v_pedido.tipo, 'desconocido'), '_', ' '));
    v_titulo := 'Nuevo Pedido';
    v_mensaje := format('El usuario %s ha creado un nuevo pedido %s (%s). Estado: %s',
                        v_username, v_marca, v_origen, coalesce(v_pedido.estado, 'pendiente'));
  END IF;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje)
  SELECT id, 'pedido', v_titulo, v_mensaje
  FROM public.ids_personal(ARRAY['super_admin', 'admin', 'editor']) AS id;

  GET DIAGNOSTICS v_insertados = ROW_COUNT;
  RETURN v_insertados;
END;
$function$;

REVOKE ALL ON FUNCTION public.notificar_personal_pedido(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notificar_personal_pedido(bigint) TO authenticated, service_role;

-- 3. Trigger de reservas: avisar solo al personal (antes: rol_id IN (1, 2) = todos los clientes)
CREATE OR REPLACE FUNCTION public.handle_new_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name text;
  book_title text;
BEGIN
  SELECT nombre_completo INTO user_name FROM public.usuarios WHERE id = NEW.usuario_id;
  SELECT titulo INTO book_title FROM public.libros WHERE id = NEW.libro_id;
  IF user_name IS NULL THEN user_name := 'Usuario'; END IF;
  IF book_title IS NULL THEN book_title := 'Libro desconocido'; END IF;

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, reserva_id, leida, created_at)
  SELECT id, 'reserva_creada', 'Nueva Reserva',
         'Nueva solicitud de reserva: ' || user_name || ' ha reservado "' || book_title || '"',
         NEW.id, false, NOW()
  FROM public.ids_personal(ARRAY['super_admin', 'admin', 'editor']) AS id;

  RETURN NEW;
END;
$function$;

COMMIT;

-- =====================================================================================
-- ROLLBACK (manual)
-- =====================================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.notificar_personal_pedido(bigint);
-- -- handle_new_reservation: restaurar la definición de maintenance/2026-10-20_pre_rls/03_functions.sql
-- --   (ojo: la versión antigua vuelve a avisar a todos los clientes)
-- DROP FUNCTION IF EXISTS public.ids_personal(text[]);
-- COMMIT;
