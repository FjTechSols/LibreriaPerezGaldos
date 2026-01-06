-- Trigger to sync auth.users with public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (auth_user_id, email, username, rol_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE((SELECT id FROM public.roles WHERE nombre = 'cliente' LIMIT 1), 1) -- Assumes rol_id 1 or 'cliente' exists
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  -- Assign default role in usuarios_roles if needed
  INSERT INTO public.usuarios_roles (usuario_id, rol_id)
  VALUES (
    (SELECT id FROM public.usuarios WHERE auth_user_id = new.id),
    COALESCE((SELECT id FROM public.roles WHERE nombre = 'cliente' LIMIT 1), 1)
  )
  ON CONFLICT DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication errors during re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
