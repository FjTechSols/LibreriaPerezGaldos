-- Verificación de E2 (compra desde la app). Empieza con BEGIN y TERMINA EN ROLLBACK:
-- libros, descuentos, pedidos y avisos de prueba se deshacen aunque se ejecute suelto.
-- En el editor SQL el resultado puede no verse (lo último es el ROLLBACK): ejecutar vía CLI.
BEGIN;

CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
CREATE TEMP TABLE _ctx (k text PRIMARY KEY, v text) ON COMMIT DROP;
GRANT ALL ON _r, _ctx TO anon, authenticated;
GRANT USAGE ON SEQUENCE _r_n_seq TO anon, authenticated;

CREATE FUNCTION pg_temp.chk(p_caso text, p_esperado text, p_obtenido text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES (p_caso, p_esperado, coalesce(p_obtenido, 'NULL'), p_esperado = coalesce(p_obtenido, 'NULL'));
$$;
CREATE FUNCTION pg_temp.v(p_k text) RETURNS text LANGUAGE sql AS $$ SELECT v FROM _ctx WHERE k = p_k $$;
CREATE FUNCTION pg_temp.como(p_k text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', pg_temp.v(p_k), 'role', 'authenticated')::text, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.chk(text, text, text), pg_temp.v(text), pg_temp.como(text) TO anon, authenticated;

-- Dos clientes sin roles de personal y tres libros de prueba (modificados dentro de la transacción)
INSERT INTO _ctx
SELECT 'cliente' || rn, auth_user_id::text FROM (
  SELECT u.auth_user_id, row_number() OVER (ORDER BY u.fecha_registro, u.id) rn FROM usuarios u
  WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL AND coalesce(u.activo, true)
    AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)) x WHERE rn <= 2;
INSERT INTO _ctx SELECT 'cliente1_id', id::text FROM usuarios WHERE auth_user_id::text = pg_temp.v('cliente1');
INSERT INTO _ctx SELECT 'libro' || rn, id::text FROM (
  SELECT id, row_number() OVER (ORDER BY id) rn FROM libros WHERE activo AND categoria_id IS NOT NULL) x WHERE rn <= 3;
INSERT INTO _ctx SELECT 'cat1', categoria_id::text FROM libros WHERE id = pg_temp.v('libro1')::int;
UPDATE libros SET precio = 10, stock = 3, oferta = false, precio_original = NULL WHERE id = pg_temp.v('libro1')::int;
UPDATE libros SET precio = 12, stock = 5, oferta = true, precio_original = 20 WHERE id = pg_temp.v('libro2')::int;
UPDATE libros SET activo = false WHERE id = pg_temp.v('libro3')::int;
UPDATE global_discounts SET active = false;  -- solo dentro de la prueba (hoy hay 0 filas)
INSERT INTO _ctx SELECT 'staff', count(*)::text FROM usuarios u WHERE coalesce(u.activo, true) AND (
  EXISTS (SELECT 1 FROM roles r WHERE r.id = u.rol_id AND r.nombre IN ('super_admin', 'admin', 'editor'))
  OR EXISTS (SELECT 1 FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id WHERE ur.user_id = u.auth_user_id AND ur.activo AND r.nombre IN ('super_admin', 'admin', 'editor')));

CREATE FUNCTION pg_temp.items(VARIADIC p text[]) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_agg(jsonb_build_object('libro_id', pg_temp.v(split_part(x, ':', 1))::int, 'cantidad', split_part(x, ':', 2)::int)) FROM unnest(p) x
$$;
GRANT EXECUTE ON FUNCTION pg_temp.items(text[]) TO anon, authenticated;

-- ---------- Zonas ----------
SELECT pg_temp.chk('zona España', 'national', zona_envio(' españa '));
SELECT pg_temp.chk('zona Portugal', 'europe', zona_envio('Portugal'));
SELECT pg_temp.chk('zona United Kingdom (variante)', 'europe', zona_envio('United Kingdom'));
SELECT pg_temp.chk('zona México', 'america', zona_envio('México'));
SELECT pg_temp.chk('zona Japón', 'asia', zona_envio('Japón'));
SELECT pg_temp.chk('zona desconocida', 'other', zona_envio('Marte'));

-- ---------- Cálculo (como visitante, sin sesión) ----------
SET LOCAL ROLE anon;
SELECT pg_temp.chk('carrito vacío', 'carrito_vacio', calcular_pedido_app('[]'::jsonb)->>'codigo');
SELECT pg_temp.chk('cantidad 0 rechazada', 'carrito_no_valido', calcular_pedido_app(jsonb_build_array(jsonb_build_object('libro_id', 1, 'cantidad', 0)))->>'codigo');
SELECT pg_temp.chk('libro_id con texto rechazado', 'carrito_no_valido', calcular_pedido_app('[{"libro_id":"1 OR 1=1","cantidad":1}]'::jsonb)->>'codigo');
SELECT pg_temp.chk('nacional estándar bajo umbral: 2×10 + 4 envío',
  'true / 20.00 / 4.00 / 24.00 / standard',
  (SELECT (r->>'ok') || ' / ' || (r->>'productos') || ' / ' || (r->>'envio') || ' / ' || (r->>'total') || ' / ' || (r->>'metodo')
   FROM calcular_pedido_app(pg_temp.items('libro1:2')) r));
SELECT pg_temp.chk('líneas repetidas se suman (1+2 = 3)', '3', calcular_pedido_app(pg_temp.items('libro1:1', 'libro1:2'))->'lineas'->0->>'cantidad');
SELECT pg_temp.chk('nacional estándar desde 30 € gratis: 3×10', '0.00', calcular_pedido_app(pg_temp.items('libro1:3'))->>'envio');
SELECT pg_temp.chk('nacional urgente bajo 50 €: 6', '6.00', calcular_pedido_app(pg_temp.items('libro1:3'), 'España', 'express')->>'envio');
SELECT pg_temp.chk('Portugal: tarifa Europa 15, siempre urgente, sin gratis', '15.00 / express / true',
  (SELECT (r->>'envio') || ' / ' || (r->>'metodo') || ' / ' || (r->>'internacional') FROM calcular_pedido_app(pg_temp.items('libro1:3', 'libro2:5'), 'Portugal', 'standard') r));
SELECT pg_temp.chk('Japón: tarifa Asia 30', '30.00', calcular_pedido_app(pg_temp.items('libro1:1'), 'Japón')->>'envio');
SELECT pg_temp.chk('país desconocido: resto del mundo 35', '35.00', calcular_pedido_app(pg_temp.items('libro1:1'), 'Marte')->>'envio');
SELECT pg_temp.chk('IVA 4 % incluido: 2×10 -> base 19.23 + IVA 0.77', '4 / 19.23 / 0.77',
  (SELECT (r->>'tasa_iva') || ' / ' || (r->>'subtotal') || ' / ' || (r->>'iva') FROM calcular_pedido_app(pg_temp.items('libro1:2')) r));
SELECT pg_temp.chk('stock insuficiente: 4 > 3', 'false / stock_insuficiente / lineas_no_disponibles',
  (SELECT (r->>'ok') || ' / ' || (r->'lineas'->0->>'estado') || ' / ' || (r->>'codigo') FROM calcular_pedido_app(pg_temp.items('libro1:4')) r));
SELECT pg_temp.chk('libro inactivo: no disponible', 'false / no_disponible',
  (SELECT (r->>'ok') || ' / ' || (r->'lineas'->0->>'estado') FROM calcular_pedido_app(pg_temp.items('libro3:1')) r));
SELECT pg_temp.chk('libro inexistente: no disponible', 'no_disponible', calcular_pedido_app('[{"libro_id":2147483000,"cantidad":1}]'::jsonb)->'lineas'->0->>'estado');
RESET ROLE;

-- ---------- Descuentos (como la web) ----------
INSERT INTO global_discounts (name, discount_percent, scope, active) VALUES ('prueba E2 global', 10, 'GLOBAL', true);
SET LOCAL ROLE anon;
SELECT pg_temp.chk('descuento global 10 %: 10 -> 9.00', '9.00', calcular_pedido_app(pg_temp.items('libro1:1'))->'lineas'->0->>'precio');
SELECT pg_temp.chk('libro con oferta propia ignora el descuento global: 12', '12.00', calcular_pedido_app(pg_temp.items('libro2:1'))->'lineas'->0->>'precio');
RESET ROLE;
INSERT INTO global_discounts (name, discount_percent, scope, target_category_id, active)
VALUES ('prueba E2 categoría', 25, 'CATEGORY', pg_temp.v('cat1')::bigint, true);
INSERT INTO global_discounts (name, discount_percent, scope, active, end_date) VALUES ('prueba E2 caducado', 50, 'GLOBAL', true, now() - interval '1 day');
SET LOCAL ROLE anon;
SELECT pg_temp.chk('gana el mayor descuento vigente (25 % de categoría; el 50 % caducado no cuenta)', '7.50',
  calcular_pedido_app(pg_temp.items('libro1:1'))->'lineas'->0->>'precio');
RESET ROLE;
UPDATE global_discounts SET active = false WHERE name LIKE 'prueba E2%';

-- ---------- Crear pedido ----------
SET LOCAL ROLE anon;
DO $$ DECLARE v_err text; BEGIN
  BEGIN PERFORM crear_pedido_app(pg_temp.items('libro1:1'), '{}'::jsonb, 'standard', gen_random_uuid()); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLSTATE; END;
  PERFORM pg_temp.chk('visitante sin sesión no puede crear pedidos', '42501', v_err);
END $$;
RESET ROLE;

INSERT INTO _ctx VALUES ('comprobante', gen_random_uuid()::text),
  ('envio', '{"nombre":"Ana","apellidos":"Prueba","telefono":"600000000","direccion":"Calle Mayor 1","ciudad":"Madrid","codigo_postal":"28001","provincia":"Madrid","pais":"España","observaciones":"  Llamar antes  "}');
INSERT INTO _ctx SELECT 'stock_antes', stock::text FROM libros WHERE id = pg_temp.v('libro1')::int;
INSERT INTO _ctx SELECT 'avisos_antes', count(*)::text FROM notificaciones;

SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; r2 jsonb; p record; BEGIN
  PERFORM pg_temp.como('cliente1');
  r := crear_pedido_app(pg_temp.items('libro1:2'), (pg_temp.v('envio') || '')::jsonb - 'ciudad', 'standard', gen_random_uuid());
  PERFORM pg_temp.chk('falta la ciudad', 'envio_incompleto / ciudad', (r->>'codigo') || ' / ' || (r->>'campo'));
  r := crear_pedido_app(pg_temp.items('libro1:4'), pg_temp.v('envio')::jsonb, 'standard', gen_random_uuid());
  PERFORM pg_temp.chk('sin stock suficiente no crea pedido', 'false / lineas_no_disponibles', (r->>'ok') || ' / ' || (r->>'codigo'));

  r := crear_pedido_app(pg_temp.items('libro1:2'), pg_temp.v('envio')::jsonb, 'standard', pg_temp.v('comprobante')::uuid);
  INSERT INTO _ctx VALUES ('pedido', r->>'pedido_id');
  SELECT * INTO p FROM pedidos WHERE id = (r->>'pedido_id')::int;
  PERFORM pg_temp.chk('pedido creado: interno, por verificar, total 24, envío 4, tarjeta, Otro', 'interno / pending_verification / 24.00 / 4.00 / tarjeta / Otro',
    p.tipo || ' / ' || p.estado || ' / ' || p.total || ' / ' || p.coste_envio || ' / ' || p.metodo_pago || ' / ' || p.transportista);
  PERFORM pg_temp.chk('pedido del usuario con la sesión', pg_temp.v('cliente1_id'), p.usuario_id::text);
  PERFORM pg_temp.chk('dirección con el formato de la web', 'Calle Mayor 1, 28001 Madrid, Madrid, España', p.direccion_envio);
  PERFORM pg_temp.chk('observaciones recortadas', 'Llamar antes', p.observaciones);
  PERFORM pg_temp.chk('base e IVA guardados', '19.23 / 0.77', p.subtotal || ' / ' || p.iva);
  PERFORM pg_temp.chk('línea con precio del servidor', '2 × 10', (SELECT cantidad || ' × ' || precio_unitario::numeric(10,0) FROM pedido_detalles WHERE pedido_id = p.id));

  r2 := crear_pedido_app(pg_temp.items('libro1:1'), pg_temp.v('envio')::jsonb, 'express', pg_temp.v('comprobante')::uuid);
  PERFORM pg_temp.chk('reintento con el mismo comprobante: mismo pedido, sin duplicar', 'true / ' || (r->>'pedido_id') || ' / 1',
    (r2->>'repetido') || ' / ' || (r2->>'pedido_id') || ' / ' || (SELECT count(*) FROM pedidos WHERE comprobante_app = pg_temp.v('comprobante')::uuid));

  PERFORM pg_temp.como('cliente2');
  r2 := crear_pedido_app(pg_temp.items('libro1:1'), pg_temp.v('envio')::jsonb, 'standard', pg_temp.v('comprobante')::uuid);
  PERFORM pg_temp.chk('otro cliente con ese comprobante: rechazado', 'comprobante_no_valido', r2->>'codigo');
END $$;
RESET ROLE;

SELECT pg_temp.chk('crear el pedido no descuenta stock', pg_temp.v('stock_antes'), (SELECT stock::text FROM libros WHERE id = pg_temp.v('libro1')::int));
SELECT pg_temp.chk('avisos: 1 al cliente + 1 por persona de personal', (1 + pg_temp.v('staff')::int)::text,
  ((SELECT count(*) FROM notificaciones) - pg_temp.v('avisos_antes')::int)::text);
SELECT pg_temp.chk('ningún otro cliente recibe el aviso del personal', '0',
  (SELECT count(*)::text FROM notificaciones n JOIN usuarios u ON u.id = n.usuario_id
   WHERE n.mensaje LIKE format('Nuevo pedido #%s %%', pg_temp.v('pedido')) AND u.rol_id = 2
     AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)));
SELECT pg_temp.chk('permisos: anon no ejecuta crear_pedido_app', 'false', has_function_privilege('anon', 'crear_pedido_app(jsonb, jsonb, text, uuid)', 'EXECUTE')::text);
SELECT pg_temp.chk('permisos: anon ejecuta calcular_pedido_app', 'true', has_function_privilege('anon', 'calcular_pedido_app(jsonb, text, text)', 'EXECUTE')::text);

SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;

-- Obligatorio: deshace todos los datos de prueba aunque se ejecute suelto en el editor SQL.
ROLLBACK;
