-- =====================================================================================
-- Verificación del paso A. Se ejecuta DENTRO de la transacción del paso A (ver
-- instrucciones) o después de aplicarlo; siempre termina en ROLLBACK: no deja cambios.
-- Las secuencias (ids) pueden avanzar: los huecos son normales.
--
-- Uso tras aplicar A:   BEGIN; <este archivo sin la primera línea BEGIN> ... ROLLBACK;
-- Cuentas de prueba: un super_admin, un cliente (rol 2 sin roles avanzados) y un editor
-- por usuarios_roles. Se eligen por consulta, no por email fijo.
-- =====================================================================================

CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
GRANT ALL ON _r TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE _r_n_seq TO anon, authenticated, service_role;

CREATE TEMP TABLE _ctx ON COMMIT DROP AS
SELECT
  (SELECT auth_user_id FROM usuarios WHERE rol_id = 1 AND auth_user_id IS NOT NULL ORDER BY fecha_registro LIMIT 1) AS super_auth,
  (SELECT u.auth_user_id FROM usuarios u WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)
      ORDER BY u.fecha_registro LIMIT 1) AS cliente_auth,
  (SELECT ur.user_id FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id JOIN usuarios u ON u.auth_user_id = ur.user_id
      WHERE ur.activo AND r.nombre = 'editor' AND u.rol_id = 2 LIMIT 1) AS editor_auth,
  (SELECT id FROM pedidos p WHERE p.tipo = 'interno' AND p.estado = 'payment_pending'
      AND EXISTS (SELECT 1 FROM pedido_detalles d WHERE d.pedido_id = p.id AND d.libro_id IS NOT NULL)
      ORDER BY id DESC LIMIT 1) AS pedido_id;
GRANT SELECT ON _ctx TO anon, authenticated, service_role;

-- ---------- 1. Roles ----------
DO $$ DECLARE c record; BEGIN
  SELECT * INTO c FROM _ctx;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.super_auth, 'role', 'authenticated')::text, true);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('super_admin es super_admin', 't', tiene_algun_rol(ARRAY['super_admin'])::text, tiene_algun_rol(ARRAY['super_admin']));
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.cliente_auth, 'role', 'authenticated')::text, true);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('cliente NO es personal', 'f', tiene_algun_rol(ARRAY['super_admin','admin','editor','visualizador'])::text, NOT tiene_algun_rol(ARRAY['super_admin','admin','editor','visualizador']));
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.editor_auth, 'role', 'authenticated')::text, true);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('editor por usuarios_roles es editor', 't', tiene_algun_rol(ARRAY['editor'])::text, tiene_algun_rol(ARRAY['editor']));
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('editor NO es super_admin', 'f', tiene_algun_rol(ARRAY['super_admin'])::text, NOT tiene_algun_rol(ARRAY['super_admin']));
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('anónimo NO tiene roles', 'f', tiene_algun_rol(ARRAY['usuario','super_admin'])::text, NOT tiene_algun_rol(ARRAY['usuario','super_admin']));
END $$;

-- ---------- 2. Perfil propio (como cliente, con el rol authenticated real) ----------
DO $$ DECLARE c record; BEGIN
  SELECT * INTO c FROM _ctx;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.cliente_auth, 'role', 'authenticated')::text, true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE antes record; despues record; r jsonb; v_err text;
