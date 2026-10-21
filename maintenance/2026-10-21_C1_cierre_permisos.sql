-- =====================================================================================
-- C1 · Cierre de permisos compatible con la web publicada (commit ae8f48b)
--
-- Problema: is_admin()/is_editor()/can_view_all() y varias políticas dan permisos de
-- administración a rol_id = 2, que es el rol de TODOS los clientes ('usuario'). El personal
-- creado desde el panel también tiene rol_id = 2 + su rol en usuarios_roles, así que
-- funcionaba "por casualidad". Además hay funciones sin ninguna comprobación ejecutables
-- por anon (borrar pedidos, tocar stock) y dos tablas sin RLS.
--
-- Regla única de roles: tiene_algun_rol() (rol principal y usuarios_roles; 'usuario' nunca es personal).
--   administración = super_admin, admin · gestión = + editor · consulta = + visualizador
--
-- Se mantiene, SOLO hasta desplegar el paso B (C2 lo cierra):
--   · el cliente puede actualizar SU pedido y crear/ver/actualizar la factura de SU pedido
--     (la web publicada lo hace desde el navegador al pagar);
--   · confirm_order_and_deduct_stock / deduct_stock_force: el dueño del pedido o el personal;
--   · anon puede leer de usuarios solo id, username, nombre y email (login por usuario y reseñas).
--
-- Copia previa: maintenance/2026-10-20_pre_C1/ (políticas, funciones y permisos).
-- =====================================================================================
BEGIN;

-- 1. Funciones de rol -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT public.tiene_algun_rol(ARRAY['super_admin', 'admin']) $function$;

CREATE OR REPLACE FUNCTION public.is_editor() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor']) $function$;

CREATE OR REPLACE FUNCTION public.can_view_all() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT public.tiene_algun_rol(ARRAY['super_admin', 'admin', 'editor', 'visualizador']) $function$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT public.tiene_algun_rol(ARRAY['super_admin']) $function$;
-- can_manage_users() = is_admin(); can_manage_books() / can_manage_orders() = is_editor(): se corrigen solas.

-- Contexto de servidor: service_role (webhook, funciones) o SQL directo sin ningún rol web.
-- Una llamada anónima (rol anon) o de usuario (authenticated) nunca cuenta como servidor.
CREATE OR REPLACE FUNCTION public.es_contexto_servidor() RETURNS boolean
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT coalesce(auth.role(), '') = 'service_role' OR (auth.uid() IS NULL AND coalesce(auth.role(), '') NOT IN ('anon', 'authenticated')) $function$;

-- 2. usuarios: solo super_admin cambia roles; nadie se activa o cambia identidad a sí mismo
CREATE OR REPLACE FUNCTION public.proteger_campos_usuario() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.es_contexto_servidor() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.rol_id, 2) <> 2 AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Solo un super_admin puede crear usuarios con rol de personal.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.rol_id IS DISTINCT FROM OLD.rol_id AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Solo un super_admin puede cambiar el rol de un usuario.' USING ERRCODE = '42501';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No se puede cambiar la cuenta asociada al usuario.' USING ERRCODE = '42501';
  END IF;
  IF (NEW.activo IS DISTINCT FROM OLD.activo OR NEW.email IS DISTINCT FROM OLD.email) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administración puede activar usuarios o cambiar su email.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_proteger_campos_usuario ON public.usuarios;
CREATE TRIGGER trg_proteger_campos_usuario BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_usuario();
REVOKE ALL ON FUNCTION public.proteger_campos_usuario() FROM PUBLIC, anon, authenticated;

-- El cliente sigue pudiendo editar su propio perfil (la web publicada lo hace con update directo).
DROP POLICY IF EXISTS "Users can update own profile" ON public.usuarios;
CREATE POLICY "Users can update own profile" ON public.usuarios FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

-- anon: solo lo que necesitan el login por nombre de usuario y las reseñas de la web publicada.
REVOKE ALL ON public.usuarios FROM anon;
GRANT SELECT (id, username, nombre, email) ON public.usuarios TO anon;

-- 3. Roles de personal: solo super_admin ------------------------------------------------
DROP POLICY IF EXISTS "Solo admins pueden asignar roles avanzados" ON public.usuarios_roles;
DROP POLICY IF EXISTS "Solo admins pueden actualizar roles avanzados" ON public.usuarios_roles;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios roles avanzados" ON public.usuarios_roles;
CREATE POLICY "Solo super_admin asigna roles" ON public.usuarios_roles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "Solo super_admin actualiza roles" ON public.usuarios_roles FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Ver roles propios o administración" ON public.usuarios_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Solo admins pueden modificar roles" ON public.roles;
CREATE POLICY "Solo super_admin modifica roles" ON public.roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 4. Pedidos y líneas ------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir crear pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can create own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can view own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can update own pedidos" ON public.pedidos;
-- El cliente solo crea pedidos web suyos y por verificar (como la web publicada).
CREATE POLICY "Cliente crea su pedido web" ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (usuario_id = public.get_current_user_id() AND tipo = 'interno' AND estado = 'pending_verification');
CREATE POLICY "Personal crea pedidos" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (public.is_editor());
CREATE POLICY "Ver pedidos propios o personal" ON public.pedidos FOR SELECT TO authenticated
  USING (usuario_id = public.get_current_user_id() OR public.can_view_all());
