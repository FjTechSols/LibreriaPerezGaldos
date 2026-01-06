import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

updated_count = 0

print(f"Processing {len(books)} records...")
for book in books:
    # If no ubicacion_id assigned, set to General (7)
    if not book.get("ubicacion_id"):
        book["ubicacion_id"] = 7  # General
        updated_count += 1

print(f"\n--- RESULTS ---")
print(f"Records updated to General (ubicacion_id = 7): {updated_count}")

print("\nSaving updated JSON...")
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, indent=2, ensure_ascii=False)

print(f"✅ Done! File updated: {output_path}")
print(f"\n🎉 ALL {len(books)} records now have ubicacion_id assigned!")
