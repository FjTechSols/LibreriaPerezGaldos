-- Permite a los super_admin (rol_id = 1) escribir en auditoria desde el panel.
-- Hasta ahora la tabla solo tenía política de lectura, así que todas las inserciones
-- desde el navegador fallaban sin avisar y la auditoría estaba vacía.
-- No se usa is_admin(): hoy devuelve true también para los clientes (rol 2).
-- usuario_id solo puede ir vacío o ser el propio usuario, para que no se pueda falsificar el autor.

create policy "Super admins can insert auditoria"
  on public.auditoria
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.usuarios u
      where u.auth_user_id = auth.uid() and u.rol_id = 1
    )
    and (
      usuario_id is null
      or usuario_id = (select u.id from public.usuarios u where u.auth_user_id = auth.uid())
    )
  );

-- Rollback:
-- drop policy "Super admins can insert auditoria" on public.auditoria;
