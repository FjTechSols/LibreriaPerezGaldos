
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
line_num = 412824

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i + 1 == line_num:
            print("--- LINE DATA ---")
            print(line.rstrip())
            print("--- RULER ---")
            # Print a ruler 01234567890123456789...
            ruler = ""
            for x in range(0, len(line), 10):
                ruler += f"{x:<10}"
            print(ruler)
            
            # Print field markers based on known values
            print("\n--- POSSIBLE MATCHES ---")
            print(f"ISBN Index: {line.find('84-7088-222-8')}")
            print(f"Title Index: {line.find('Política para corregidores')}")
            print(f"Author Index: {line.find('Castillo de Bobadilla, Jerónimo')}")
            print(f"Publisher Index: {line.find('Instituto de Estudios de Administración Local')}")
            break
