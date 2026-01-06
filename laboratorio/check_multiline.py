
path = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\scripts\files\libros_todos_clean.txt"
start_line = 412820
end_line = 412835

print(f"--- READING LINES {start_line} TO {end_line} ---")
with open(path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i >= start_line and i <= end_line:
            print(f"Line {i+1}: {line.rstrip()}")
        if i > end_line:
            break
