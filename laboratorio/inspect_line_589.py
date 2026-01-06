
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
line_num = 589

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i + 1 == line_num:
            print(f"--- LINE {line_num} DUMP ---")
            print(line)
            print("--- RULER ---")
            ruler = ""
            for x in range(0, len(line), 10):
                ruler += f"{x:<10}"
            print(ruler)
            
            print("\n--- HEX DUMP (First 100 chars) ---")
            # Check for tabs (0x09)
            print([hex(ord(c)) for c in line[:100]])
            
            # Find keywords
            print(f"\nMadrid Index: {line.find('Madrid')}")
            print(f"ISBN Index: {line.find('84-')}") # Assuming ISBN starts with 84- ? Or maybe this book has no ISBN?
            break
