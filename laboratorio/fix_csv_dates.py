import csv
from datetime import datetime

input_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import.csv"
output_csv = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_import_fixed.csv"

def convert_date(date_str):
    """Convert DD-MM-YYYY to YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return ''
    try:
        # Parse DD-MM-YYYY
        dt = datetime.strptime(date_str, '%d-%m-%Y')
        # Return YYYY-MM-DD
        return dt.strftime('%Y-%m-%d')
    except:
        return ''

print("Fixing date formats...")
with open(input_csv, 'r', encoding='utf-8') as fin:
    with open(output_csv, 'w', encoding='utf-8', newline='') as fout:
        reader = csv.DictReader(fin)
        writer = csv.DictWriter(fout, fieldnames=reader.fieldnames)
        writer.writeheader()
        
        count = 0
        for row in reader:
            # Convert fecha_ingreso
            if 'fecha_ingreso' in row:
                row['fecha_ingreso'] = convert_date(row['fecha_ingreso'])
            writer.writerow(row)
            count += 1

print(f"✅ Fixed {count} records")
print(f"Output: {output_csv}")
