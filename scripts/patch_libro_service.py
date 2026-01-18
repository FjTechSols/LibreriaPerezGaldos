import os

file_path = r'c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\src\services\libroService.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Exact target from previous view_file (using escaped characters to be safe)
target = """         if (filters.isbn) {
             // Remove dashes/spaces for flexible match if needed, but usually strict eq for specific field
             const clean = filters.isbn.replace(/[-\s]/g, '');
             query = query.ilike('isbn', `%${clean}%`); // partial match for convenience
         }"""

# New content to insert
replacement = target + """

         if (filters.legacy_id) {
             query = query.ilike('legacy_id', `%${filters.legacy_id}%`);
         }"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patch applied successfully.")
else:
    # Try with CRLF just in case
    target_crlf = target.replace('\n', '\r\n')
    if target_crlf in content:
        new_content = content.replace(target_crlf, replacement.replace('\n', '\r\n'))
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Patch applied successfully (CRLFs).")
    else:
        print("Target not found.")
