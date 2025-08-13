#!/usr/bin/env python3
"""
FORCE fix the database schema - no more bullshit
"""

import psycopg2

DB_CONFIG = {
    'host': 'db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com',
    'database': 'defaultdb',
    'user': 'doadmin', 
    'password': 'AVNS_IYR5Wif0JXj2883WILC',
    'port': 25060,
    'sslmode': 'require'
}

def force_fix():
    """Force fix the database schema once and for all"""
    
    conn = None
    try:
        print("🔧 Force fixing database schema...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check what columns actually exist in bookings
        print("📋 Checking current bookings table structure...")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bookings'
            ORDER BY ordinal_position
        """)
        
        existing_columns = [row[0] for row in cur.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Add missing columns one by one with proper error handling
        columns_to_add = [
            ("sport", "VARCHAR(50)"),
            ("court", "VARCHAR(50)"), 
            ("court_name", "VARCHAR(100)"),
            ("selected_slots", "JSONB DEFAULT '[]'::jsonb"),
            ("duration", "DECIMAL(3,1) DEFAULT 1.0"),
            ("player_name", "VARCHAR(100)"),
            ("player_phone", "VARCHAR(20)"),
            ("player_email", "VARCHAR(100)"),
            ("player_count", "VARCHAR(10) DEFAULT '2'"),
            ("special_requests", "TEXT"),
            ("payment_type", "VARCHAR(20) DEFAULT 'advance'"),
            ("promo_code", "VARCHAR(50)"),
            ("discount_amount", "INTEGER DEFAULT 0"),
            ("original_amount", "INTEGER"),
            ("payment_verified", "BOOLEAN DEFAULT FALSE"),
            ("confirmed_at", "TIMESTAMP"),
            ("cancelled_at", "TIMESTAMP"),
        ]
        
        for column_name, column_type in columns_to_add:
            if column_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE bookings ADD COLUMN {column_name} {column_type}"
                    print(f"Adding: {sql}")
                    cur.execute(sql)
                    print(f"  ✅ Added: {column_name}")
                except Exception as e:
                    print(f"  ❌ Failed to add {column_name}: {e}")
        
        # Fix blocked_slots table
        print("📋 Fixing blocked_slots table...")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'blocked_slots'
        """)
        blocked_columns = [row[0] for row in cur.fetchall()]
        
        if 'time_slot' not in blocked_columns:
            try:
                cur.execute("ALTER TABLE blocked_slots ADD COLUMN time_slot TIME")
                print("  ✅ Added time_slot to blocked_slots")
            except Exception as e:
                print(f"  ❌ Failed to add time_slot: {e}")
        
        # Update existing data with proper values
        print("📋 Updating existing bookings...")
        try:
            cur.execute("""
                UPDATE bookings SET
                    sport = CASE 
                        WHEN sport_id = 1 THEN 'padel'
                        WHEN sport_id = 2 THEN 'cricket' 
                        WHEN sport_id = 3 THEN 'futsal'
                        WHEN sport_id = 4 THEN 'pickleball'
                        ELSE 'unknown'
                    END,
                    court = CASE
                        WHEN sport_id = 1 THEN 'padel-1'
                        WHEN sport_id = 2 THEN 'cricket-1'
                        WHEN sport_id = 3 THEN 'futsal-1' 
                        WHEN sport_id = 4 THEN 'pickleball-1'
                        ELSE 'unknown-1'
                    END,
                    court_name = CASE
                        WHEN sport_id = 1 THEN 'Court 1: Purple Mondo'
                        WHEN sport_id = 2 THEN 'Court 1: 110x50ft'
                        WHEN sport_id = 3 THEN 'Court 1: 130x60ft Multi'
                        WHEN sport_id = 4 THEN 'Court 1: Professional'
                        ELSE 'Unknown Court'
                    END,
                    player_name = COALESCE(customer_name, 'Unknown'),
                    player_phone = COALESCE(customer_phone, '0000000000'),
                    player_email = COALESCE(customer_email, 'unknown@example.com'),
                    duration = COALESCE(EXTRACT(EPOCH FROM (end_time - start_time))/3600.0, 1.0),
                    selected_slots = '[]'::jsonb,
                    original_amount = COALESCE(total_amount::INTEGER, 0)
                WHERE sport IS NULL
            """)
            print("  ✅ Updated existing bookings with proper data")
        except Exception as e:
            print(f"  ❌ Error updating bookings: {e}")
        
        # Commit everything
        conn.commit()
        
        # Final check
        print("\n✅ Final verification:")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name IN ('sport', 'court', 'selected_slots', 'player_name')
        """)
        final_check = cur.fetchall()
        print(f"Key columns now present: {[c[0] for c in final_check]}")
        
        cur.execute("SELECT COUNT(*) FROM bookings")
        count = cur.fetchone()[0]
        print(f"Total bookings: {count}")
        
        print("\n🎉 Schema fix completed! Try booking again now.")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    force_fix()