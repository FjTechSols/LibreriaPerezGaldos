-- =====================================================================================
-- E3 · Reservas del cliente (corrige C1)
--
-- La política "Users can update own pending reservations" no tiene WITH CHECK, así que
-- PostgreSQL usa su USING (reserva propia Y estado = 'pendiente') también para la fila
-- nueva: el cliente no puede pasarla a 'cancelada'. Antes de C1 funcionaba solo porque
-- "Admins can update any reservation" dejaba actualizar a cualquier rol 2 (todos los clientes).
--
-- Reglas (como la web, reservationService):
--   · el cliente crea reservas propias en estado 'pendiente';
--   · el cliente solo puede CANCELAR sus reservas pendientes (no confirmarlas, ni cambiar
--     libro, fechas o quién la confirmó);
--   · el personal sigue gestionándolas ("Personal gestiona reservas", C1).
-- =====================================================================================
BEGIN;

DROP POLICY IF EXISTS "Users can update own pending reservations" ON public.reservas;
CREATE POLICY "Cliente cancela su reserva pendiente" ON public.reservas FOR UPDATE TO authenticated
  USING (estado = 'pendiente' AND usuario_id = public.get_current_user_id())
  WITH CHECK (estado = 'cancelada' AND usuario_id = public.get_current_user_id());

-- Solo el personal crea reservas en un estado distinto de 'pendiente'.
DROP POLICY IF EXISTS "Reservas nuevas pendientes salvo personal" ON public.reservas;
CREATE POLICY "Reservas nuevas pendientes salvo personal" ON public.reservas AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (estado = 'pendiente' OR public.is_editor());

-- Al cancelar, el cliente no puede tocar nada más que el estado y la fecha de actualización.
CREATE OR REPLACE FUNCTION public.proteger_reserva_cliente() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.es_contexto_servidor() OR public.is_editor() THEN RETURN NEW; END IF;
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id OR NEW.libro_id IS DISTINCT FROM OLD.libro_id
     OR NEW.fecha_expiracion IS DISTINCT FROM OLD.fecha_expiracion OR NEW.confirmado_por IS DISTINCT FROM OLD.confirmado_por
     OR NEW.rechazado_por IS DISTINCT FROM OLD.rechazado_por OR NEW.fecha_confirmacion IS DISTINCT FROM OLD.fecha_confirmacion
     OR NEW.fecha_rechazo IS DISTINCT FROM OLD.fecha_rechazo OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Solo puedes cancelar la reserva.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.proteger_reserva_cliente() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_proteger_reserva_cliente ON public.reservas;
CREATE TRIGGER trg_proteger_reserva_cliente BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.proteger_reserva_cliente();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Marcha atrás:
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_proteger_reserva_cliente ON public.reservas;
-- DROP FUNCTION IF EXISTS public.proteger_reserva_cliente();
-- DROP POLICY IF EXISTS "Reservas nuevas pendientes salvo personal" ON public.reservas;
-- DROP POLICY IF EXISTS "Cliente cancela su reserva pendiente" ON public.reservas;
-- CREATE POLICY "Users can update own pending reservations" ON public.reservas AS PERMISSIVE FOR UPDATE TO public
--   USING ((EXISTS (SELECT 1 FROM usuarios WHERE usuarios.auth_user_id = auth.uid() AND usuarios.id = reservas.usuario_id)) AND estado = 'pendiente'::text);
-- COMMIT;
