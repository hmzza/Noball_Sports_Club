#!/usr/bin/env python3
"""
Fix the ID column type mismatch in bookings table
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

def fix_id_column():
    """Fix the ID column type to match what the app expects"""
    
    conn = None
    try:
        print("🔧 Fixing bookings ID column type...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check current ID type
        cur.execute("""
            SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'bookings' AND column_name = 'id'
        """)
        current_type = cur.fetchone()[0]
        print(f"Current ID type: {current_type}")
        
        if current_type != 'character varying':
            print("📋 Converting ID column from INTEGER to VARCHAR...")
            
            # Step 1: Drop the primary key constraint first
            cur.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_pkey")
            print("  ✅ Dropped primary key constraint")
            
            # Step 2: Change the column type
            cur.execute("ALTER TABLE bookings ALTER COLUMN id TYPE VARCHAR(50)")
            print("  ✅ Changed id column to VARCHAR(50)")
            
            # Step 3: Re-add primary key constraint
            cur.execute("ALTER TABLE bookings ADD PRIMARY KEY (id)")
            print("  ✅ Re-added primary key constraint")
            
            # Step 4: Drop the sequence since we don't need auto-increment
            cur.execute("DROP SEQUENCE IF EXISTS bookings_id_seq")
            print("  ✅ Dropped auto-increment sequence")
        else:
            print("✅ ID column is already VARCHAR")
        
        # Test the fix with a sample booking
        print("🧪 Testing booking insertion with string ID...")
        test_data = (
            'NB20250813TEST001',  # string id
            'pickleball',         # sport
            'pickleball-1',       # court  
            'Court 1: Professional', # court_name
            '2025-08-14',         # booking_date
            '14:00',              # start_time
            '15:00',              # end_time
            1.0,                  # duration
            '[{"time": "14:00", "index": 0}]',  # selected_slots
            'Test User',          # player_name
            '1234567890',         # player_phone
            'test@example.com',   # player_email
            '2',                  # player_count
            '',                   # special_requests
            'advance',            # payment_type
            2500,                 # total_amount
            None,                 # promo_code
            0,                    # discount_amount
            2500,                 # original_amount
            'pending_payment'     # status
        )
        
        # Delete any existing test booking first
        cur.execute("DELETE FROM bookings WHERE id = 'NB20250813TEST001'")
        
        # Insert test booking
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
        
        # Verify the booking exists
        cur.execute("SELECT id, sport, player_name, total_amount FROM bookings WHERE id = 'NB20250813TEST001'")
        result = cur.fetchone()
        if result:
            print(f"  ✅ Verified: {result}")
        
        conn.commit()
        
        print(f"\n🎉 ID column fixed successfully!")
        print("Your booking system should now work perfectly!")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_id_column()