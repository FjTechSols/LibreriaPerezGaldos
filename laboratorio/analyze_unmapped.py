import json
import re
from collections import Counter

input_path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_structured.json"

print("Loading JSON...")
with open(input_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Find records without ubicacion_id
unmapped = []
pattern_counts = Counter()

for book in books:
    if not book.get("ubicacion_id"):
        legacy_id = book.get("legacy_id", "")
        titulo = book.get("titulo") or ""
        unmapped.append({
            "legacy_id": legacy_id,
            "titulo": titulo[:40] if titulo else ""
        })
        
        # Categorize pattern
        if not legacy_id:
            pattern_counts["empty"] += 1
        elif re.match(r'^[A-Z]{2}\d+$', legacy_id, re.IGNORECASE):
            pattern_counts["2letters_digits"] += 1
        elif re.match(r'^[A-Z]\d+$', legacy_id, re.IGNORECASE):
            pattern_counts["1letter_digits"] += 1
        elif re.match(r'^\d+[A-Z]$', legacy_id, re.IGNORECASE):
            pattern_counts["digits_1letter"] += 1
        elif re.match(r'^\d+$', legacy_id):
            pattern_counts["only_digits"] += 1
        else:
            pattern_counts["other/corrupted"] += 1

print(f"\n--- UNMAPPED RECORDS ANALYSIS ---")
print(f"Total unmapped: {len(unmapped)}")

print(f"\nPattern breakdown:")
for pattern, count in pattern_counts.most_common():
    print(f"  {pattern}: {count}")

# Show samples of each major pattern
print(f"\n--- SAMPLES BY PATTERN ---")

# 2 letters + digits
samples_2l = [x for x in unmapped if re.match(r'^[A-Z]{2}\d+$', x['legacy_id'], re.IGNORECASE)]
if samples_2l:
    print(f"\n2 Letters + Digits (e.g., AB123456):")
    for item in samples_2l[:10]:
        print(f"  {item['legacy_id']} - {item['titulo']}")

# 1 letter + digits (not G, H, R)
samples_1l = [x for x in unmapped if re.match(r'^[A-Z]\d+$', x['legacy_id'], re.IGNORECASE)]
if samples_1l:
    print(f"\n1 Letter + Digits (e.g., N123456):")
    for item in samples_1l[:10]:
        print(f"  {item['legacy_id']} - {item['titulo']}")

# Other/corrupted
samples_other = [x for x in unmapped if not re.match(r'^[A-Z]{0,2}\d*[A-Z]?$', x['legacy_id'], re.IGNORECASE)]
if samples_other:
    print(f"\nOther/Corrupted:")
    for item in samples_other[:10]:
        print(f"  {item['legacy_id']} - {item['titulo']}")
