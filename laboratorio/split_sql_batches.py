"""
Split production_upsert.sql into manageable batches
Each batch will have ~10,000 UPSERT statements
"""
import os

input_file = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\laboratorio\production_upsert.sql"
output_dir = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\laboratorio\batches"
batch_size = 10000  # Records per batch

# Create output directory
os.makedirs(output_dir, exist_ok=True)

print("Reading SQL file...")
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where the actual INSERT statements start (after BEGIN)
start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == 'BEGIN;':
        start_idx = i + 1
        break

# Extract header (everything before BEGIN)
header = ''.join(lines[:start_idx])

# Count total INSERT statements
insert_count = 0
for line in lines[start_idx:]:
    if line.strip().startswith('INSERT INTO'):
        insert_count += 1

print(f"Total INSERT statements: {insert_count}")
print(f"Batch size: {batch_size}")
print(f"Total batches: {(insert_count + batch_size - 1) // batch_size}")

# Split into batches
batch_num = 1
current_batch = []
statement_count = 0
total_processed = 0

for line in lines[start_idx:]:
    if line.strip() == 'COMMIT;':
        continue  # Skip original COMMIT
    
    current_batch.append(line)
    
    # Check if this line completes an INSERT statement (ends with semicolon)
    if line.strip().endswith(';') and 'INSERT INTO' in ''.join(current_batch[-20:]):
        statement_count += 1
        total_processed += 1
        
        # Write batch when we reach batch_size
        if statement_count >= batch_size:
            output_file = os.path.join(output_dir, f"batch_{batch_num:03d}.sql")
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(header)
                f.write('BEGIN;\n\n')
                f.writelines(current_batch)
                f.write('\nCOMMIT;\n')
            
            print(f"  Created batch {batch_num}: {statement_count} statements")
            batch_num += 1
            current_batch = []
            statement_count = 0

# Write remaining statements as final batch
if current_batch:
    output_file = os.path.join(output_dir, f"batch_{batch_num:03d}.sql")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(header)
        f.write('BEGIN;\n\n')
        f.writelines(current_batch)
        f.write('\nCOMMIT;\n')
    
    print(f"  Created batch {batch_num}: {statement_count} statements")

print(f"\n✅ Created {batch_num} batch files in: {output_dir}")
print(f"Total statements processed: {total_processed}")
print(f"\nNext steps:")
print(f"1. Execute each batch file sequentially in Supabase SQL Editor")
print(f"2. Start with batch_001.sql, then batch_002.sql, etc.")
print(f"3. Wait for each batch to complete before executing the next")
