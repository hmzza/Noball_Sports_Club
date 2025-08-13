#!/usr/bin/env python3
"""
Check what tables exist in production database
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

def check_database():
    """Check what tables exist in the database"""
    
    conn = None
    try:
        print("Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check what tables exist
        print("Checking existing tables...")
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = cur.fetchall()
        print(f"Found {len(tables)} tables:")
        for table in tables:
            print(f"  📋 {table[0]}")
            
        # Check if admin_users exists and has data
        if any('admin_users' in str(table) for table in tables):
            print("\n👤 Admin users table exists. Checking content...")
            cur.execute("SELECT username, role FROM admin_users")
            users = cur.fetchall()
            if users:
                for user in users:
                    print(f"  User: {user[0]} - Role: {user[1]}")
            else:
                print("  No admin users found")
        else:
            print("\n❌ admin_users table does not exist")
            
        # Check if any pricing table exists
        pricing_tables = [table for table in tables if 'pric' in str(table[0]).lower()]
        if pricing_tables:
            print(f"\n💰 Found pricing tables: {pricing_tables}")
        else:
            print("\n❌ No pricing tables found")
        
    except Exception as error:
        print(f"❌ Error checking database: {error}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_database()