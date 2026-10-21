-- Verificación de C1 (cierre de permisos). Empieza con BEGIN y TERMINA EN ROLLBACK:
-- todo lo que se crea o modifica en la prueba se deshace aunque se ejecute suelto.
-- En el editor SQL el resultado puede no verse (lo último es el ROLLBACK): ejecutar vía CLI.
BEGIN;

CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
CREATE TEMP TABLE _ctx (k text PRIMARY KEY, v text) ON COMMIT DROP;
GRANT ALL ON _r, _ctx TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE _r_n_seq TO anon, authenticated, service_role;

CREATE FUNCTION pg_temp.v(p_k text) RETURNS text LANGUAGE sql AS $$ SELECT v FROM _ctx WHERE k = p_k $$;
CREATE FUNCTION pg_temp.chk(p_caso text, p_esperado text, p_obtenido text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES (p_caso, p_esperado, coalesce(p_obtenido, 'NULL'), p_esperado = coalesce(p_obtenido, 'NULL'));
$$;
-- Ejecuta SQL con el rol actual: 'ok' o el código de error
CREATE FUNCTION pg_temp.err(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE p_sql; RETURN 'ok'; EXCEPTION WHEN others THEN RETURN SQLSTATE; END $$;
-- Número de filas que devuelve (o error)
CREATE FUNCTION pg_temp.n(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE c bigint; BEGIN EXECUTE 'SELECT count(*) FROM (' || p_sql || ') x' INTO c; RETURN c::text; EXCEPTION WHEN others THEN RETURN SQLSTATE; END $$;
-- Filas afectadas por un UPDATE/DELETE ... RETURNING 1 (o error)
CREATE FUNCTION pg_temp.m(p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE c bigint; BEGIN EXECUTE 'WITH x AS (' || p_sql || ' RETURNING 1) SELECT count(*) FROM x' INTO c; RETURN c::text; EXCEPTION WHEN others THEN RETURN SQLSTATE; END $$;
CREATE FUNCTION pg_temp.como(p_k text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', CASE p_k
    WHEN 'anon' THEN '{"role":"anon"}'
    WHEN 'servidor' THEN '{"role":"service_role"}'
    ELSE json_build_object('sub', pg_temp.v(p_k), 'role', 'authenticated')::text END, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.v(text), pg_temp.chk(text, text, text), pg_temp.err(text), pg_temp.n(text), pg_temp.m(text), pg_temp.como(text)
  TO anon, authenticated, service_role;

-- ---------- Cuentas de prueba (el visualizador se crea dentro de la transacción) ----------
INSERT INTO _ctx
SELECT 'cliente' || rn, auth_user_id::text FROM (
  SELECT u.auth_user_id, row_number() OVER (ORDER BY u.fecha_registro, u.id) rn FROM usuarios u
  WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL AND coalesce(u.activo, true)
    AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)) x WHERE rn <= 3;
INSERT INTO _ctx SELECT 'super', auth_user_id::text FROM usuarios WHERE rol_id = 1 AND auth_user_id IS NOT NULL ORDER BY fecha_registro LIMIT 1;
INSERT INTO _ctx SELECT 'admin', ur.user_id::text FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id JOIN usuarios u ON u.auth_user_id = ur.user_id
  WHERE ur.activo AND r.nombre = 'admin' AND u.rol_id = 2 ORDER BY u.fecha_registro LIMIT 1;
INSERT INTO _ctx SELECT 'editor', ur.user_id::text FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id JOIN usuarios u ON u.auth_user_id = ur.user_id
  WHERE ur.activo AND r.nombre = 'editor' AND u.rol_id = 2 ORDER BY u.fecha_registro LIMIT 1;
INSERT INTO _ctx VALUES ('visual', pg_temp.v('cliente3'));
INSERT INTO usuarios_roles (user_id, rol_id, activo) SELECT pg_temp.v('visual')::uuid, id, true FROM roles WHERE nombre = 'visualizador';
INSERT INTO _ctx SELECT k || '_id', u.id::text FROM _ctx c JOIN usuarios u ON u.auth_user_id::text = c.v WHERE c.k IN ('cliente1', 'cliente2', 'editor', 'admin');
INSERT INTO _ctx SELECT 'cliente1_user', username FROM usuarios WHERE id::text = pg_temp.v('cliente1_id');

-- Pedidos de prueba: uno del cliente 1 (pagable) y uno del cliente 2
INSERT INTO _ctx SELECT 'libro', id::text FROM libros WHERE activo ORDER BY id LIMIT 1;
UPDATE libros SET stock = 20 WHERE id = pg_temp.v('libro')::int;
WITH p AS (INSERT INTO pedidos (usuario_id, tipo, estado, subtotal, iva, total, metodo_pago, coste_envio)
           VALUES (pg_temp.v('cliente1_id')::uuid, 'interno', 'payment_pending', 9.62, 0.38, 10, 'tarjeta', 0) RETURNING id)
INSERT INTO _ctx SELECT 'p1', id::text FROM p;
WITH p AS (INSERT INTO pedidos (usuario_id, tipo, estado, subtotal, iva, total, metodo_pago, coste_envio)
           VALUES (pg_temp.v('cliente2_id')::uuid, 'interno', 'payment_pending', 9.62, 0.38, 10, 'tarjeta', 0) RETURNING id)
INSERT INTO _ctx SELECT 'p2', id::text FROM p;
INSERT INTO pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario)
SELECT pg_temp.v(k)::int, pg_temp.v('libro')::int, 1, 10 FROM unnest(ARRAY['p1', 'p2']) k;
WITH i AS (INSERT INTO invoices (invoice_number, order_id, customer_name, customer_address, customer_nif, subtotal, tax_rate, tax_amount, total, status, issue_date)
           VALUES ('PRUEBA-C1-2', pg_temp.v('p2'), 'Prueba', 'x', '00000000T', 9.62, 4, 0.38, 10, 'Pagada', now()) RETURNING id)
INSERT INTO _ctx SELECT 'f2', id::text FROM i;
-- Totales reales para comparar
INSERT INTO _ctx SELECT 'total_pedidos', count(*)::text FROM pedidos;
INSERT INTO _ctx SELECT 'pedidos_cliente1', count(*)::text FROM pedidos WHERE usuario_id = pg_temp.v('cliente1_id')::uuid;
INSERT INTO _ctx SELECT 'total_facturas', count(*)::text FROM invoices;
INSERT INTO _ctx SELECT 'facturas_cliente1', count(*)::text FROM invoices WHERE order_id IN (SELECT id::text FROM pedidos WHERE usuario_id = pg_temp.v('cliente1_id')::uuid);
INSERT INTO _ctx SELECT 'total_reservas', count(*)::text FROM reservas;
INSERT INTO _ctx SELECT 'reservas_cliente1', count(*)::text FROM reservas WHERE usuario_id = pg_temp.v('cliente1_id')::uuid;

-- ---------- Funciones de rol ----------
SET LOCAL ROLE authenticated;
DO $$ DECLARE k text; BEGIN
  FOREACH k IN ARRAY ARRAY['cliente1', 'visual', 'editor', 'admin', 'super'] LOOP
    PERFORM pg_temp.como(k);
    PERFORM pg_temp.chk('roles de ' || k || ' (admin/gestión/consulta/super)',
      CASE k WHEN 'cliente1' THEN 'f/f/f/f' WHEN 'visual' THEN 'f/f/t/f' WHEN 'editor' THEN 'f/t/t/f' WHEN 'admin' THEN 't/t/t/f' ELSE 't/t/t/t' END,
      left(is_admin()::text, 1) || '/' || left(is_editor()::text, 1) || '/' || left(can_view_all()::text, 1) || '/' || left(is_super_admin()::text, 1));
  END LOOP;
END $$;

-- ---------- Escalada de privilegios ----------
DO $$ BEGIN
  PERFORM pg_temp.como('cliente1');
  PERFORM pg_temp.chk('cliente NO se asigna rol admin', '42501', pg_temp.err(format(
    'INSERT INTO usuarios_roles (user_id, rol_id, activo) SELECT %L, id, true FROM roles WHERE nombre = %L', pg_temp.v('cliente1'), 'admin')));
  PERFORM pg_temp.chk('cliente NO modifica la tabla de roles', '0', pg_temp.m('UPDATE roles SET descripcion = descripcion'));
  PERFORM pg_temp.chk('cliente NO se cambia su rol_id', '42501', pg_temp.m(format('UPDATE usuarios SET rol_id = 1 WHERE auth_user_id = %L', pg_temp.v('cliente1'))));
  PERFORM pg_temp.chk('cliente NO se cambia su email', '42501', pg_temp.m(format('UPDATE usuarios SET email = %L WHERE auth_user_id = %L', 'x@x.x', pg_temp.v('cliente1'))));
  PERFORM pg_temp.chk('cliente SÍ edita su perfil (web publicada)', '1', pg_temp.m(format('UPDATE usuarios SET telefono = %L, nombre = nombre WHERE auth_user_id = %L', '600000000', pg_temp.v('cliente1'))));
  PERFORM pg_temp.chk('cliente NO edita el perfil de otro', '0', pg_temp.m(format('UPDATE usuarios SET telefono = %L WHERE auth_user_id = %L', '600000000', pg_temp.v('cliente2'))));
  PERFORM pg_temp.chk('cliente solo ve su fila de usuarios', '1', pg_temp.n('SELECT 1 FROM usuarios'));
  PERFORM pg_temp.chk('cliente NO crea usuarios', '42501', pg_temp.err('INSERT INTO usuarios (username, email, rol_id) VALUES (''zz_c1'', ''zz@c1.x'', 2)'));

  PERFORM pg_temp.como('editor');
  PERFORM pg_temp.chk('editor NO cambia roles', '42501', pg_temp.err(format(
    'INSERT INTO usuarios_roles (user_id, rol_id, activo) SELECT %L, id, true FROM roles WHERE nombre = %L', pg_temp.v('cliente2'), 'editor')));
  PERFORM pg_temp.chk('editor NO ve la lista de usuarios', '1', pg_temp.n('SELECT 1 FROM usuarios'));

  PERFORM pg_temp.como('admin');
  PERFORM pg_temp.chk('admin ve usuarios', 'true', (pg_temp.n('SELECT 1 FROM usuarios')::int > 100)::text);
  PERFORM pg_temp.chk('admin NO cambia el rol de un usuario (solo super_admin)', '42501', pg_temp.m(format('UPDATE usuarios SET rol_id = 3 WHERE auth_user_id = %L', pg_temp.v('cliente2'))));
  PERFORM pg_temp.chk('admin NO asigna roles de personal', '42501', pg_temp.err(format(
    'INSERT INTO usuarios_roles (user_id, rol_id, activo) SELECT %L, id, true FROM roles WHERE nombre = %L', pg_temp.v('cliente2'), 'editor')));
  PERFORM pg_temp.chk('admin SÍ desactiva y reactiva un usuario', '1', pg_temp.m(format('UPDATE usuarios SET activo = activo WHERE auth_user_id = %L', pg_temp.v('cliente2'))));

  PERFORM pg_temp.como('super');
  PERFORM pg_temp.chk('super_admin SÍ asigna roles', 'ok', pg_temp.err(format(
    'INSERT INTO usuarios_roles (user_id, rol_id, activo) SELECT %L, id, true FROM roles WHERE nombre = %L', pg_temp.v('cliente2'), 'editor')));
  PERFORM pg_temp.chk('super_admin SÍ cambia rol_id', '1', pg_temp.m(format('UPDATE usuarios SET rol_id = 3 WHERE auth_user_id = %L', pg_temp.v('cliente2'))));
END $$;
RESET ROLE;
-- deshacer el cambio de rol del cliente 2 para el resto de pruebas
DELETE FROM usuarios_roles WHERE user_id = pg_temp.v('cliente2')::uuid;
UPDATE usuarios SET rol_id = 2 WHERE auth_user_id = pg_temp.v('cliente2')::uuid;

-- ---------- Pedidos, líneas, facturas, reservas ----------
SET LOCAL ROLE authenticated;
DO $$ DECLARE v_err text; BEGIN
  PERFORM pg_temp.como('cliente1');
  PERFORM pg_temp.chk('cliente ve solo sus pedidos', pg_temp.v('pedidos_cliente1'), pg_temp.n('SELECT 1 FROM pedidos'));
  PERFORM pg_temp.chk('cliente NO modifica pedidos ajenos', '0', pg_temp.m(format('UPDATE pedidos SET total = 0 WHERE id = %s', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('cliente actualiza SU pedido (provisional, web publicada al pagar)', '1', pg_temp.m(format('UPDATE pedidos SET observaciones = observaciones WHERE id = %s', pg_temp.v('p1'))));
  PERFORM pg_temp.chk('cliente NO crea pedidos de otro', '42501', pg_temp.err(format(
    'INSERT INTO pedidos (usuario_id, tipo, estado) VALUES (%L, ''interno'', ''pending_verification'')', pg_temp.v('cliente2_id'))));
  PERFORM pg_temp.chk('cliente NO crea pedidos ya "procesando"', '42501', pg_temp.err(format(
    'INSERT INTO pedidos (usuario_id, tipo, estado) VALUES (%L, ''interno'', ''procesando'')', pg_temp.v('cliente1_id'))));
  PERFORM pg_temp.chk('cliente crea su pedido web por verificar (web publicada)', 'ok', pg_temp.err(format(
    'INSERT INTO pedidos (usuario_id, tipo, estado, total) VALUES (%L, ''interno'', ''pending_verification'', 10)', pg_temp.v('cliente1_id'))));
  PERFORM pg_temp.chk('cliente añade líneas a SU pedido por verificar', 'ok', pg_temp.err(format(
    'INSERT INTO pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario) SELECT max(id), %s, 1, 10 FROM pedidos WHERE usuario_id = %L AND estado = ''pending_verification''',
    pg_temp.v('libro'), pg_temp.v('cliente1_id'))));
  PERFORM pg_temp.chk('cliente NO añade líneas a pedidos ajenos', '42501', pg_temp.err(format(
    'INSERT INTO pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario) VALUES (%s, %s, 1, 0.01)', pg_temp.v('p2'), pg_temp.v('libro'))));
  PERFORM pg_temp.chk('cliente NO modifica líneas', '0', pg_temp.m('UPDATE pedido_detalles SET precio_unitario = 0.01'));
  PERFORM pg_temp.chk('cliente NO borra líneas', '0', pg_temp.m('DELETE FROM pedido_detalles'));
  PERFORM pg_temp.chk('cliente solo ve líneas de sus pedidos', 'true', (pg_temp.n(format('SELECT 1 FROM pedido_detalles WHERE pedido_id = %s', pg_temp.v('p2'))) = '0')::text);

  PERFORM pg_temp.chk('cliente ve solo facturas de sus pedidos', pg_temp.v('facturas_cliente1'), pg_temp.n('SELECT 1 FROM invoices'));
  PERFORM pg_temp.chk('cliente NO modifica facturas ajenas', '0', pg_temp.m(format('UPDATE invoices SET total = 0 WHERE id = %L', pg_temp.v('f2'))));
  PERFORM pg_temp.chk('cliente NO crea factura de pedido ajeno', '42501', pg_temp.err(format(
    'INSERT INTO invoices (invoice_number, order_id, customer_name, customer_address, customer_nif, subtotal, tax_rate, tax_amount, total, status, issue_date) VALUES (''PRUEBA-C1-X'', %L, ''x'', ''x'', ''00000000T'', 1, 4, 0, 1, ''Pagada'', now())', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('cliente crea la factura de SU pedido (provisional, web publicada)', 'ok', pg_temp.err(format(
    'INSERT INTO invoices (invoice_number, order_id, customer_name, customer_address, customer_nif, subtotal, tax_rate, tax_amount, total, status, issue_date) VALUES (''PRUEBA-C1-1'', %L, ''x'', ''x'', ''00000000T'', 9.62, 4, 0.38, 10, ''Pagada'', now())', pg_temp.v('p1'))));
  PERFORM pg_temp.chk('cliente NO borra facturas, ni la suya', '0', pg_temp.m(format('DELETE FROM invoices WHERE order_id = %L', pg_temp.v('p1'))));
  PERFORM pg_temp.chk('cliente ve solo sus reservas', pg_temp.v('reservas_cliente1'), pg_temp.n('SELECT 1 FROM reservas'));
  PERFORM pg_temp.chk('cliente NO modifica reservas ajenas', '0', pg_temp.m(format('UPDATE reservas SET estado = estado WHERE usuario_id <> %L', pg_temp.v('cliente1_id'))));
  PERFORM pg_temp.chk('cliente NO crea descuentos', '42501', pg_temp.err('INSERT INTO global_discounts (name, discount_percent, scope, active) VALUES (''x'', 100, ''GLOBAL'', true)'));
  PERFORM pg_temp.chk('cliente NO crea banners', '42501', pg_temp.err('INSERT INTO marketing_banners DEFAULT VALUES'));
  PERFORM pg_temp.chk('cliente NO ve la auditoría', '0', pg_temp.n('SELECT 1 FROM auditoria'));
  PERFORM pg_temp.chk('cliente NO ve clientes de tienda', '0', pg_temp.n('SELECT 1 FROM clientes'));
  PERFORM pg_temp.chk('cliente NO ve pedidos de AbeBooks', '0', pg_temp.n('SELECT 1 FROM abebooks_orders_cache'));
  PERFORM pg_temp.chk('cliente NO cambia ajustes', '0', pg_temp.m('UPDATE settings SET value = value'));
  PERFORM pg_temp.chk('cliente NO borra libros', '0', pg_temp.m(format('DELETE FROM libros WHERE id = %s', pg_temp.v('libro'))));

  PERFORM pg_temp.como('visual');
  PERFORM pg_temp.chk('visualizador ve todos los pedidos', 'true', (pg_temp.n('SELECT 1 FROM pedidos')::int >= pg_temp.v('total_pedidos')::int)::text);
  PERFORM pg_temp.chk('visualizador NO modifica pedidos', '0', pg_temp.m(format('UPDATE pedidos SET observaciones = observaciones WHERE id = %s', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('visualizador ve facturas y clientes', 'true', (pg_temp.n('SELECT 1 FROM invoices')::int >= pg_temp.v('total_facturas')::int AND pg_temp.n('SELECT 1 FROM clientes')::int > 0)::text);

  PERFORM pg_temp.como('editor');
  PERFORM pg_temp.chk('editor ve todos los pedidos', 'true', (pg_temp.n('SELECT 1 FROM pedidos')::int >= pg_temp.v('total_pedidos')::int)::text);
  PERFORM pg_temp.chk('editor modifica pedidos y líneas', '1/1', pg_temp.m(format('UPDATE pedidos SET observaciones = observaciones WHERE id = %s', pg_temp.v('p2')))
    || '/' || pg_temp.m(format('UPDATE pedido_detalles SET cantidad = cantidad WHERE pedido_id = %s', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('editor ve todas las reservas', pg_temp.v('total_reservas'), pg_temp.n('SELECT 1 FROM reservas'));
  PERFORM pg_temp.chk('editor gestiona facturas', '1', pg_temp.m(format('UPDATE invoices SET status = status WHERE id = %L', pg_temp.v('f2'))));
  PERFORM pg_temp.chk('editor NO crea descuentos (solo administración)', '42501', pg_temp.err('INSERT INTO global_discounts (name, discount_percent, scope, active) VALUES (''x'', 5, ''GLOBAL'', false)'));
  PERFORM pg_temp.chk('editor NO cambia ajustes (solo administración)', '0', pg_temp.m('UPDATE settings SET value = value'));
  PERFORM pg_temp.chk('editor edita libros', '1', pg_temp.m(format('UPDATE libros SET stock = stock WHERE id = %s', pg_temp.v('libro'))));

  PERFORM pg_temp.como('admin');
  PERFORM pg_temp.chk('admin crea descuentos', 'ok', pg_temp.err('INSERT INTO global_discounts (name, discount_percent, scope, active) VALUES (''prueba C1'', 5, ''GLOBAL'', false)'));
  PERFORM pg_temp.chk('admin ve la auditoría', 'true', (pg_temp.n('SELECT 1 FROM auditoria')::int > 0)::text);
  PERFORM pg_temp.chk('admin cambia ajustes', 'true', (pg_temp.m('UPDATE settings SET value = value')::int > 0)::text);
END $$;
RESET ROLE;

-- ---------- Funciones peligrosas ----------
SET LOCAL ROLE anon;
SELECT pg_temp.como('anon');
SELECT pg_temp.chk('anon NO borra pedidos', '42501', pg_temp.err(format('SELECT hard_delete_order(%s)', pg_temp.v('p2'))));
SELECT pg_temp.chk('anon NO toca stock', '42501', pg_temp.err(format('SELECT decrement_stock(%s, 1)', pg_temp.v('libro'))));
SELECT pg_temp.chk('anon NO confirma pedidos', '42501', pg_temp.err(format('SELECT confirm_order_and_deduct_stock(%s)', pg_temp.v('p2'))));
SELECT pg_temp.chk('anon NO ve reservas de administración', '42501', pg_temp.err('SELECT get_admin_reservations(1, 10)'));
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM pg_temp.como('cliente1');
  PERFORM pg_temp.chk('cliente NO borra pedidos', '42501', pg_temp.err(format('SELECT hard_delete_order(%s)', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('cliente NO toca stock', '42501', pg_temp.err(format('SELECT decrement_stock(%s, 1)', pg_temp.v('libro'))));
  PERFORM pg_temp.chk('cliente NO devuelve stock', '42501', pg_temp.err(format('SELECT restore_stock_force(%s)', pg_temp.v('p1'))));
  PERFORM pg_temp.chk('cliente NO confirma pedidos ajenos', '42501', pg_temp.err(format('SELECT confirm_order_and_deduct_stock(%s)', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('cliente NO descuenta stock de pedidos ajenos', '42501', pg_temp.err(format('SELECT deduct_stock_force(%s)', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('cliente confirma SU pedido (provisional, web publicada al pagar)', 'ok', pg_temp.err(format('SELECT confirm_order_and_deduct_stock(%s)', pg_temp.v('p1'))));
  PERFORM pg_temp.chk('cliente NO fusiona categorías', 'P0001', pg_temp.err('SELECT admin_merge_categories(ARRAY[]::bigint[], 1)'));

  PERFORM pg_temp.como('editor');
  PERFORM pg_temp.chk('editor devuelve stock', 'ok', pg_temp.err(format('SELECT restore_stock_force(%s)', pg_temp.v('p2'))));
  PERFORM pg_temp.chk('editor NO borra pedidos (solo administración)', '42501', pg_temp.err(format('SELECT hard_delete_order(%s)', pg_temp.v('p2'))));
  PERFORM pg_temp.como('admin');
  PERFORM pg_temp.chk('admin borra pedidos', 'ok', pg_temp.err(format('SELECT hard_delete_order(%s)', pg_temp.v('p2'))));
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.como('servidor');
SELECT pg_temp.chk('servidor (webhook) descuenta stock de cualquier pedido', 'ok', pg_temp.err(format('SELECT deduct_stock_force(%s)', pg_temp.v('p1'))));
RESET ROLE;

-- ---------- Sin sesión: lo que necesita la web publicada, y nada más ----------
SET LOCAL ROLE anon;
SELECT pg_temp.como('anon');
SELECT pg_temp.chk('anon: login por usuario (email por username, web publicada)', '1',
  pg_temp.n(format('SELECT email FROM usuarios WHERE username ILIKE %L', pg_temp.v('cliente1_user'))));
SELECT pg_temp.chk('anon: reseñas (id, email, username, nombre)', 'ok', pg_temp.err('SELECT id, email, username, nombre FROM usuarios LIMIT 1'));
SELECT pg_temp.chk('anon NO lee teléfonos', '42501', pg_temp.err('SELECT telefono FROM usuarios LIMIT 1'));
SELECT pg_temp.chk('anon NO lee direcciones', '42501', pg_temp.err('SELECT direccion FROM usuarios LIMIT 1'));
SELECT pg_temp.chk('anon NO lee select *', '42501', pg_temp.err('SELECT * FROM usuarios LIMIT 1'));
SELECT pg_temp.chk('anon: resolver_email_login sigue funcionando', 'true', (resolver_email_login(pg_temp.v('cliente1_user')) IS NOT NULL)::text);
SELECT pg_temp.chk('anon lee catálogo, categorías y contenidos', 'true',
  (pg_temp.n('SELECT 1 FROM libros LIMIT 5') = '5' AND pg_temp.n('SELECT 1 FROM categorias LIMIT 1') = '1' AND pg_temp.n('SELECT 1 FROM libros_contenidos') <> '42501')::text);
SELECT pg_temp.chk('anon NO escribe contenidos', '42501', pg_temp.err('INSERT INTO libros_contenidos (libro_id, titulo) VALUES (1, ''x'')'));
SELECT pg_temp.chk('anon: buscar_catalogo y calcular_pedido_app siguen', 'ok', pg_temp.err('SELECT buscar_catalogo(p_limite := 1)') );
RESET ROLE;

-- ---------- La app sigue funcionando con las funciones del servidor ----------
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
  PERFORM pg_temp.como('cliente1');
  r := crear_pedido_app(jsonb_build_array(jsonb_build_object('libro_id', pg_temp.v('libro')::int, 'cantidad', 1)),
    '{"nombre":"A","apellidos":"B","telefono":"600000000","direccion":"C","ciudad":"D","codigo_postal":"1","provincia":"E","pais":"España"}', 'standard', gen_random_uuid());
  PERFORM pg_temp.chk('app: el cliente crea su pedido', 'true', r->>'ok');
  INSERT INTO _ctx VALUES ('p_app', r->>'pedido_id');
  PERFORM pg_temp.como('editor');
  r := aceptar_pedido_web(pg_temp.v('p_app')::bigint, 5);
  PERFORM pg_temp.chk('app: el editor acepta el pedido', 'true', r->>'ok');
END $$;
RESET ROLE;

-- ---------- Estructura ----------
SELECT pg_temp.chk('tabla libros_backup_20260105 borrada', 'false', (to_regclass('public.libros_backup_20260105') IS NOT NULL)::text);
SELECT pg_temp.chk('libros_contenidos con RLS', 'true', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.libros_contenidos'::regclass));
SELECT pg_temp.chk('banners de storage solo administración', '3', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'Administración%'));
SELECT pg_temp.chk('registro: alta de usuario con rol usuario sigue funcionando', 'ok',
  pg_temp.err('SELECT set_config(''request.jwt.claims'', ''{"role":"anon"}'', true); INSERT INTO usuarios (username, email, rol_id) VALUES (''zz_prueba_c1'', ''zz_prueba_c1@example.com'', 2)'));
SELECT pg_temp.chk('registro: nadie se da de alta como personal', '42501',
  pg_temp.err('SELECT set_config(''request.jwt.claims'', ''{"role":"anon"}'', true); INSERT INTO usuarios (username, email, rol_id) VALUES (''zz_prueba_c1b'', ''zz_prueba_c1b@example.com'', 1)'));

SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;

-- Obligatorio: deshace todos los datos de prueba aunque se ejecute suelto en el editor SQL.
ROLLBACK;