-- Provisional hasta C2: el cliente actualiza SU pedido (la web publicada lo marca pagado desde el navegador).
CREATE POLICY "Actualizar pedidos propios o personal" ON public.pedidos FOR UPDATE TO authenticated
  USING (usuario_id = public.get_current_user_id() OR public.is_editor())
  WITH CHECK (usuario_id = public.get_current_user_id() OR public.is_editor());

DROP POLICY IF EXISTS "Permitir todo en detalles" ON public.pedido_detalles;
DROP POLICY IF EXISTS "Users can insert pedido_detalles" ON public.pedido_detalles;
DROP POLICY IF EXISTS "Users can view pedido_detalles" ON public.pedido_detalles;
CREATE POLICY "Ver líneas propias o personal" ON public.pedido_detalles FOR SELECT TO authenticated
  USING (public.can_view_all() OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.usuario_id = public.get_current_user_id()));
CREATE POLICY "Crear líneas de pedido propio por verificar o personal" ON public.pedido_detalles FOR INSERT TO authenticated
  WITH CHECK (public.is_editor() OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id
    AND p.usuario_id = public.get_current_user_id() AND p.estado = 'pending_verification'));
CREATE POLICY "Personal modifica líneas" ON public.pedido_detalles FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "Personal borra líneas" ON public.pedido_detalles FOR DELETE TO authenticated USING (public.is_editor());

-- 5. Facturas --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Only admins can manage invoice_items" ON public.invoice_items;
CREATE POLICY "Personal consulta facturas" ON public.invoices FOR SELECT TO authenticated USING (public.can_view_all());
CREATE POLICY "Personal gestiona facturas" ON public.invoices FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
-- Provisional hasta C2: el cliente ve, crea y actualiza la factura de SU pedido (la web publicada la crea al pagar).
CREATE POLICY "Cliente factura de su pedido" ON public.invoices FOR ALL TO authenticated
  USING (order_id IN (SELECT p.id::text FROM public.pedidos p WHERE p.usuario_id = public.get_current_user_id()))
  WITH CHECK (order_id IN (SELECT p.id::text FROM public.pedidos p WHERE p.usuario_id = public.get_current_user_id()));
CREATE POLICY "Personal consulta líneas de factura" ON public.invoice_items FOR SELECT TO authenticated USING (public.can_view_all());
CREATE POLICY "Personal gestiona líneas de factura" ON public.invoice_items FOR ALL TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "Cliente líneas de la factura de su pedido" ON public.invoice_items FOR ALL TO authenticated
  USING (invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.order_id IN (SELECT p.id::text FROM public.pedidos p WHERE p.usuario_id = public.get_current_user_id())))
  WITH CHECK (invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.order_id IN (SELECT p.id::text FROM public.pedidos p WHERE p.usuario_id = public.get_current_user_id())));
-- (La política de cliente es FOR ALL por compatibilidad con la web publicada; DELETE de cliente se impide abajo.)
CREATE POLICY "Cliente no borra facturas" ON public.invoices AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_editor());
CREATE POLICY "Cliente no borra líneas de factura" ON public.invoice_items AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_editor());

-- 6. Reservas --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins can update any reservation" ON public.reservas;
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservas;
CREATE POLICY "Personal consulta reservas" ON public.reservas FOR SELECT TO authenticated USING (public.can_view_all());
CREATE POLICY "Personal gestiona reservas" ON public.reservas FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

-- 7. Descuentos, banners y archivos de banners: solo administración ----------------------
DROP POLICY IF EXISTS "Admin manage discounts" ON public.global_discounts;
CREATE POLICY "Administración gestiona descuentos" ON public.global_discounts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.marketing_banners;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.marketing_banners;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.marketing_banners;
CREATE POLICY "Administración crea banners" ON public.marketing_banners FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Administración modifica banners" ON public.marketing_banners FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Administración borra banners" ON public.marketing_banners FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Administración sube banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners' AND public.is_admin());
CREATE POLICY "Administración modifica banners" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners' AND public.is_admin());
CREATE POLICY "Administración borra banners" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners' AND public.is_admin());

-- 8. Datos internos: solo personal -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view auditoria" ON public.auditoria;
CREATE POLICY "Administración consulta auditoría" ON public.auditoria FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view documentos" ON public.documentos;
CREATE POLICY "Ver documentos propios o personal" ON public.documentos FOR SELECT TO authenticated
  USING (public.can_view_all() OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.usuario_id = public.get_current_user_id()));
DROP POLICY IF EXISTS "Users can view envios" ON public.envios;
CREATE POLICY "Ver envíos propios o personal" ON public.envios FOR SELECT TO authenticated
  USING (public.can_view_all() OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.usuario_id = public.get_current_user_id()));
