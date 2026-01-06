import json
from collections import Counter

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Count legacy_id occurrences
legacy_id_counts = Counter()
for book in books:
    legacy_id = book.get("legacy_id", "")
    if legacy_id:
        legacy_id_counts[legacy_id] += 1

# Find duplicates
duplicates = {lid: count for lid, count in legacy_id_counts.items() if count > 1}

print(f"\n--- DUPLICATE LEGACY_ID ANALYSIS ---")
print(f"Total unique legacy_ids: {len(legacy_id_counts)}")
print(f"Total records: {len(books)}")
print(f"Duplicate legacy_ids found: {len(duplicates)}")

if duplicates:
    # Sort by count (most duplicated first)
    sorted_dupes = sorted(duplicates.items(), key=lambda x: -x[1])
    
    print(f"\nTop 20 most duplicated legacy_ids:")
    for legacy_id, count in sorted_dupes[:20]:
        print(f"  '{legacy_id}': {count} occurrences")
    
    # Show examples of books with the most duplicated ID
    if sorted_dupes:
        most_duped_id = sorted_dupes[0][0]
        print(f"\nExample books with legacy_id '{most_duped_id}':")
        examples = [b for b in books if b.get("legacy_id") == most_duped_id]
        for book in examples[:5]:
            titulo = book.get("titulo") or ""
            print(f"  - {titulo[:60]}")
    
    # Calculate total affected records
    total_affected = sum(duplicates.values())
    print(f"\nTotal records with duplicate legacy_ids: {total_affected}")
else:
    print("\n✅ No duplicates found! All legacy_ids are unique.")
