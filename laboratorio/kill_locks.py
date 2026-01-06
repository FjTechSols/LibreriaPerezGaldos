"""
Inspect and Kill Locks on Production
"""
import psycopg2
import sys

HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"
DB_PASSWORD = "693310893471_693sTs"  

conn = psycopg2.connect(
    host=HOST,
    database="postgres",
    user=USER,
    password=DB_PASSWORD,
    port=5432,
    connect_timeout=30
)
conn.autocommit = True
cursor = conn.cursor()

print("🔍 Checking for locks...")
cursor.execute("""
    SELECT pid, 
           usename, 
           state, 
           now() - query_start as duration,
           query
    FROM pg_stat_activity 
    WHERE pid <> pg_backend_pid()
    AND query NOT LIKE '%pg_stat_activity%'
    ORDER BY duration DESC;
""")

rows = cursor.fetchall()
if not rows:
    print("✅ No active queries found.")
else:
    for pid, user, state, duration, query in rows:
        print(f"🔴 PID: {pid} | User: {user} | State: {state} | Time: {duration}")
        print(f"   Query: {query[:100]}...")

        # Kill if it looks like my previous INSERTs
        if "INSERT INTO public.libros" in query or state == 'idle in transaction':
            print(f"   🔪 KILLING PID {pid}...")
            try:
                cursor.execute(f"SELECT pg_terminate_backend({pid});")
                print("   ✅ Terminated.")
            except Exception as e:
                print(f"   ❌ Failed to kill: {e}")

conn.close()
