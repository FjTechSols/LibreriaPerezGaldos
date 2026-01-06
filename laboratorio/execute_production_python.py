"""
Execute production UPSERT via Python psycopg2
More reliable than Docker psql for external connections
"""
import psycopg2
import sys

# Supabase Production credentials
# From user screenshot (Direct Connection)
HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"
DB_PASSWORD = "693310893471_693sTs"  # As provided previously

SQL_FILE = r"c:\Users\fjtec\Documents\Trabajos\LibreriaPerezGaldos\laboratorio\production_upsert.sql"

print("=" * 60)
print("PRODUCTION UPSERT EXECUTION")
print("=" * 60)
print(f"Host: {HOST}")
print(f"Database: postgres")
print(f"SQL File: {SQL_FILE}")
print("=" * 60)

try:
    print("\n[1/4] Connecting to Supabase production...")
    conn = psycopg2.connect(
        host=HOST,
        database="postgres",
        user=USER,
        password=DB_PASSWORD,
        port=5432,
        connect_timeout=30
    )
    print("✅ Connected successfully!")
    
    print("\n[2/4] Reading SQL file...")
    with open(SQL_FILE, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    file_size_mb = len(sql) / (1024 * 1024)
    print(f"✅ SQL file loaded ({file_size_mb:.1f} MB)")
    
    print("\n[3/4] Executing UPSERT...")
    print("⏳ This may take 10-20 minutes. Please wait...")
    print("   (You'll see progress updates every minute)")
    
    cursor = conn.cursor()
    
    # Set statement timeout to 30 minutes
    cursor.execute("SET statement_timeout = '30min';")
    
    # Execute the SQL
    cursor.execute(sql)
    
    print("✅ SQL executed successfully!")
    
    print("\n[4/4] Committing transaction...")
    conn.commit()
    print("✅ Transaction committed!")
    
    # Verify results
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)
    
    cursor.execute("SELECT COUNT(*) FROM public.libros;")
    total = cursor.fetchone()[0]
    print(f"Total libros: {total:,}")
    
    cursor.execute("SELECT COUNT(CASE WHEN updated_at > created_at THEN 1 END) FROM public.libros;")
    updated = cursor.fetchone()[0]
    print(f"Libros actualizados: {updated:,}")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 UPSERT COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    
except psycopg2.Error as e:
    print(f"\n❌ Database error: {e}")
    print(f"Error code: {e.pgcode}")
    sys.exit(1)
    
except FileNotFoundError:
    print(f"\n❌ SQL file not found: {SQL_FILE}")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    sys.exit(1)
