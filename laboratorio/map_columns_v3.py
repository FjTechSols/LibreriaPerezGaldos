
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
line_num = 412824

with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i + 1 == line_num:
            print("--- LINE TAIL ---")
            # Print everything from ISBN onwards
            tail = line[625:]
            print(tail)
            print("--- RULER ---")
            ruler = ""
            for x in range(0, len(tail), 10):
                ruler += f"{x:<10}"
            print(ruler)
            break
