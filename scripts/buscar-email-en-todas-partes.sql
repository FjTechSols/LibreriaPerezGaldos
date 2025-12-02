-- ============================================
-- BUSCAR EMAIL EN TODAS LAS TABLAS
-- ============================================

-- 1. Buscar en tabla usuarios
SELECT 'usuarios' as tabla, id, email, username, rol_id
FROM usuarios
WHERE email ILIKE '%fjtechsols%';

-- 2. Buscar en auth.users (puede dar error de permisos)
SELECT 'auth.users' as tabla, id, email, created_at
FROM auth.users
WHERE email ILIKE '%fjtechsols%';

-- 3. Buscar en tabla clientes
SELECT 'clientes' as tabla, id, email, nombre
FROM clientes
WHERE email ILIKE '%fjtechsols%';

-- 4. Buscar en tabla facturas (por si hay email de cliente)
SELECT 'facturas' as tabla, id, cliente_email
FROM facturas
WHERE cliente_email ILIKE '%fjtechsols%';

-- 5. Buscar en tabla pedidos
SELECT 'pedidos' as tabla, id, usuario_id
FROM pedidos p
JOIN usuarios u ON u.id = p.usuario_id
WHERE u.email ILIKE '%fjtechsols%';

-- ============================================
-- LIMPIAR DE TODAS PARTES
-- ============================================

-- Borrar de clientes
DELETE FROM clientes WHERE email ILIKE '%fjtechsols%';

-- Borrar de usuarios
DELETE FROM usuarios WHERE email ILIKE '%fjtechsols%';

-- Verificar que se borraron
SELECT 'usuarios' as tabla, COUNT(*) as cantidad
FROM usuarios
WHERE email ILIKE '%fjtechsols%'
UNION ALL
SELECT 'clientes' as tabla, COUNT(*) as cantidad
FROM clientes
WHERE email ILIKE '%fjtechsols%';

-- Debe mostrar 0 en ambos
