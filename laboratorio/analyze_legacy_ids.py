import json
import re

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Pattern analysis
numeric_8_digit = 0
other_formats = []
format_counts = {}

for book in books:
    legacy_id = book.get("legacy_id", "")
    
    if not legacy_id:
        format_counts["empty"] = format_counts.get("empty", 0) + 1
        continue
    
    # Check if exactly 8 digits
    if re.match(r'^\d{8}$', legacy_id):
        numeric_8_digit += 1
    else:
        # Categorize other formats
        if re.match(r'^[A-Z]\d{7}$', legacy_id):  # Letter + 7 digits (e.g., N0001026)
            format_counts["letter_7digits"] = format_counts.get("letter_7digits", 0) + 1
        elif re.match(r'^[A-Z]{2}\d{6}$', legacy_id):  # 2 letters + 6 digits
            format_counts["2letters_6digits"] = format_counts.get("2letters_6digits", 0) + 1
        else:
            format_counts["other"] = format_counts.get("other", 0) + 1
            if len(other_formats) < 20:  # Sample
                other_formats.append(legacy_id)

print(f"\n--- LEGACY_ID ANALYSIS ---")
print(f"Total records: {len(books)}")
print(f"\n8-digit numeric IDs (e.g., '02292923'): {numeric_8_digit}")
print(f"\nOther formats:")
for fmt, count in sorted(format_counts.items(), key=lambda x: -x[1]):
    print(f"  {fmt}: {count}")

if other_formats:
    print(f"\nSample of 'other' formats:")
    for sample in other_formats[:10]:
        print(f"  '{sample}'")
