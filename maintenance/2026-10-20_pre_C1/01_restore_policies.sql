-- Restaurar las políticas tal como estaban antes de C1 (2026-10-20).
BEGIN;
DROP POLICY IF EXISTS "Enable all access for service role" ON public.abebooks_orders_cache;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.abebooks_orders_cache;
DROP POLICY IF EXISTS "Allow authenticated users to read sync logs" ON public.abebooks_sync_log;
DROP POLICY IF EXISTS "Allow service role to manage sync logs" ON public.abebooks_sync_log;
DROP POLICY IF EXISTS "Super admins can insert auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Users can view auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Authenticated users can view active authors" ON public.autores;
DROP POLICY IF EXISTS "Only admins can create authors" ON public.autores;
DROP POLICY IF EXISTS "Only admins can delete authors" ON public.autores;
DROP POLICY IF EXISTS "Only admins can update authors" ON public.autores;
DROP POLICY IF EXISTS "Public users can view active authors" ON public.autores;
DROP POLICY IF EXISTS "Users can delete from own cart" ON public.carrito;
DROP POLICY IF EXISTS "Users can insert to own cart" ON public.carrito;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carrito;
DROP POLICY IF EXISTS "Users can view own cart" ON public.carrito;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carritos;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carritos;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carritos;
DROP POLICY IF EXISTS "Users can view own cart" ON public.carritos;
DROP POLICY IF EXISTS "Admin can delete categorias" ON public.categorias;
DROP POLICY IF EXISTS "Editor can insert categorias" ON public.categorias;
DROP POLICY IF EXISTS "Editor can update categorias" ON public.categorias;
DROP POLICY IF EXISTS "Public can view categorias" ON public.categorias;
DROP POLICY IF EXISTS "Admin and staff can view all clients" ON public.clientes;
DROP POLICY IF EXISTS "Admins and Editors can insert clients" ON public.clientes;
DROP POLICY IF EXISTS "Admins and Editors can update clients" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can view documentos" ON public.documentos;
DROP POLICY IF EXISTS "Admin can delete editoriales" ON public.editoriales;
DROP POLICY IF EXISTS "Editor can insert editoriales" ON public.editoriales;
DROP POLICY IF EXISTS "Editor can update editoriales" ON public.editoriales;
DROP POLICY IF EXISTS "Public can view editoriales" ON public.editoriales;
DROP POLICY IF EXISTS "Users can view envios" ON public.envios;
DROP POLICY IF EXISTS "Admin manage discounts" ON public.global_discounts;
DROP POLICY IF EXISTS "Public read active discounts" ON public.global_discounts;
DROP POLICY IF EXISTS "Only admins can manage invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Only admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view book authors" ON public.libro_autores;
DROP POLICY IF EXISTS "Only admins can create book author relations" ON public.libro_autores;
DROP POLICY IF EXISTS "Only admins can delete book author relations" ON public.libro_autores;
DROP POLICY IF EXISTS "Only admins can update book author relations" ON public.libro_autores;
DROP POLICY IF EXISTS "Public users can view book authors" ON public.libro_autores;
DROP POLICY IF EXISTS "Admins can delete books" ON public.libros;
DROP POLICY IF EXISTS "Anyone authenticated can view libros" ON public.libros;
DROP POLICY IF EXISTS "Authenticated users can view active books" ON public.libros;
DROP POLICY IF EXISTS "Authenticated users can view books" ON public.libros;
DROP POLICY IF EXISTS "Editor can insert books" ON public.libros;
DROP POLICY IF EXISTS "Editor can update books" ON public.libros;
DROP POLICY IF EXISTS "Public can view active books" ON public.libros;
DROP POLICY IF EXISTS "Users with manage books permission can insert books" ON public.libros;
DROP POLICY IF EXISTS "Users with manage books permission can update books" ON public.libros;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.marketing_banners;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.marketing_banners;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.marketing_banners;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.marketing_banners;
DROP POLICY IF EXISTS mobile_book_receipts_insert ON public.mobile_book_receipts;
DROP POLICY IF EXISTS mobile_book_receipts_owner ON public.mobile_book_receipts;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notificaciones;
DROP POLICY IF EXISTS "Permitir todo en detalles" ON public.pedido_detalles;
DROP POLICY IF EXISTS "Users can insert pedido_detalles" ON public.pedido_detalles;
DROP POLICY IF EXISTS "Users can view pedido_detalles" ON public.pedido_detalles;
DROP POLICY IF EXISTS "Permitir crear pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can create own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can update own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Users can view own pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos" ON public.permisos;
DROP POLICY IF EXISTS "Users can view reembolsos" ON public.reembolsos;
DROP POLICY IF EXISTS "Admins can read all reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins can update any reservation" ON public.reservas;
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservas;
DROP POLICY IF EXISTS "Users can create their own reservations" ON public.reservas;
DROP POLICY IF EXISTS "Users can insert own reservations" ON public.reservas;
DROP POLICY IF EXISTS "Users can read own reservations" ON public.reservas;
DROP POLICY IF EXISTS "Users can update own pending reservations" ON public.reservas;
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservas;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admin can view roles" ON public.roles;
DROP POLICY IF EXISTS "Anyone authenticated can view roles" ON public.roles;
DROP POLICY IF EXISTS "Solo admins pueden modificar roles" ON public.roles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver roles_permisos" ON public.roles_permisos;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Allow admins to manage settings" ON public.settings;
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.settings;
DROP POLICY IF EXISTS "Solo admins pueden actualizar ubicaciones" ON public.ubicaciones;
DROP POLICY IF EXISTS "Solo admins pueden eliminar ubicaciones" ON public.ubicaciones;
DROP POLICY IF EXISTS "Solo admins pueden insertar ubicaciones" ON public.ubicaciones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer ubicaciones activas" ON public.ubicaciones;
DROP POLICY IF EXISTS "Admin can delete users" ON public.usuarios;
DROP POLICY IF EXISTS "Admin can insert users" ON public.usuarios;
DROP POLICY IF EXISTS "Admin can update users" ON public.usuarios;
DROP POLICY IF EXISTS "Admin can view all users" ON public.usuarios;
DROP POLICY IF EXISTS "Allow anon limited read for login" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated read own data" ON public.usuarios;
DROP POLICY IF EXISTS "Solo admins pueden actualizar roles avanzados" ON public.usuarios_roles;
DROP POLICY IF EXISTS "Solo admins pueden asignar roles avanzados" ON public.usuarios_roles;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios roles avanzados" ON public.usuarios_roles;
DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

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
COMMIT;
