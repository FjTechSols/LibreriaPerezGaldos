-- Verificación del paso B (avisos al personal). Termina en ROLLBACK (ver uso en el paso A).
CREATE TEMP TABLE _r (n serial, caso text, esperado text, obtenido text, ok boolean) ON COMMIT DROP;
GRANT ALL ON _r TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE _r_n_seq TO anon, authenticated, service_role;

CREATE TEMP TABLE _ctx ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM ids_personal(ARRAY['super_admin','admin','editor'])) AS n_personal,
  (SELECT u.id FROM usuarios u WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)
     ORDER BY u.fecha_registro, u.id LIMIT 1) AS cliente_id,
  (SELECT u.auth_user_id FROM usuarios u WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)
     ORDER BY u.fecha_registro, u.id LIMIT 1) AS cliente_auth,
  (SELECT u.auth_user_id FROM usuarios u WHERE u.rol_id = 2 AND u.auth_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur WHERE ur.user_id = u.auth_user_id AND ur.activo)
     ORDER BY u.fecha_registro DESC, u.id LIMIT 1) AS otro_cliente_auth,
  (SELECT id FROM libros WHERE activo ORDER BY id LIMIT 1) AS libro_id,
  NULL::bigint AS pedido_id,
  (SELECT count(*) FROM ids_personal(ARRAY['super_admin','admin','editor']) i JOIN usuarios u ON u.id = i
     WHERE u.rol_id = 2 AND NOT EXISTS (SELECT 1 FROM usuarios_roles ur JOIN roles r ON r.id = ur.rol_id
        WHERE ur.user_id = u.auth_user_id AND ur.activo AND r.nombre IN ('super_admin','admin','editor'))) AS clientes_en_personal;
GRANT ALL ON _ctx TO anon, authenticated, service_role;

INSERT INTO _r (caso, esperado, obtenido, ok)
SELECT 'personal: 2 super_admin + 5 por usuarios_roles', '7 / 0 clientes', n_personal || ' / ' || clientes_en_personal, n_personal = 7 AND clientes_en_personal = 0 FROM _ctx;

-- Pedido web sintético del cliente (se deshace al final)
WITH p AS (
  INSERT INTO pedidos (usuario_id, tipo, estado, subtotal, iva, total, metodo_pago, coste_envio)
  SELECT cliente_id, 'interno', 'pending_verification', 9.62, 0.38, 10.00, 'tarjeta', 0 FROM _ctx
  RETURNING id)
UPDATE _ctx SET pedido_id = (SELECT id FROM p);
INSERT INTO pedido_detalles (pedido_id, libro_id, cantidad, precio_unitario)
SELECT pedido_id, libro_id, 1, 10.00 FROM _ctx;

SET LOCAL ROLE authenticated;
DO $$ DECLARE c record; n int; v_err text; BEGIN
  SELECT * INTO c FROM _ctx;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.cliente_auth, 'role', 'authenticated')::text, true);
  n := notificar_personal_pedido(c.pedido_id);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pedido: el cliente avisa al personal', c.n_personal::text, n::text, n = c.n_personal);
  n := notificar_personal_pedido(c.pedido_id);
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pedido: segundo aviso no se repite', '0', n::text, n = 0);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', c.otro_cliente_auth, 'role', 'authenticated')::text, true);
  BEGIN n := notificar_personal_pedido(c.pedido_id); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('pedido: otro cliente no puede avisar', 'error', v_err, v_err <> 'sin error');

  BEGIN PERFORM * FROM ids_personal(ARRAY['super_admin']); v_err := 'sin error';
  EXCEPTION WHEN others THEN v_err := SQLERRM; END;
  INSERT INTO _r (caso, esperado, obtenido, ok) VALUES ('ids_personal: no accesible desde la API', 'permiso denegado', v_err, v_err ILIKE '%permission%');
END $$;
RESET ROLE;

INSERT INTO _r (caso, esperado, obtenido, ok)
SELECT 'pedido: avisos solo a personal, con número', '0 clientes / con #',
       count(*) FILTER (WHERE n.usuario_id NOT IN (SELECT ids_personal(ARRAY['super_admin','admin','editor']))) || ' clientes / ' || bool_and(n.mensaje LIKE '%#' || c.pedido_id || '%'),
       count(*) FILTER (WHERE n.usuario_id NOT IN (SELECT ids_personal(ARRAY['super_admin','admin','editor']))) = 0 AND bool_and(n.mensaje LIKE '%#' || c.pedido_id || '%')
FROM notificaciones n, _ctx c WHERE n.tipo = 'pedido' AND n.mensaje LIKE '%#' || c.pedido_id || '%';

-- Reserva sintética: el trigger corregido avisa solo al personal
INSERT INTO reservas (usuario_id, libro_id, estado) SELECT cliente_id, libro_id, 'pendiente' FROM _ctx;
INSERT INTO _r (caso, esperado, obtenido, ok)
SELECT 'reserva: avisos solo a personal', c.n_personal || ' personal / 0 clientes',
       count(*) FILTER (WHERE n.usuario_id IN (SELECT ids_personal(ARRAY['super_admin','admin','editor']))) || ' personal / ' ||
       count(*) FILTER (WHERE n.usuario_id NOT IN (SELECT ids_personal(ARRAY['super_admin','admin','editor']))) || ' clientes',
       count(*) FILTER (WHERE n.usuario_id NOT IN (SELECT ids_personal(ARRAY['super_admin','admin','editor']))) = 0
         AND count(*) = c.n_personal
FROM notificaciones n, _ctx c
WHERE n.tipo = 'reserva_creada' AND n.reserva_id = (SELECT max(id) FROM reservas WHERE usuario_id = c.cliente_id)
GROUP BY c.n_personal;

SELECT n, ok, caso, esperado, obtenido FROM _r ORDER BY n;

-- Obligatorio: deshace todos los datos de prueba aunque se ejecute suelto en el editor SQL.
ROLLBACK;
