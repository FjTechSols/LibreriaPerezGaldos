-- Marcha atrás COMPLETA de C1: deja permisos, funciones y reglas como estaban el 2026-10-20 antes de C1.
-- (La tabla libros_backup_20260105 borrada en C1 no se recupera.)
BEGIN;
-- 1. Quitar todas las reglas actuales de public y de storage.objects
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname, schemaname, tablename FROM pg_policies WHERE schemaname = 'public' OR (schemaname = 'storage' AND tablename = 'objects') LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS trg_proteger_campos_usuario ON public.usuarios;
DROP FUNCTION IF EXISTS public.proteger_campos_usuario();
ALTER TABLE public.libros_contenidos DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.usuarios, public.libros_contenidos TO anon;
-- 2. Reglas originales

CREATE POLICY "Enable all access for service role" ON public.abebooks_orders_cache AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Enable read access for authenticated users" ON public.abebooks_orders_cache AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Allow authenticated users to read sync logs" ON public.abebooks_sync_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow service role to manage sync logs" ON public.abebooks_sync_log AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Super admins can insert auditoria" ON public.auditoria AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = 1)))) AND ((usuario_id IS NULL) OR (usuario_id = ( SELECT u.id
   FROM usuarios u
  WHERE (u.auth_user_id = auth.uid()))))));
