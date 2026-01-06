"""
Debug Batch 3 failure
Analyze records 5000-7500 for string length issues
"""
import subprocess
import json

LAB_CONTAINER = "supabase-db"

print("Fetching Batch 3 (Records 5000-7500)...")
cmd = [
    "docker", "exec", "-i", LAB_CONTAINER,
    "psql", "-U", "postgres", "-t", "-A", "-F,",
    "-c", """
    SELECT json_agg(row_to_json(t)) 
    FROM (
        SELECT 
            id, legacy_id, isbn, titulo, autor, descripcion, notas, ubicacion, imagen_url
        FROM public.libros
        ORDER BY id
        OFFSET 5000 LIMIT 2500
    ) t;
    """
]
result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
data = json.loads(result.stdout.strip())

print(f"Loaded {len(data)} records.")

# Thresholds
LIMITS = {
    'isbn': 20,
    'titulo': 255,  # Validar límite real en prod
    'autor': 255,   
    'ubicacion': 100,
    'imagen_url': 255
}

print("\nScanning for violations...")
found_issues = False

for i, record in enumerate(data):
    for field, limit in LIMITS.items():
        value = record.get(field)
        if value and len(str(value)) > limit:
            print(f"🚨 Record Index {i} (LegacyID: {record.get('legacy_id')}) - Field '{field}' length {len(str(value))} > {limit}")
            print(f"   Value: {value[:50]}...")
            found_issues = True

if not found_issues:
    print("✅ No obvious length violations found in standard fields.")
    print("Check if 'descripcion' or 'notas' are TEXT or VARCHAR in production.")
