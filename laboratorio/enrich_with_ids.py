import json
import subprocess

import_json = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_ready.json"
output_json = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_ready.json"

print("Querying database for mappings...")
# Use psql with JSON output
cmd = [
    "docker", "exec", "-i", "supabase-db",
    "psql", "-U", "postgres", "-t", "-A", "-F,",
    "-c", "SELECT legacy_id, COALESCE(categoria_id::text, 'null'), COALESCE(editorial_id::text, 'null') FROM public.libros WHERE legacy_id IS NOT NULL;"
]

result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
lines = result.stdout.strip().split('\n')

print(f"Retrieved {len(lines)} mappings from database")

# Parse mappings
mappings = {}
for line in lines:
    if not line.strip():
        continue
    parts = line.split(',')
    if len(parts) >= 3:
        legacy_id = parts[0].strip()
        categoria_id = parts[1].strip() if parts[1].strip() != 'null' and parts[1].strip() != '' else None
        editorial_id = parts[2].strip() if parts[2].strip() != 'null' and parts[2].strip() != '' else None
        
        mappings[legacy_id] = {
            'categoria_id': int(categoria_id) if categoria_id else None,
            'editorial_id': int(editorial_id) if editorial_id else None
        }

print(f"Parsed {len(mappings)} valid mappings")

print("\nLoading import JSON...")
with open(import_json, 'r', encoding='utf-8') as f:
    books = json.load(f)

updated_count = 0
categoria_count = 0
editorial_count = 0

print(f"Processing {len(books)} records...")
for book in books:
    legacy_id = book.get('legacy_id')
    if legacy_id and legacy_id in mappings:
        mapping = mappings[legacy_id]
        
        if mapping['categoria_id'] is not None:
            book['categoria_id'] = mapping['categoria_id']
            categoria_count += 1
        
        if mapping['editorial_id'] is not None:
            book['editorial_id'] = mapping['editorial_id']
            editorial_count += 1
        
        if mapping['categoria_id'] is not None or mapping['editorial_id'] is not None:
            updated_count += 1

print(f"\n--- RESULTS ---")
print(f"Records updated with IDs from database: {updated_count}")
print(f"  categoria_id assigned: {categoria_count}")
print(f"  editorial_id assigned: {editorial_count}")

print("\nSaving updated JSON...")
with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print(f"✅ Done! File updated: {output_json}")
