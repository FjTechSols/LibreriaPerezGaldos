
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
line_num = 412824

def find_all(text, sub):
    start = 0
    while True:
        idx = text.find(sub, start)
        if idx == -1: return
        yield idx
        start = idx + 1

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i + 1 == line_num:
            print(f"--- LINE {line_num} SCAN ---")
            
            # Find Dates
            print("Dates (XX-XX-XXXX):")
            import re
            for m in re.finditer(r'\d{2}-\d{2}-\d{4}', line):
                print(f"  Found '{m.group()}' at {m.start()}")

            # Find Location
            print("\nLocation ('almacen'):")
            for idx in find_all(line, "almacen"):
                print(f"  Found at {idx}")

            # Find Stock
            # Looking for the '1' near 'almacen'
            print("\nContext around 'almacen' (±20 chars):")
            loc_idx = line.find("almacen")
            if loc_idx != -1:
                start = max(0, loc_idx - 20)
                end = min(len(line), loc_idx + 20)
                print(f"  '{line[start:end]}'")
                
            # Find Price
            # Looking for numeric values like '75.0' or '12.00'
            print("\nPrices (digits.digits):")
            for m in re.finditer(r'\d+\.\d+', line):
                print(f"  Found '{m.group()}' at {m.start()}")
                
            # Find Description keywords
            print("\nDescription check ('simil piel'):")
            print(f"  Found at {line.find('simil piel')}")
            
            break
