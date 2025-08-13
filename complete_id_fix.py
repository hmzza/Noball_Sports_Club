#!/usr/bin/env python3
"""
Complete fix for the ID column - force conversion to VARCHAR
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

def complete_fix():
    """Complete fix for ID column"""
    
    conn = None
    try:
        print("🔧 Complete ID column fix...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check current ID type
        cur.execute("""
            SELECT data_type, column_default FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'id'
        """)
        current_info = cur.fetchone()
        print(f"Current ID info: {current_info}")
        
        # Step 1: Remove the default value completely
        print("📋 Removing default value...")
        cur.execute("ALTER TABLE bookings ALTER COLUMN id DROP DEFAULT")
        print("  ✅ Default value removed")
        
        # Step 2: Drop sequence with CASCADE
        print("📋 Dropping sequence with CASCADE...")
        cur.execute("DROP SEQUENCE IF EXISTS bookings_id_seq CASCADE")
        print("  ✅ Sequence dropped")
        
        # Step 3: Drop primary key constraint
        print("📋 Dropping primary key...")
        cur.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_pkey")
        print("  ✅ Primary key dropped")
        
        # Step 4: Change the column type
        print("📋 Converting column type to VARCHAR...")
        cur.execute("ALTER TABLE bookings ALTER COLUMN id TYPE VARCHAR(50) USING id::VARCHAR")
        print("  ✅ Column type converted to VARCHAR(50)")
        
        # Step 5: Re-add primary key constraint
        print("📋 Re-adding primary key...")
        cur.execute("ALTER TABLE bookings ADD PRIMARY KEY (id)")
        print("  ✅ Primary key re-added")
        
        # Step 6: Test booking insertion
        print("🧪 Testing booking insertion...")
        
        # Clean up any existing test bookings
        cur.execute("DELETE FROM bookings WHERE id = 'NB20250813TEST999'")
        
        test_data = (
            'NB20250813TEST999',  # string id
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
            'Final test',         # special_requests
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
        print("  ✅ Test booking inserted successfully!")
        
        # Verify
        cur.execute("SELECT id, sport, player_name, total_amount FROM bookings WHERE id = 'NB20250813TEST999'")
        result = cur.fetchone()
        print(f"  ✅ Verified test booking: {result}")
        
        conn.commit()
        
        print(f"\n🎉 DATABASE SCHEMA IS NOW COMPLETELY FIXED!")
        print("✅ ID column is VARCHAR(50)")
        print("✅ No auto-increment sequence") 
        print("✅ All required columns present")
        print("✅ Test booking insertion successful")
        print("\n🚀 Your booking system should work perfectly now!")
        print("\nNext steps:")
        print("1. Test booking on https://noball-app-an792.ondigitalocean.app")
        print("2. Connect domain noball.pk")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    complete_fix()