CREATE POLICY "Users can view auditoria" ON public.auditoria AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view active authors" ON public.autores AS PERMISSIVE FOR SELECT TO authenticated USING ((activo = true));
CREATE POLICY "Only admins can create authors" ON public.autores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Only admins can delete authors" ON public.autores AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Only admins can update authors" ON public.autores AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Public users can view active authors" ON public.autores AS PERMISSIVE FOR SELECT TO anon USING ((activo = true));
CREATE POLICY "Users can delete from own cart" ON public.carrito AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert to own cart" ON public.carrito AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own cart" ON public.carrito AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own cart" ON public.carrito AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own cart" ON public.carritos AS PERMISSIVE FOR DELETE TO authenticated USING (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Users can insert own cart" ON public.carritos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Users can update own cart" ON public.carritos AS PERMISSIVE FOR UPDATE TO authenticated USING (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Users can view own cart" ON public.carritos AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Admin can delete categorias" ON public.categorias AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Editor can insert categorias" ON public.categorias AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (can_manage_books());
CREATE POLICY "Editor can update categorias" ON public.categorias AS PERMISSIVE FOR UPDATE TO authenticated USING (can_manage_books()) WITH CHECK (can_manage_books());
CREATE POLICY "Public can view categorias" ON public.categorias AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admin and staff can view all clients" ON public.clientes AS PERMISSIVE FOR SELECT TO authenticated USING ((is_editor() OR (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = 4))))));
CREATE POLICY "Admins and Editors can insert clients" ON public.clientes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_editor());
CREATE POLICY "Admins and Editors can update clients" ON public.clientes AS PERMISSIVE FOR UPDATE TO authenticated USING (is_editor()) WITH CHECK (is_editor());
CREATE POLICY "Admins can delete clients" ON public.clientes AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Users can view documentos" ON public.documentos AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can delete editoriales" ON public.editoriales AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Editor can insert editoriales" ON public.editoriales AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (can_manage_books());
CREATE POLICY "Editor can update editoriales" ON public.editoriales AS PERMISSIVE FOR UPDATE TO authenticated USING (can_manage_books()) WITH CHECK (can_manage_books());
CREATE POLICY "Public can view editoriales" ON public.editoriales AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can view envios" ON public.envios AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage discounts" ON public.global_discounts AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Public read active discounts" ON public.global_discounts AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Only admins can manage invoice_items" ON public.invoice_items AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ANY (ARRAY[1, 2]))))));
CREATE POLICY "Only admins can manage invoices" ON public.invoices AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ANY (ARRAY[1, 2]))))));
CREATE POLICY "Authenticated users can view book authors" ON public.libro_autores AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can create book author relations" ON public.libro_autores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Only admins can delete book author relations" ON public.libro_autores AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Only admins can update book author relations" ON public.libro_autores AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Public users can view book authors" ON public.libro_autores AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can delete books" ON public.libros AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Anyone authenticated can view libros" ON public.libros AS PERMISSIVE FOR SELECT TO authenticated USING ((activo = true));
CREATE POLICY "Authenticated users can view active books" ON public.libros AS PERMISSIVE FOR SELECT TO authenticated USING (((activo = true) OR can_view_all()));
CREATE POLICY "Authenticated users can view books" ON public.libros AS PERMISSIVE FOR SELECT TO authenticated USING (((activo = true) OR can_manage_books()));
CREATE POLICY "Editor can insert books" ON public.libros AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (can_manage_books());
CREATE POLICY "Editor can update books" ON public.libros AS PERMISSIVE FOR UPDATE TO authenticated USING (can_manage_books()) WITH CHECK (can_manage_books());
CREATE POLICY "Public can view active books" ON public.libros AS PERMISSIVE FOR SELECT TO public USING ((activo = true));
CREATE POLICY "Users with manage books permission can insert books" ON public.libros AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (can_manage_books());
CREATE POLICY "Users with manage books permission can update books" ON public.libros AS PERMISSIVE FOR UPDATE TO authenticated USING (can_manage_books()) WITH CHECK (can_manage_books());
CREATE POLICY "Enable delete for authenticated users only" ON public.marketing_banners AS PERMISSIVE FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Enable insert for authenticated users only" ON public.marketing_banners AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Enable read access for all users" ON public.marketing_banners AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable update for authenticated users only" ON public.marketing_banners AS PERMISSIVE FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY mobile_book_receipts_insert ON public.mobile_book_receipts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((actor_id = auth.uid()) AND can_manage_books()));
CREATE POLICY mobile_book_receipts_owner ON public.mobile_book_receipts AS PERMISSIVE FOR SELECT TO authenticated USING (((actor_id = auth.uid()) AND can_manage_books()));
CREATE POLICY "Admins can create notifications" ON public.notificaciones AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (usuarios u
     JOIN roles r ON ((u.rol_id = r.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND ((r.nombre)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));
CREATE POLICY "Users can update their own notifications" ON public.notificaciones AS PERMISSIVE FOR UPDATE TO public USING ((usuario_id IN ( SELECT usuarios.id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Users can view their own notifications" ON public.notificaciones AS PERMISSIVE FOR SELECT TO public USING ((usuario_id IN ( SELECT usuarios.id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Permitir todo en detalles" ON public.pedido_detalles AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can insert pedido_detalles" ON public.pedido_detalles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view pedido_detalles" ON public.pedido_detalles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir crear pedidos" ON public.pedidos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can create own pedidos" ON public.pedidos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((usuario_id = get_current_user_id()));
CREATE POLICY "Users can update own pedidos" ON public.pedidos AS PERMISSIVE FOR UPDATE TO authenticated USING (((usuario_id IN ( SELECT usuarios.id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ANY (ARRAY[1, 2])))))));
CREATE POLICY "Users can view own pedidos" ON public.pedidos AS PERMISSIVE FOR SELECT TO authenticated USING (((usuario_id IN ( SELECT usuarios.id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ANY (ARRAY[1, 2])))))));
CREATE POLICY "Usuarios autenticados pueden ver permisos" ON public.permisos AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view reembolsos" ON public.reembolsos AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can read all reservations" ON public.reservas AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ANY (ARRAY[1, 2, 3, 4, 5]))))));
CREATE POLICY "Admins can update any reservation" ON public.reservas AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = ANY (ARRAY[1, 2, 3, 4, 5]))))));
CREATE POLICY "Admins can update reservations" ON public.reservas AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM (usuarios u
     JOIN roles r ON ((u.rol_id = r.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND ((r.nombre)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (usuarios u
     JOIN roles r ON ((u.rol_id = r.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND ((r.nombre)::text = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::text[]))))));
CREATE POLICY "Admins can view all reservations" ON public.reservas AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = auth.uid()) AND (usuarios.rol_id = ( SELECT roles.id
           FROM roles
          WHERE ((roles.nombre)::text = 'admin'::text)))))));
