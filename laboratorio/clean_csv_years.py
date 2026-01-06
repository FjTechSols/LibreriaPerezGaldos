import csv

input_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_fixed.csv"
output_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_clean.csv"

def clean_year(year_str):
    """Validate year is in reasonable range for smallint"""
    if not year_str or year_str.strip() == '':
        return ''
    try:
        year = int(year_str)
        # Validate reasonable year range
        if 1000 <= year <= 2100:
            return str(year)
        else:
            return ''  # Invalid year, set to NULL
    except:
        return ''

print("Cleaning year values...")
invalid_count = 0

with open(input_csv, 'r', encoding='utf-8') as fin:
    with open(output_csv, 'w', encoding='utf-8', newline='') as fout:
        reader = csv.DictReader(fin)
        writer = csv.DictWriter(fout, fieldnames=reader.fieldnames)
        writer.writeheader()
        
        for row in reader:
            original_year = row.get('anio', '')
            cleaned_year = clean_year(original_year)
            
            if original_year and original_year != cleaned_year:
                invalid_count += 1
            
            row['anio'] = cleaned_year
            writer.writerow(row)

print(f"✅ Cleaned CSV created")
print(f"Invalid years fixed: {invalid_count}")
print(f"Output: {output_csv}")
