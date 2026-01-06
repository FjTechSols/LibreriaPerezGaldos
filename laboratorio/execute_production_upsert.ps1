# ============================================
# PRODUCTION UPSERT VIA PSQL
# ============================================

# PASO 1: Obtener credenciales de Supabase
# -----------------------------------------
# Ve a: https://supabase.com/dashboard
# 
# 1. Project Reference ID:
#    Dashboard → Settings → General → Reference ID
#    Ejemplo: abcdefghijklmnop
#
# 2. Database Password:
#    Dashboard → Settings → Database → Database Password
#    Si no la recuerdas, puedes resetearla ahí

# PASO 2: Reemplaza estos valores
# -----------------------------------------
$PROJECT_REF = "TU_PROJECT_REFERENCE_ID_AQUI"  # Ejemplo: abcdefghijklmnop
$DB_PASSWORD = "TU_DATABASE_PASSWORD_AQUI"     # Tu contraseña de BD

# PASO 3: Ejecutar UPSERT
# -----------------------------------------
# Este comando conectará a Supabase producción y ejecutará el SQL

# Opción A: Usando psql desde Docker (Recomendado)
docker run --rm -v ${PWD}/laboratorio:/sql postgres:15 `
  psql "postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres" `
  -f /sql/production_upsert.sql

# Opción B: Si tienes psql instalado localmente
# psql "postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres" `
#   -f laboratorio\production_upsert.sql

# PASO 4: Verificación
# -----------------------------------------
# Después de ejecutar, verifica en Supabase SQL Editor:

# SELECT COUNT(*) as total_libros FROM public.libros;
# -- Esperado: 412,697

# SELECT COUNT(CASE WHEN updated_at > created_at THEN 1 END) as actualizados 
# FROM public.libros;
# -- Esperado: ~412,697
