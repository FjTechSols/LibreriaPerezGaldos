-- Triggers de public y auth.users
-- Copia del estado de producción (proyecto weaihscsaqxadxjgsfbt) generada el 2026-10-20, antes de la corrección de permisos.
-- Generado desde pg_policies / pg_proc / pg_trigger. Solo para restaurar; revisar antes de ejecutar.

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER update_autores_updated_at BEFORE UPDATE ON public.autores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at_trigger BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION update_clientes_updated_at();
CREATE TRIGGER update_envios_updated_at BEFORE UPDATE ON public.envios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_libros_updated_at BEFORE UPDATE ON public.libros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER guard_out_of_stock_order BEFORE UPDATE OF estado ON public.pedidos FOR EACH ROW EXECUTE FUNCTION guard_out_of_stock_order();
CREATE TRIGGER "telegram-order-alert" AFTER INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://weaihscsaqxadxjgsfbt.supabase.co/functions/v1/notify-admin-telegram', 'POST', '{"Authorization":"Bearer"}', '{}', '5000');
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_reservation_created AFTER INSERT ON public.reservas FOR EACH ROW EXECUTE FUNCTION handle_new_reservation();
CREATE TRIGGER trigger_update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_reviews_updated_at();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER settings_updated_at_trigger BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_settings_updated_at();
CREATE TRIGGER update_usuarios_roles_updated_at BEFORE UPDATE ON public.usuarios_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
