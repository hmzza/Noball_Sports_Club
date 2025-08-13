#!/usr/bin/env python3
"""
Inspect existing table structure
"""

import psycopg2

# Your Production Database Connection
DB_CONFIG = {
    'host': 'db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com',
    'database': 'defaultdb',
    'user': 'doadmin', 
    'password': 'AVNS_IYR5Wif0JXj2883WILC',
    'port': 25060,
    'sslmode': 'require'
}

def inspect_tables():
    """Inspect table structure"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check columns in bookings table
        print("📋 Checking bookings table structure...")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bookings'
            ORDER BY ordinal_position
        """)
        
        columns = cur.fetchall()
        print("Bookings table columns:")
        for col in columns:
            print(f"  • {col[0]} - {col[1]}")
            
        # Check if any data exists
        print("\n📊 Checking data count:")
        cur.execute("SELECT COUNT(*) FROM bookings")
        booking_count = cur.fetchone()[0]
        print(f"  Bookings: {booking_count}")
        
        cur.execute("SELECT COUNT(*) FROM contacts")
        contact_count = cur.fetchone()[0]
        print(f"  Contacts: {contact_count}")
        
        cur.execute("SELECT COUNT(*) FROM sports")
        sports_count = cur.fetchone()[0]
        print(f"  Sports: {sports_count}")
        
        if sports_count > 0:
            print("\n🏃 Sports in database:")
            cur.execute("SELECT name, price_per_hour FROM sports")
            sports = cur.fetchall()
            for sport in sports:
                print(f"  • {sport[0]} - PKR {sport[1]}")
        
    except Exception as error:
        print(f"❌ Error: {error}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    inspect_tables()