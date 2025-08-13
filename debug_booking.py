#!/usr/bin/env python3
"""
Debug exactly what's failing in the booking insertion
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

def debug_booking():
    """Debug the exact booking insertion issue"""
    
    conn = None
    try:
        print("🔧 Debugging booking insertion...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check exact columns in bookings table
        print("📋 Current bookings table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'bookings'
            ORDER BY ordinal_position
        """)
        
        columns = cur.fetchall()
        for col in columns:
            print(f"  {col[0]} - {col[1]} - Null: {col[2]} - Default: {col[3]}")
        
        # Test a manual booking insertion exactly like the app does
        print("\n📋 Testing manual booking insertion...")
        test_booking_data = (
            'TEST_BOOKING_123',  # id
            'pickleball',        # sport
            'pickleball-1',      # court
            'Court 1: Professional Setup',  # court_name
            '2025-08-14',        # booking_date
            '14:00',             # start_time
            '15:00',             # end_time
            1.0,                 # duration
            '[{"time": "14:00", "index": 0}, {"time": "14:30", "index": 1}]',  # selected_slots
            'Test Player',       # player_name
            '1234567890',       # player_phone
            'test@test.com',    # player_email
            '2',                # player_count
            '',                 # special_requests
            'advance',          # payment_type
            2000,               # total_amount
            None,               # promo_code
            0,                  # discount_amount
            2000,               # original_amount
            'pending_payment'   # status
        )
        
        # Exact query from the app
        insert_query = """
            INSERT INTO bookings (
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, selected_slots, player_name, player_phone, player_email,
                player_count, special_requests, payment_type, total_amount, 
                promo_code, discount_amount, original_amount, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        
        print("🧪 Attempting test insertion...")
        cur.execute(insert_query, test_booking_data)
        print("✅ Test insertion successful!")
        
        # Check if it was actually inserted
        cur.execute("SELECT id, sport, court, player_name, total_amount FROM bookings WHERE id = 'TEST_BOOKING_123'")
        result = cur.fetchone()
        if result:
            print(f"✅ Booking found: {result}")
        else:
            print("❌ Booking not found after insertion")
        
        conn.commit()
        print("\n🎉 Booking insertion works perfectly!")
        print("The issue might be in the app code, not the database.")
        
    except Exception as error:
        print(f"❌ Error during test insertion: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    debug_booking()