CREATE POLICY "Users can create their own reservations" ON public.reservas AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((usuario_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = reservas.usuario_id) AND (usuarios.auth_user_id = auth.uid()))))));
CREATE POLICY "Users can insert own reservations" ON public.reservas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.id = reservas.usuario_id)))));
CREATE POLICY "Users can read own reservations" ON public.reservas AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.id = reservas.usuario_id))))));
CREATE POLICY "Users can update own pending reservations" ON public.reservas AS PERMISSIVE FOR UPDATE TO public USING (((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.id = reservas.usuario_id)))) AND (estado = 'pendiente'::text)));
CREATE POLICY "Users can view their own reservations" ON public.reservas AS PERMISSIVE FOR SELECT TO authenticated USING (((usuario_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.id = reservas.usuario_id) AND (usuarios.auth_user_id = auth.uid()))))));
CREATE POLICY "Anyone can view reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Users can delete own reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = usuario_id));
CREATE POLICY "Users can update own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = usuario_id)) WITH CHECK ((auth.uid() = usuario_id));
CREATE POLICY "Admin can view roles" ON public.roles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can view roles" ON public.roles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo admins pueden modificar roles" ON public.roles AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = ANY (ARRAY[1, 2])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = ANY (ARRAY[1, 2]))))));
CREATE POLICY "Usuarios autenticados pueden ver roles_permisos" ON public.roles_permisos AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert settings" ON public.settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1)))));
CREATE POLICY "Admins can update settings" ON public.settings AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1)))));
CREATE POLICY "Allow admins to manage settings" ON public.settings AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public can read non-sensitive settings" ON public.settings AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((category = ANY (ARRAY['company'::text, 'billing'::text, 'shipping'::text, 'system'::text])));
CREATE POLICY "Solo admins pueden actualizar ubicaciones" ON public.ubicaciones AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1)))));
CREATE POLICY "Solo admins pueden eliminar ubicaciones" ON public.ubicaciones AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1)))));
CREATE POLICY "Solo admins pueden insertar ubicaciones" ON public.ubicaciones AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios
  WHERE ((usuarios.auth_user_id = auth.uid()) AND (usuarios.rol_id = 1)))));
CREATE POLICY "Usuarios autenticados pueden leer ubicaciones activas" ON public.ubicaciones AS PERMISSIVE FOR SELECT TO authenticated USING ((activa = true));
CREATE POLICY "Admin can delete users" ON public.usuarios AS PERMISSIVE FOR DELETE TO authenticated USING (can_manage_users());
CREATE POLICY "Admin can insert users" ON public.usuarios AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (can_manage_users());
CREATE POLICY "Admin can update users" ON public.usuarios AS PERMISSIVE FOR UPDATE TO authenticated USING (can_manage_users()) WITH CHECK (can_manage_users());
CREATE POLICY "Admin can view all users" ON public.usuarios AS PERMISSIVE FOR SELECT TO authenticated USING (can_manage_users());
CREATE POLICY "Allow anon limited read for login" ON public.usuarios AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated read own data" ON public.usuarios AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = auth_user_id));
CREATE POLICY "Solo admins pueden actualizar roles avanzados" ON public.usuarios_roles AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = ANY (ARRAY[1, 2]))))));
CREATE POLICY "Solo admins pueden asignar roles avanzados" ON public.usuarios_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = ANY (ARRAY[1, 2]))))));
CREATE POLICY "Usuarios pueden ver sus propios roles avanzados" ON public.usuarios_roles AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM usuarios u
  WHERE ((u.auth_user_id = auth.uid()) AND (u.rol_id = ANY (ARRAY[1, 2])))))));
CREATE POLICY "Users can delete own wishlist" ON public.wishlist AS PERMISSIVE FOR DELETE TO authenticated USING (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Users can insert own wishlist" ON public.wishlist AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Users can view own wishlist" ON public.wishlist AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id)::text = ( SELECT (usuarios.id)::text AS id
   FROM usuarios
  WHERE (usuarios.auth_user_id = auth.uid()))));
CREATE POLICY "Authenticated users can delete" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'banners'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Authenticated users can update" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'banners'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Authenticated users can upload" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'banners'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "Public Access" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'banners'::text));
-- 3. Funciones originales
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
DROP FUNCTION IF EXISTS public.es_contexto_servidor();
GRANT EXECUTE ON FUNCTION public.hard_delete_order(bigint), public.decrement_stock(bigint, integer), public.deduct_stock_force(bigint),
  public.restore_stock_force(bigint), public.confirm_order_and_deduct_stock(bigint), public.admin_merge_categories(bigint[], integer),
  public.get_admin_reservations(integer, integer), public.get_admin_reservations_count() TO PUBLIC, anon;
NOTIFY pgrst, 'reload schema';
COMMIT;
