/*
  # Fix obtener_permisos_usuario Function

  This script fixes the obtener_permisos_usuario function to:
  1. Accept 'usuario_id' parameter (consistent with other functions)
  2. Return 'permiso_codigo' field (what the frontend expects)

  ## Changes
  - Drop existing function
  - Recreate with correct parameter name and return field
*/

-- Drop existing function
DROP FUNCTION IF EXISTS obtener_permisos_usuario(UUID);

-- Create function with correct signature
CREATE OR REPLACE FUNCTION obtener_permisos_usuario(usuario_id UUID)
RETURNS TABLE(permiso_codigo TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.codigo
  FROM public.permisos p
  INNER JOIN public.rol_permisos rp ON p.id = rp.permiso_id
  INNER JOIN public.usuarios u ON u.rol_id = rp.rol_id
  WHERE u.id = usuario_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp;
