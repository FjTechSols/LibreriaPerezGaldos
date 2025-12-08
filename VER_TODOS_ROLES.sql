-- Ver todos los roles con su jerarquía
SELECT 
  id,
  nombre,
  display_name,
  descripcion,
  nivel_jerarquia,
  activo,
  es_sistema
FROM roles
ORDER BY nivel_jerarquia DESC;