DROP POLICY IF EXISTS "Users can view reembolsos" ON public.reembolsos;
CREATE POLICY "Personal consulta reembolsos" ON public.reembolsos FOR SELECT TO authenticated USING (public.can_view_all());

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.abebooks_orders_cache;
CREATE POLICY "Personal consulta pedidos AbeBooks" ON public.abebooks_orders_cache FOR SELECT TO authenticated USING (public.can_view_all());
DROP POLICY IF EXISTS "Allow authenticated users to read sync logs" ON public.abebooks_sync_log;
CREATE POLICY "Personal consulta sincronizaciones" ON public.abebooks_sync_log FOR SELECT TO authenticated USING (public.can_view_all());

DROP POLICY IF EXISTS "Admin and staff can view all clients" ON public.clientes;
CREATE POLICY "Personal consulta clientes" ON public.clientes FOR SELECT TO authenticated USING (public.can_view_all());

-- 9. Tablas sin RLS --------------------------------------------------------------------
-- Copia de enero de 412.730 libros, sin uso en el código (decisión del propietario: borrarla).
DROP TABLE IF EXISTS public.libros_backup_20260105;
ALTER TABLE public.libros_contenidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Público lee contenidos" ON public.libros_contenidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Personal gestiona contenidos" ON public.libros_contenidos FOR ALL TO authenticated USING (public.can_manage_books()) WITH CHECK (public.can_manage_books());
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.libros_contenidos FROM anon;

-- 10. Funciones peligrosas: comprobación de rol y fuera de anon --------------------------
-- (bloque generado a partir de 2026-10-20_pre_C1/02_functions.sql; el cuerpo original no cambia)
CREATE OR REPLACE FUNCTION public.confirm_order_and_deduct_stock(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- C1: comprobación de permisos, fuera del EXCEPTION WHEN OTHERS del cuerpo original
  IF NOT (public.es_contexto_servidor() OR public.is_editor() OR EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND usuario_id = public.get_current_user_id())) THEN
    RAISE EXCEPTION 'No tienes permiso para confirmar este pedido.' USING ERRCODE = '42501';
  END IF;
  -- Cuerpo original sin cambios (bloque anidado)
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_stock_force(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- C1: comprobación de permisos, fuera del EXCEPTION WHEN OTHERS del cuerpo original
  IF NOT (public.es_contexto_servidor() OR public.is_editor() OR EXISTS (SELECT 1 FROM public.pedidos WHERE id = p_pedido_id AND usuario_id = public.get_current_user_id())) THEN
    RAISE EXCEPTION 'No tienes permiso para descontar stock de este pedido.' USING ERRCODE = '42501';
  END IF;
  -- Cuerpo original sin cambios (bloque anidado)
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_stock_force(p_pedido_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- C1: comprobación de permisos, fuera del EXCEPTION WHEN OTHERS del cuerpo original
  IF NOT (public.es_contexto_servidor() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Solo el personal puede devolver stock.' USING ERRCODE = '42501';
  END IF;
  -- Cuerpo original sin cambios (bloque anidado)
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
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_stock(row_id bigint, amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- C1: comprobación de permisos, fuera del EXCEPTION WHEN OTHERS del cuerpo original
  IF NOT (public.es_contexto_servidor() OR public.is_editor()) THEN
    RAISE EXCEPTION 'Solo el personal puede modificar el stock.' USING ERRCODE = '42501';
  END IF;
  -- Cuerpo original sin cambios (bloque anidado)
BEGIN
  UPDATE public.libros
  SET stock = GREATEST(0, stock - amount)
  WHERE id = row_id;
END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hard_delete_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- C1: comprobación de permisos, fuera del EXCEPTION WHEN OTHERS del cuerpo original
  IF NOT (public.es_contexto_servidor() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Solo administración puede borrar pedidos.' USING ERRCODE = '42501';
  END IF;
  -- Cuerpo original sin cambios (bloque anidado)
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
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.hard_delete_order(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(bigint, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deduct_stock_force(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_stock_force(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_order_and_deduct_stock(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_merge_categories(bigint[], integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_reservations(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_reservations_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hard_delete_order(bigint), public.decrement_stock(bigint, integer), public.deduct_stock_force(bigint),
  public.restore_stock_force(bigint), public.confirm_order_and_deduct_stock(bigint), public.admin_merge_categories(bigint[], integer),
  public.get_admin_reservations(integer, integer), public.get_admin_reservations_count() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.es_contexto_servidor() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Marcha atrás: maintenance/2026-10-20_pre_C1/01_restore_policies.sql (políticas) y
-- 02_functions.sql (funciones), y además: DROP TRIGGER trg_proteger_campos_usuario ON usuarios;
-- GRANT ALL ON usuarios, libros_contenidos TO anon; ALTER TABLE libros_contenidos DISABLE ROW LEVEL SECURITY;
-- GRANT EXECUTE de las funciones del punto 10 a anon. La tabla libros_backup_20260105 no se recupera.
