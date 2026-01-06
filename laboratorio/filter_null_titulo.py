import csv

input_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_clean.csv"
output_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_final.csv"

print("Filtering records with NULL titulo...")
skipped = 0
written = 0

with open(input_csv, 'r', encoding='utf-8') as fin:
    with open(output_csv, 'w', encoding='utf-8', newline='') as fout:
        reader = csv.DictReader(fin)
        writer = csv.DictWriter(fout, fieldnames=reader.fieldnames)
        writer.writeheader()
        
        for row in reader:
            titulo = row.get('titulo', '').strip()
            
            # Skip records without titulo (required field)
            if not titulo:
                skipped += 1
                continue
            
            writer.writerow(row)
            written += 1

print(f"✅ Final CSV created")
print(f"Records written: {written}")
print(f"Records skipped (NULL titulo): {skipped}")
print(f"Output: {output_csv}")
