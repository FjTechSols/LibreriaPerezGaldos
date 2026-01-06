"""
Production UPSERT Generator
Exports data from local lab and generates SQL UPSERT statements for production
"""
import subprocess
import json

# Configuration
LAB_CONTAINER = "supabase-db"
OUTPUT_SQL = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\laboratorio\production_upsert.sql"
BATCH_SIZE = 1000  # Insert in batches to avoid huge SQL files

print("Exporting data from local lab...")

# Export from lab as JSON for easier processing
cmd = [
    "docker", "exec", "-i", LAB_CONTAINER,
    "psql", "-U", "postgres", "-t", "-A", "-F,",
    "-c", """
    SELECT json_agg(row_to_json(t)) 
    FROM (
        SELECT 
            legacy_id, isbn, titulo, anio, paginas, descripcion, notas,
            categoria_id, editorial_id, precio, ubicacion, 
            TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') as fecha_ingreso,
            activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original
        FROM public.libros
        ORDER BY id
    ) t;
    """
]

result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
data = json.loads(result.stdout.strip())

print(f"Loaded {len(data)} records from lab")

# Generate UPSERT SQL
print(f"Generating UPSERT SQL (batches of {BATCH_SIZE})...")

def escape_sql(value):
    """Escape SQL values"""
    if value is None or value == '':
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    # Escape single quotes
    return "'" + str(value).replace("'", "''") + "'"

with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
    f.write("-- ============================================\n")
    f.write("-- PRODUCTION UPSERT - AUTO-GENERATED\n")
    f.write(f"-- Total records: {len(data)}\n")
    f.write("-- ============================================\n\n")
    f.write("BEGIN;\n\n")
    
    for i, record in enumerate(data, 1):
        values = [
            escape_sql(record.get('legacy_id')),
            escape_sql(record.get('isbn')),
            escape_sql(record.get('titulo')),
            escape_sql(record.get('anio')),
            escape_sql(record.get('paginas')),
            escape_sql(record.get('descripcion')),
            escape_sql(record.get('notas')),
            escape_sql(record.get('categoria_id')),
            escape_sql(record.get('editorial_id')),
            escape_sql(record.get('precio')),
            escape_sql(record.get('ubicacion')),
            escape_sql(record.get('fecha_ingreso')),
            escape_sql(record.get('activo')),
            escape_sql(record.get('imagen_url')),
            escape_sql(record.get('stock')),
            escape_sql(record.get('autor')),
            escape_sql(record.get('destacado')),
            escape_sql(record.get('novedad')),
            escape_sql(record.get('oferta')),
            escape_sql(record.get('precio_original'))
        ]
        
        f.write(f"INSERT INTO public.libros (legacy_id, isbn, titulo, anio, paginas, descripcion, notas, categoria_id, editorial_id, precio, ubicacion, fecha_ingreso, activo, imagen_url, stock, autor, destacado, novedad, oferta, precio_original)\n")
        f.write(f"VALUES ({', '.join(values)})\n")
        f.write(f"ON CONFLICT (legacy_id) DO UPDATE SET\n")
        f.write(f"  isbn = EXCLUDED.isbn, titulo = EXCLUDED.titulo, anio = EXCLUDED.anio,\n")
        f.write(f"  paginas = EXCLUDED.paginas, descripcion = EXCLUDED.descripcion, notas = EXCLUDED.notas,\n")
        f.write(f"  categoria_id = EXCLUDED.categoria_id, editorial_id = EXCLUDED.editorial_id,\n")
        f.write(f"  precio = EXCLUDED.precio, ubicacion = EXCLUDED.ubicacion, fecha_ingreso = EXCLUDED.fecha_ingreso,\n")
        f.write(f"  activo = EXCLUDED.activo, imagen_url = EXCLUDED.imagen_url, stock = EXCLUDED.stock,\n")
        f.write(f"  autor = EXCLUDED.autor, destacado = EXCLUDED.destacado, novedad = EXCLUDED.novedad,\n")
        f.write(f"  oferta = EXCLUDED.oferta, precio_original = EXCLUDED.precio_original, updated_at = NOW();\n\n")
        
        if i % BATCH_SIZE == 0:
            print(f"  Generated {i}/{len(data)} records...")
    
    f.write("COMMIT;\n\n")
    f.write("-- Verification\n")
    f.write("SELECT COUNT(*) as total_libros, COUNT(CASE WHEN updated_at > created_at THEN 1 END) as actualizados FROM public.libros;\n")

print(f"\n✅ SQL file generated: {OUTPUT_SQL}")
print(f"File size: {len(data)} UPSERT statements")
print("\nNext steps:")
print("1. Review the generated SQL file")
print("2. Execute production_step1_cleanup.sql in production")
print("3. Execute production_upsert.sql in production (this may take several minutes)")
