"""
Verify production data ingress progress
Connects to Supabase production and counts rows in 'libros' table
"""
import psycopg2
import sys

# Supabase Production credentials
HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"
DB_PASSWORD = "693310893471_693sTs"  

print("Connecting to Supabase to check progress...")

try:
    conn = psycopg2.connect(
        host=HOST,
        database="postgres",
        user=USER,
        password=DB_PASSWORD,
        port=5432,
        connect_timeout=30
    )
    
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM public.libros;")
    count = cursor.fetchone()[0]
    
    print(f"Current row count in public.libros: {count:,}")
    
    cursor.execute("SELECT COUNT(*) FROM public.libros WHERE updated_at > NOW() - INTERVAL '1 hour';")
    updated_recent = cursor.fetchone()[0]
    print(f"Rows updated in last hour: {updated_recent:,}")
    
    conn.close()

except Exception as e:
    print(f"Error checking progress: {e}")
