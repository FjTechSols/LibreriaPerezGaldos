import psycopg2
import sys

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

# Mapping of ubicaciones to their suffixes and expected ranges
UBICACION_CONFIG = {
    'Almacén': {'suffix': '', 'max_filter': 3000000, 'expected_range': '0229xxxx'},
    'Galeón': {'suffix': 'G', 'max_filter': 50000, 'expected_range': '< 50000'},
    'Hortaleza': {'suffix': 'H', 'max_filter': 50000, 'expected_range': '< 50000'},
    'Reina': {'suffix': 'R', 'max_filter': None, 'expected_range': 'any'},
    'General': {'suffix': 'AG', 'max_filter': None, 'expected_range': 'any'}
}

print("=== TEST LEGACY_ID GENERATION (WITH FILTERS) ===\n")
print("This script simulates the NEW logic with outlier filtering.\n")

try:
    password = input(f"Enter DB Password for {USER}: ")
    
    conn = psycopg2.connect(
        host=HOST,
        user=USER,
        password=password,
        port="5432",
        database="postgres"
    )
    
    cur = conn.cursor()
    
    for ubicacion, config in UBICACION_CONFIG.items():
        suffix = config['suffix']
        max_filter = config['max_filter']
        expected_range = config['expected_range']
        
        print(f"\n{'='*70}")
        print(f"UBICACION: {ubicacion}")
        print(f"  Suffix: '{suffix}' | Filter: < {max_filter if max_filter else 'None'} | Range: {expected_range}")
        print(f"{'='*70}")
        
        # Build query based on suffix
        if suffix == '':
            # Numeric-only codes (Almacén)
            if max_filter:
                cur.execute("""
                    SELECT legacy_id, titulo
                    FROM public.libros 
                    WHERE ubicacion = %s 
                      AND legacy_id ~ '^[0-9]+$'
                      AND CAST(legacy_id AS INTEGER) < %s
                    ORDER BY CAST(legacy_id AS INTEGER) DESC 
                    LIMIT 5
                """, (ubicacion, max_filter))
            else:
                cur.execute("""
                    SELECT legacy_id, titulo
                    FROM public.libros 
                    WHERE ubicacion = %s 
                      AND legacy_id ~ '^[0-9]+$'
                    ORDER BY CAST(legacy_id AS INTEGER) DESC 
                    LIMIT 5
                """, (ubicacion,))
        else:
            # Codes with suffix
            pattern = f'%{suffix}'
            cur.execute("""
                SELECT legacy_id, titulo
                FROM public.libros 
                WHERE ubicacion = %s 
                  AND legacy_id LIKE %s
                ORDER BY legacy_id DESC 
                LIMIT 5
            """, (ubicacion, pattern))
        
        results = cur.fetchall()
        
        if results:
            print(f"  Top 5 codes (after filtering):")
            for row in results:
                titulo = row[1][:45] if row[1] else 'N/A'
                print(f"    - {row[0]} | {titulo}")
            
            current_max = results[0][0]
            
            # Extract numeric part
            if suffix == '':
                numeric_part = int(current_max)
            else:
                numeric_part = int(current_max.replace(suffix, ''))
            
            next_num = numeric_part + 1
            next_code = f"{next_num:08d}{suffix}"
            
            print(f"\n  ✅ Current MAX: {current_max}")
            print(f"  ✅ NEXT code: {next_code}")
        else:
            print(f"  ⚠️  No books found")
            print(f"  ✅ NEXT code: 00000001{suffix}")
    
    conn.close()
    print("\n" + "="*70)
    print("✅ Test complete! No data was modified.")
    print("="*70)

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
