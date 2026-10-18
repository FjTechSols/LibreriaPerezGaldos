-- Transactional tests against temporary fixtures; no real order or inventory is modified.
BEGIN;
CREATE TEMP TABLE pedidos(id bigint PRIMARY KEY, estado text, tipo text);
CREATE TEMP TABLE pedido_detalles(id integer, pedido_id bigint, libro_id integer, cantidad integer);
CREATE TEMP TABLE libros(id integer PRIMARY KEY, stock integer, updated_at timestamptz);
CREATE TEMP TABLE auditoria(tabla text, registro_id bigint, accion text, datos_anteriores jsonb, datos_nuevos jsonb);
CREATE FUNCTION pg_temp.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('app.stock_test_admin', true), 'false')::boolean $$;
DO $prepare$
DECLARE body text; function_name text;
BEGIN
    SELECT pg_get_functiondef('public.cancel_order_out_of_stock(bigint,integer[])'::regprocedure) INTO body;
    body := replace(body, 'FUNCTION public.cancel_order_out_of_stock', 'FUNCTION pg_temp.cancel_order_out_of_stock');
    body := replace(body, 'public.is_admin()', 'pg_temp.is_admin()');
    body := replace(body, 'public.pedidos', 'pg_temp.pedidos');
    body := replace(body, 'public.pedido_detalles', 'pg_temp.pedido_detalles');
    body := replace(body, 'public.libros', 'pg_temp.libros');
    body := replace(body, 'public.auditoria', 'pg_temp.auditoria');
    EXECUTE body;
    FOREACH function_name IN ARRAY ARRAY['restore_stock_force','deduct_stock_force'] LOOP
        SELECT pg_get_functiondef(to_regprocedure('public.' || function_name || '(bigint)')) INTO body;
        body := replace(body, 'FUNCTION public.' || function_name, 'FUNCTION pg_temp.' || function_name);
        body := replace(body, 'public.pedidos', 'pg_temp.pedidos');
        body := replace(body, 'public.pedido_detalles', 'pg_temp.pedido_detalles');
        body := replace(body, 'public.libros', 'pg_temp.libros');
        EXECUTE body;
    END LOOP;
END;
$prepare$;
SET LOCAL app.stock_test_admin = 'true';
DO $checks$
DECLARE scenario record; expected integer; cases integer := 0;
BEGIN
    FOR scenario IN SELECT * FROM (VALUES
        ('pending_verification','interno',false),('payment_pending','interno',false),
        ('pendiente','interno',false),('procesando','interno',true),('enviado','perez_galdos',true),
        ('completado','interno',true),('pendiente','express',true),('pendiente','flash',true),
        ('procesando','express',true),('cancelado','express',false),('devolucion','flash',false),('cancelado','interno',false)
    ) AS s(estado,tipo,restore) LOOP
        TRUNCATE pg_temp.pedidos,pg_temp.pedido_detalles,pg_temp.libros,pg_temp.auditoria;
        INSERT INTO pg_temp.pedidos VALUES (1,scenario.estado,scenario.tipo);
        INSERT INTO pg_temp.libros(id,stock) VALUES (1,5),(2,7),(3,9);
        INSERT INTO pg_temp.pedido_detalles VALUES (1,1,1,1),(2,1,2,2),(3,1,2,3),(4,1,NULL,1);
        PERFORM pg_temp.cancel_order_out_of_stock(1,ARRAY[1,1]);
        expected := CASE WHEN scenario.restore THEN 12 ELSE 7 END;
        IF (SELECT stock FROM pg_temp.libros WHERE id=1) <> 0 OR
           (SELECT stock FROM pg_temp.libros WHERE id=2) <> expected OR
           (SELECT stock FROM pg_temp.libros WHERE id=3) <> 9 OR
           (SELECT estado FROM pg_temp.pedidos WHERE id=1) <> 'sin_stock' THEN
           RAISE EXCEPTION 'Wrong stock for %/%', scenario.estado,scenario.tipo;
        END IF;
        PERFORM pg_temp.cancel_order_out_of_stock(1,ARRAY[1]);
        IF (SELECT stock FROM pg_temp.libros WHERE id=2) <> expected OR (SELECT count(*) FROM pg_temp.auditoria) <> 1 THEN
           RAISE EXCEPTION 'Repeated request restored twice';
        END IF;
        cases := cases+1;
    END LOOP;

    UPDATE pg_temp.pedidos SET estado='procesando';
    UPDATE pg_temp.libros SET stock=5 WHERE id=1;
    TRUNCATE pg_temp.auditoria;
    BEGIN
        PERFORM pg_temp.cancel_order_out_of_stock(1,ARRAY[3]);
        RAISE EXCEPTION 'Unexpected success for unrelated book';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'Unexpected success for unrelated book' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM pg_temp.cancel_order_out_of_stock(1,ARRAY[]::integer[]);
        RAISE EXCEPTION 'Unexpected success for empty selection';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'Unexpected success for empty selection' THEN RAISE; END IF;
    END;
    PERFORM set_config('app.stock_test_admin','false',true);
    BEGIN
        PERFORM pg_temp.cancel_order_out_of_stock(1,ARRAY[1]);
        RAISE EXCEPTION 'Unexpected success without admin';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('app.stock_test_admin','true',true);
    -- Force a failure after the stock writes; every write must roll back together.
    ALTER TABLE pg_temp.auditoria ADD CONSTRAINT test_failure CHECK (accion <> 'UPDATE');
    SELECT stock INTO expected FROM pg_temp.libros WHERE id=2;
    BEGIN
        PERFORM pg_temp.cancel_order_out_of_stock(1,ARRAY[1]);
        RAISE EXCEPTION 'Unexpected success for failed audit';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF (SELECT stock FROM pg_temp.libros WHERE id=1) <> 5 OR
       (SELECT stock FROM pg_temp.libros WHERE id=2) <> expected OR
       (SELECT estado FROM pg_temp.pedidos WHERE id=1) <> 'procesando' THEN
       RAISE EXCEPTION 'Atomic rollback failed';
    END IF;
    IF has_function_privilege('anon','public.cancel_order_out_of_stock(bigint,integer[])','EXECUTE') THEN
        RAISE EXCEPTION 'Anonymous access was not revoked';
    END IF;
    -- Old clients and simultaneous requests cannot run force-stock helpers on closed orders.
    UPDATE pg_temp.pedidos SET estado='sin_stock';
    IF pg_temp.restore_stock_force(1) OR pg_temp.deduct_stock_force(1) THEN
        RAISE EXCEPTION 'Legacy force-stock helpers accepted an out-of-stock cancellation';
    END IF;
    IF (SELECT stock FROM pg_temp.libros WHERE id=1) <> 5 OR (SELECT stock FROM pg_temp.libros WHERE id=2) <> expected THEN
        RAISE EXCEPTION 'Legacy force-stock helpers changed inventory';
    END IF;
    CREATE TRIGGER test_terminal_state BEFORE UPDATE OF estado ON pg_temp.pedidos
    FOR EACH ROW EXECUTE FUNCTION public.guard_out_of_stock_order();
    BEGIN
        UPDATE pg_temp.pedidos SET estado='cancelado' WHERE id=1;
        RAISE EXCEPTION 'Unexpected success reopening out-of-stock order';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'Unexpected success reopening out-of-stock order' THEN RAISE; END IF;
    END;
    RAISE NOTICE '% stock scenarios, idempotency, authorization, validation and atomic rollback passed', cases;
END;
$checks$;
SELECT 'OK: 12 scenarios, idempotency, validation, authorization and rollback; temporary fixtures only' AS result;
ROLLBACK;
