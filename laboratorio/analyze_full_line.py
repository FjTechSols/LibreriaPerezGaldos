
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
line_num = 412824

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i + 1 == line_num:
            print(f"--- LINE {line_num} ANALYSIS ---")
            print(f"Total Length: {len(line)}")
            # Split by tab or multiple spaces to see structure
            parts = line.split()
            print(f"Split parts count: {len(parts)}")
            print("--- RAW CONTENT DUMP ---")
            print(line)
            print("--- TAIL DUMP (Post ISBN) ---")
            print(line[625:])
            break
