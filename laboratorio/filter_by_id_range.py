import json

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"
output_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_range_filtered.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Filter for 8-digit numeric IDs in range
filtered = []
min_id = 0
max_id = 2292927

for book in books:
    legacy_id = book.get("legacy_id", "")
    
    # Check if it's 8 digits and numeric
    if legacy_id and legacy_id.isdigit() and len(legacy_id) == 8:
        id_num = int(legacy_id)
        if min_id <= id_num <= max_id:
            filtered.append(book)

print(f"\n--- FILTER RESULTS ---")
print(f"Total records in source: {len(books)}")
print(f"Records with legacy_id in range [00000000 - 02292927]: {len(filtered)}")

# Save filtered results
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(filtered, f, indent=2, ensure_ascii=False)

print(f"\nFiltered records saved to: {output_path}")

# Show some stats
if filtered:
    print(f"\nFirst ID: {filtered[0]['legacy_id']}")
    print(f"Last ID: {filtered[-1]['legacy_id']}")
