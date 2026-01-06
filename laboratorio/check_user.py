import psycopg2
import sys

# Supabase Production credentials
HOST = "aws-1-eu-west-1.pooler.supabase.com"
USER = "postgres.weaihscsaqxadxjgsfbt"

print("--- DIAGNOSTIC: CHECKING USERS ---")
try:
    # Use standard input for password to avoid hardcoding
    # If running non-interactively, this might hang if not piped. 
    # But user runs valid inputs. 
    # Actually, let's look for env var or ask user to provide it.
    # Assuming user inputs it.
    password = input(f"Enter DB Password for {USER}: ")
    
    conn = psycopg2.connect(
        host=HOST,
        user=USER,
        password=password,
        port="5432",
        database="postgres"
    )
    
    cur = conn.cursor()
    
    print("\n[QUERY] SELECT * FROM public.usuarios;")
    # Also check if auth.users exists/matches, but we cant query auth schema easily with regular user unless granted.
    # We will try public.usuarios first.
    cur.execute("SELECT id, username, email, nombre, rol_id FROM public.usuarios")
    
    rows = cur.fetchall()
    
    if not rows:
        print(" NO USERS FOUND in public.usuarios table.")
    else:
        print(f" FOUND {len(rows)} USERS:")
        print(f"{'ID':<38} | {'USERNAME':<15} | {'EMAIL':<25} | {'ROL'}")
        print("-" * 90)
        for row in rows:
            uid, username, email, nombre, rol = row
            display_name = username if username else (nombre if nombre else "N/A")
            print(f"{str(uid):<38} | {str(display_name):<15} | {str(email):<25} | {str(rol)}")

    conn.close()

except Exception as e:
    print(f"\n ERROR: {e}")
