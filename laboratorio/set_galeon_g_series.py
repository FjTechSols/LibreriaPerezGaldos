import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

updated_count = 0

print(f"Processing {len(books)} records...")
for book in books:
    legacy_id = book.get("legacy_id", "")
    
    # Check if legacy_id matches pattern: digits + G
    if legacy_id and re.match(r'^\d+G$', legacy_id, re.IGNORECASE):
        book["ubicacion_id"] = 3  # Galeon
        updated_count += 1

print(f"\n--- RESULTS ---")
print(f"Records updated to Galeon (ubicacion_id = 3): {updated_count}")

print("\nSaving updated JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print(f"✅ Done! File updated: {output_path}")