BEGIN
  SELECT * INTO antes FROM usuarios WHERE auth_user_id = auth.uid();
  r := actualizar_mi_perfil(p_telefono => '600111222');
  SELECT * INTO despues FROM usuarios WHERE auth_user_id = auth.uid();
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('perfil: cambia solo el teléfono', '600111222 / resto igual',
    despues.telefono || ' / ' || (despues.direccion IS NOT DISTINCT FROM antes.direccion AND despues.nombre_completo IS NOT DISTINCT FROM antes.nombre_completo AND despues.rol_id = antes.rol_id)::text,
    despues.telefono = '600111222' AND despues.direccion IS NOT DISTINCT FROM antes.direccion AND despues.nombre_completo IS NOT DISTINCT FROM antes.nombre_completo AND despues.rol_id = antes.rol_id);

  r := actualizar_mi_perfil(p_ciudad => '', p_nombre_completo => 'Prueba Perfil');
  SELECT * INTO despues FROM usuarios WHERE auth_user_id = auth.uid();
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('perfil: vacío borra y nombre se copia a nombre', 'ciudad NULL, ambos nombres',
    coalesce(despues.ciudad, 'NULL') || ' / ' || despues.nombre_completo || ' / ' || despues.nombre,
    despues.ciudad IS NULL AND despues.nombre_completo = 'Prueba Perfil' AND despues.nombre = 'Prueba Perfil');

  BEGIN r := actualizar_mi_perfil(p_fecha_nacimiento => '2999-01-01'); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('perfil: fecha futura rechazada', 'error', v_err, v_err <> 'sin error');

  BEGIN r := actualizar_mi_perfil(p_codigo_postal => '12345678901'); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('perfil: CP demasiado largo rechazado', 'error', v_err, v_err <> 'sin error');

  -- La función no da acceso de escritura directo: un UPDATE del cliente sobre otro usuario no es asunto del paso A
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$ DECLARE v_err text; BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  BEGIN PERFORM actualizar_mi_perfil(p_telefono => '1'); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('perfil: anónimo no puede ejecutar', 'error', v_err, v_err <> 'sin error');

  -- ---------- 3. Login por nombre de usuario (como anónimo) ----------
  INSERT INTO _r (caso, esperado, obtenido, ok)
  SELECT 'login: username -> email', u.email, resolver_email_login(upper(u.username)), resolver_email_login(upper(u.username)) = u.email
  FROM (SELECT username, email FROM usuarios WHERE rol_id = 2 AND username IS NOT NULL AND position('@' IN username) = 0
          AND (SELECT count(*) FROM usuarios x WHERE lower(x.username) = lower(usuarios.username)) = 1
        ORDER BY fecha_registro, id LIMIT 1) u;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('login: desconocido -> NULL', 'NULL', coalesce(resolver_email_login('zz_no_existe_zz'), 'NULL'), resolver_email_login('zz_no_existe_zz') IS NULL);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('login: email se devuelve tal cual', 'a@b.es', resolver_email_login(' a@b.es '), resolver_email_login(' a@b.es ') = 'a@b.es');

  -- ---------- 4. Ajustes públicos (como anónimo) ----------
  INSERT INTO _r (caso, esperado, obtenido, ok)
  SELECT 'settings: anónimo ve tarifas e IVA', '>0 shipping y tax_rate',
         count(*) FILTER (WHERE category = 'shipping') || ' shipping, tax_rate=' || coalesce(max(value::text) FILTER (WHERE key = 'tax_rate'), 'NULL'),
         count(*) FILTER (WHERE category = 'shipping') > 0 AND max(value::text) FILTER (WHERE key = 'tax_rate') IS NOT NULL
  FROM settings;
  INSERT INTO _r (caso, esperado, obtenido, ok)
  SELECT 'settings: anónimo NO ve security', '0', count(*)::text, count(*) = 0 FROM settings WHERE category = 'security';

  -- ---------- 5. Las funciones de pago no son ejecutables por anónimo ----------
  BEGIN PERFORM confirmar_pago_pedido(1, 'pi_x', 100, 'eur'); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: anónimo no puede confirmar', 'error de permiso', v_err, v_err ILIKE '%permission%');
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; v_err text; BEGIN
  SELECT * INTO c FROM _ctx;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.super_auth, 'role', 'authenticated')::text, true);
  BEGIN PERFORM confirmar_pago_pedido(1, 'pi_x', 100, 'eur'); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: ni siquiera super_admin desde el navegador', 'error de permiso', v_err, v_err ILIKE '%permission%');
  BEGIN PERFORM crear_factura_desde_pedido(1); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('factura: navegador no puede crearla', 'error de permiso', v_err, v_err ILIKE '%permission%');
END $$;
RESET ROLE;

-- ---------- 6. Pago completo sobre un pedido web pendiente (como el webhook: service_role) ----------
SET LOCAL ROLE service_role;
DO $$
DECLARE
  c record; p record; r jsonb; v_libro bigint; v_stock_antes int; v_stock_1 int; v_stock_2 int;
  v_cant int; v_inv record; v_items int; v_max_antes int; v_obs text;
