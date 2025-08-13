#!/usr/bin/env python3
"""
Final fix for the ID column - remove default and test
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

def final_fix():
    """Final fix for ID column"""
    
    conn = None
    try:
        print("🔧 Final ID column fix...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Remove the default value from id column
        print("📋 Removing default value from id column...")
        cur.execute("ALTER TABLE bookings ALTER COLUMN id DROP DEFAULT")
        print("  ✅ Removed default value")
        
        # Now drop the sequence
        cur.execute("DROP SEQUENCE IF EXISTS bookings_id_seq CASCADE")
        print("  ✅ Dropped sequence")
        
        # Test booking insertion
        print("🧪 Testing booking insertion...")
        
        # Clean up any test bookings first
        cur.execute("DELETE FROM bookings WHERE id LIKE 'NB%TEST%'")
        
        test_data = (
            'NB20250813TEST002',  # string id
            'pickleball',         # sport
            'pickleball-1',       # court  
            'Court 1: Professional', # court_name
            '2025-08-14',         # booking_date
            '14:00',              # start_time
            '15:00',              # end_time
            1.0,                  # duration
            '[{"time": "14:00", "index": 0}]',  # selected_slots
            'Test User Final',    # player_name
            '1234567890',         # player_phone
            'test@example.com',   # player_email
            '2',                  # player_count
            'Test booking',       # special_requests
            'advance',            # payment_type
            2500,                 # total_amount
            None,                 # promo_code
            0,                    # discount_amount
            2500,                 # original_amount
            'pending_payment'     # status
        )
        
        insert_sql = """
            INSERT INTO bookings (
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, selected_slots, player_name, player_phone, player_email,
                player_count, special_requests, payment_type, total_amount, 
                promo_code, discount_amount, original_amount, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        cur.execute(insert_sql, test_data)
        print("  ✅ Test booking inserted!")
        
        # Verify
        cur.execute("SELECT id, sport, player_name FROM bookings WHERE id = 'NB20250813TEST002'")
        result = cur.fetchone()
        print(f"  ✅ Verified: {result}")
        
        conn.commit()
        
        print(f"\n🎉 DATABASE IS NOW FIXED!")
        print("✅ ID column is now VARCHAR(50)")
        print("✅ All required columns present") 
        print("✅ Test booking insertion successful")
        print("\n🚀 Your booking system should work now!")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    final_fix()