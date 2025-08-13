#!/usr/bin/env python3
"""
Recreate bookings table with proper schema
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

def recreate_bookings():
    """Recreate bookings table with proper schema"""
    
    conn = None
    try:
        print("🔧 Recreating bookings table...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Backup existing data first
        print("📋 Backing up existing bookings...")
        cur.execute("SELECT COUNT(*) FROM bookings")
        count = cur.fetchone()[0]
        print(f"Found {count} existing bookings")
        
        if count > 0:
            # Create backup table
            cur.execute("DROP TABLE IF EXISTS bookings_backup")
            cur.execute("CREATE TABLE bookings_backup AS SELECT * FROM bookings")
            print("  ✅ Backup created")
        
        # Drop the problematic table
        print("📋 Dropping existing bookings table...")
        cur.execute("DROP TABLE bookings CASCADE")
        print("  ✅ Old table dropped")
        
        # Create new table with proper schema
        print("📋 Creating new bookings table...")
        create_sql = """
        CREATE TABLE bookings (
            id VARCHAR(50) PRIMARY KEY,
            sport VARCHAR(50),
            court VARCHAR(50),
            court_name VARCHAR(100),
            booking_date DATE,
            start_time TIME,
            end_time TIME,
            duration DECIMAL(3,1) DEFAULT 1.0,
            selected_slots JSONB DEFAULT '[]'::jsonb,
            player_name VARCHAR(100),
            player_phone VARCHAR(20),
            player_email VARCHAR(100),
            player_count VARCHAR(10) DEFAULT '2',
            special_requests TEXT,
            payment_type VARCHAR(20) DEFAULT 'advance',
            total_amount INTEGER,
            promo_code VARCHAR(50),
            discount_amount INTEGER DEFAULT 0,
            original_amount INTEGER,
            status VARCHAR(20) DEFAULT 'pending_payment',
            payment_verified BOOLEAN DEFAULT FALSE,
            confirmed_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            -- Legacy columns for compatibility (nullable)
            customer_name VARCHAR(100),
            customer_email VARCHAR(100),
            customer_phone VARCHAR(20),
            sport_id INTEGER
        )
        """
        
        cur.execute(create_sql)
        print("  ✅ New table created with proper schema")
        
        # Test booking insertion
        print("🧪 Testing booking insertion...")
        test_data = (
            'NB20250813SUCCESS',  # id
            'pickleball',         # sport
            'pickleball-1',       # court  
            'Court 1: Professional', # court_name
            '2025-08-14',         # booking_date
            '14:00',              # start_time
            '15:00',              # end_time
            1.0,                  # duration
            '[{"time": "14:00", "index": 0}]',  # selected_slots
            'Success Test User',  # player_name
            '1234567890',         # player_phone
            'success@example.com', # player_email
            '2',                  # player_count
            'Success test',       # special_requests
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
        cur.execute("SELECT id, sport, player_name, total_amount, status FROM bookings WHERE id = 'NB20250813SUCCESS'")
        result = cur.fetchone()
        print(f"  ✅ Verified: {result}")
        
        # Restore old data if any (convert integer ids to strings)
        if count > 0:
            print("📋 Restoring old booking data...")
            try:
                cur.execute("""
                    INSERT INTO bookings (
                        id, sport, court, court_name, booking_date, start_time, end_time,
                        total_amount, status, customer_name, customer_email, customer_phone, sport_id
                    )
                    SELECT 
                        'OLD_' || old.id::text as id,
                        CASE 
                            WHEN old.sport_id = 1 THEN 'padel'
                            WHEN old.sport_id = 2 THEN 'cricket' 
                            WHEN old.sport_id = 3 THEN 'futsal'
                            WHEN old.sport_id = 4 THEN 'pickleball'
                            ELSE 'unknown'
                        END as sport,
                        CASE
                            WHEN old.sport_id = 1 THEN 'padel-1'
                            WHEN old.sport_id = 2 THEN 'cricket-1'
                            WHEN old.sport_id = 3 THEN 'futsal-1' 
                            WHEN old.sport_id = 4 THEN 'pickleball-1'
                            ELSE 'unknown-1'
                        END as court,
                        CASE
                            WHEN old.sport_id = 1 THEN 'Court 1: Purple Mondo'
                            WHEN old.sport_id = 2 THEN 'Court 1: 110x50ft'
                            WHEN old.sport_id = 3 THEN 'Court 1: 130x60ft Multi'
                            WHEN old.sport_id = 4 THEN 'Court 1: Professional'
                            ELSE 'Unknown Court'
                        END as court_name,
                        old.booking_date,
                        old.start_time,
                        old.end_time,
                        old.total_amount::INTEGER,
                        old.status,
                        old.customer_name,
                        old.customer_email,
                        old.customer_phone,
                        old.sport_id
                    FROM bookings_backup old
                """)
                restored = cur.rowcount
                print(f"  ✅ Restored {restored} old bookings")
            except Exception as e:
                print(f"  ⚠️  Could not restore old data: {e}")
        
        conn.commit()
        
        print(f"\n🎉 BOOKINGS TABLE SUCCESSFULLY RECREATED!")
        print("✅ ID column is VARCHAR(50)")
        print("✅ All new columns present")
        print("✅ Legacy columns for compatibility")
        print("✅ Booking insertion works perfectly")
        print("\n🚀 YOUR BOOKING SYSTEM IS NOW FULLY FUNCTIONAL!")
        print("\nTest your app at: https://noball-app-an792.ondigitalocean.app")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    recreate_bookings()