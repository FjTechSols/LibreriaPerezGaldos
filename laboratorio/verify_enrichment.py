import json

import_json = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_ready.json"

print("Loading import JSON...")
with open(import_json, 'r', encoding='utf-8') as f:
    books = json.load(f)

total = len(books)
with_categoria = sum(1 for b in books if b.get('categoria_id') is not None)
with_editorial = sum(1 for b in books if b.get('editorial_id') is not None)
with_both = sum(1 for b in books if b.get('categoria_id') is not None and b.get('editorial_id') is not None)
with_either = sum(1 for b in books if b.get('categoria_id') is not None or b.get('editorial_id') is not None)

print(f"\n--- ENRICHMENT VERIFICATION ---")
print(f"Total records: {total}")
print(f"Records with categoria_id: {with_categoria} ({with_categoria/total*100:.1f}%)")
print(f"Records with editorial_id: {with_editorial} ({with_editorial/total*100:.1f}%)")
print(f"Records with both IDs: {with_both} ({with_both/total*100:.1f}%)")
print(f"Records with at least one ID: {with_either} ({with_either/total*100:.1f}%)")
print(f"Records with no IDs: {total - with_either} ({(total-with_either)/total*100:.1f}%)")

# Show a sample with IDs
print(f"\nSample records with IDs:")
samples = [b for b in books if b.get('categoria_id') or b.get('editorial_id')][:3]
for s in samples:
    print(f"  legacy_id: {s.get('legacy_id')}, categoria_id: {s.get('categoria_id')}, editorial_id: {s.get('editorial_id')}")
