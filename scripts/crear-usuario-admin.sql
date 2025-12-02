-- Script para crear usuario administrador en la tabla usuarios
--
-- IMPORTANTE: Reemplaza 'TU_AUTH_USER_ID_AQUI' con el UUID del usuario
-- que creaste en Authentication -> Users
--
-- Para obtener el UUID:
-- 1. Ve a Supabase Dashboard -> Authentication -> Users
-- 2. Busca el usuario fjtechsols@gmail.com
-- 3. Haz clic en el usuario y copia el ID (es un UUID como: 12345678-1234-1234-1234-123456789abc)

-- Insertar usuario administrador en la tabla usuarios
INSERT INTO usuarios (auth_user_id, username, email, rol_id, activo)
VALUES (
  'TU_AUTH_USER_ID_AQUI',  -- Reemplazar con el UUID del usuario de Authentication
  'Admin',
  'fjtechsols@gmail.com',
  1,  -- rol_id = 1 para administrador
  true
)
ON CONFLICT (auth_user_id) DO UPDATE
SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  rol_id = EXCLUDED.rol_id,
  activo = EXCLUDED.activo;

-- Verificar que se creó correctamente
SELECT
  id,
  auth_user_id,
  username,
  email,
  rol_id,
  activo,
  created_at
FROM usuarios
WHERE email = 'fjtechsols@gmail.com';
