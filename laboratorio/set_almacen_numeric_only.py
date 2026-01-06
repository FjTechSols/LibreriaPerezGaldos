import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

updated_count = 0
skipped_count = 0

print(f"Processing {len(books)} records...")
for book in books:
    legacy_id = book.get("legacy_id", "")
    
    # Check if legacy_id is purely numeric (8 digits)
    if legacy_id and legacy_id.isdigit() and len(legacy_id) == 8:
        book["ubicacion_id"] = 1  # Almacén
        updated_count += 1
    else:
        skipped_count += 1

print(f"\n--- RESULTS ---")
print(f"Records updated (numeric legacy_id): {updated_count}")
print(f"Records skipped (non-numeric/other): {skipped_count}")

print("\nSaving updated JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print(f"✅ Done! File updated: {output_path}")