BEGIN
  SELECT * INTO c FROM _ctx;
  IF c.pedido_id IS NULL THEN
    INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: hay pedido de prueba', 'pedido payment_pending', 'ninguno', false);
    RETURN;
  END IF;
  SELECT * INTO p FROM pedidos WHERE id = c.pedido_id;
  SELECT libro_id, sum(cantidad) INTO v_libro, v_cant FROM pedido_detalles WHERE pedido_id = p.id AND libro_id IS NOT NULL GROUP BY libro_id ORDER BY libro_id LIMIT 1;
  -- Stock conocido para que el descuento sea observable (se deshace con el ROLLBACK final)
  UPDATE libros SET stock = v_cant + 5 WHERE id = v_libro;
  SELECT stock INTO v_stock_antes FROM libros WHERE id = v_libro;
  SELECT coalesce(max(split_part(invoice_number, '-', 2)::int), 0) INTO v_max_antes FROM invoices WHERE invoice_number ~ ('^' || to_char(now(), 'YYYY') || '-[0-9]+$');

  -- Importe incorrecto: no confirma, deja nota, no toca stock
  r := confirmar_pago_pedido(p.id, 'pi_test_mal', round(p.total * 100)::int - 1, 'eur');
  SELECT stock INTO v_stock_1 FROM libros WHERE id = v_libro;
  SELECT observaciones INTO v_obs FROM pedidos WHERE id = p.id;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: importe incorrecto -> mismatch, sin stock', 'mismatch / stock igual / nota',
    (r->>'status') || ' / ' || v_stock_1 || '=' || v_stock_antes || ' / nota=' || (v_obs ILIKE '%pi_test_mal%')::text,
    r->>'status' = 'mismatch' AND v_stock_1 = v_stock_antes AND v_obs ILIKE '%pi_test_mal%');

  -- Moneda incorrecta
  r := confirmar_pago_pedido(p.id, 'pi_test_jpy', round(p.total * 100)::int, 'jpy');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: otra moneda -> mismatch', 'mismatch', r->>'status', r->>'status' = 'mismatch');

  -- Correcto
  r := confirmar_pago_pedido(p.id, 'pi_test_ok', round(p.total * 100)::int, 'eur');
  SELECT stock INTO v_stock_1 FROM libros WHERE id = v_libro;
  SELECT * INTO v_inv FROM invoices WHERE id = (r->>'invoice_id')::uuid;
  SELECT count(*) INTO v_items FROM invoice_items WHERE invoice_id = v_inv.id;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: confirmado', 'confirmed + procesando',
    (r->>'status') || ' + ' || (SELECT estado::text FROM pedidos WHERE id = p.id),
    r->>'status' = 'confirmed' AND (SELECT estado::text FROM pedidos WHERE id = p.id) = 'procesando');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: stock descontado una vez', greatest(0, v_stock_antes - v_cant)::text, v_stock_1::text, v_stock_1 = greatest(0, v_stock_antes - v_cant));
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('factura: Pagada, total = pedido, número siguiente',
    'Pagada / ' || p.total || ' / ' || to_char(now(), 'YYYY') || '-' || lpad((v_max_antes + 1)::text, 4, '0'),
    coalesce(v_inv.status, 'NULL') || ' / ' || coalesce(v_inv.total::text, 'NULL') || ' / ' || coalesce(v_inv.invoice_number, 'NULL'),
    v_inv.status = 'Pagada' AND v_inv.total = round(p.total, 2) AND v_inv.invoice_number = to_char(now(), 'YYYY') || '-' || lpad((v_max_antes + 1)::text, 4, '0'));
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('factura: base + cuota + envío = total; nombre válido; líneas',
    'cuadra / sin undefined / ' || (SELECT count(*) FROM pedido_detalles WHERE pedido_id = p.id),
    (v_inv.subtotal + v_inv.tax_amount + coalesce(p.coste_envio, 0) - v_inv.total)::text || ' / ' || v_inv.customer_name || ' / ' || v_items,
    abs(v_inv.subtotal + v_inv.tax_amount + coalesce(p.coste_envio, 0) - v_inv.total) <= 0.01
      AND v_inv.customer_name NOT ILIKE '%undefined%'
      AND v_items = (SELECT count(*) FROM pedido_detalles WHERE pedido_id = p.id));

  -- Reintento del mismo pago (Stripe reenvía el webhook): no repite nada
  r := confirmar_pago_pedido(p.id, 'pi_test_ok', round(p.total * 100)::int, 'eur');
  SELECT stock INTO v_stock_2 FROM libros WHERE id = v_libro;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: reintento idempotente', 'already_confirmed / stock igual / 1 factura',
    (r->>'status') || ' / ' || v_stock_2 || '=' || v_stock_1 || ' / ' || (SELECT count(*) FROM invoices WHERE order_id = p.id::text),
    r->>'status' = 'already_confirmed' AND v_stock_2 = v_stock_1 AND (SELECT count(*) FROM invoices WHERE order_id = p.id::text) = 1);

  -- Un segundo pago distinto sobre un pedido ya pagado no confirma (doble cobro a revisar)
  r := confirmar_pago_pedido(p.id, 'pi_test_otro', round(p.total * 100)::int, 'eur');
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pago: segundo pago distinto -> mismatch', 'mismatch', r->>'status', r->>'status' = 'mismatch');
END $$;
RESET ROLE;

SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;

-- Obligatorio: deshace todos los datos de prueba aunque se ejecute suelto en el editor SQL.
ROLLBACK;
