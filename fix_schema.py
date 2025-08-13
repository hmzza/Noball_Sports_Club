#!/usr/bin/env python3
"""
Fix database schema to match what the booking system expects
"""

import psycopg2
from datetime import datetime

# Your Production Database Connection
DB_CONFIG = {
    'host': 'db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com',
    'database': 'defaultdb',
    'user': 'doadmin', 
    'password': 'AVNS_IYR5Wif0JXj2883WILC',
    'port': 25060,
    'sslmode': 'require'
}

def fix_schema():
    """Fix database schema by adding missing columns and tables"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("📋 Adding missing columns to bookings table...")
        
        # Add missing columns to bookings table
        missing_columns = [
            ("sport", "VARCHAR(50)"),
            ("court", "VARCHAR(50)"), 
            ("court_name", "VARCHAR(100)"),
            ("selected_slots", "JSONB"),
            ("duration", "DECIMAL(3,1)"),
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
        
        for column_name, column_type in missing_columns:
            try:
                cur.execute(f"""
                    ALTER TABLE bookings 
                    ADD COLUMN {column_name} {column_type}
                """)
                print(f"  ✅ Added column: {column_name}")
            except Exception as e:
                if "already exists" in str(e):
                    print(f"  ⚪ Column already exists: {column_name}")
                else:
                    print(f"  ❌ Error adding {column_name}: {e}")
        
        print("📋 Updating existing bookings with default values...")
        # Update existing bookings with default values based on sport_id
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
                player_name = customer_name,
                player_phone = customer_phone,
                player_email = customer_email,
                duration = EXTRACT(HOUR FROM (end_time - start_time)) + EXTRACT(MINUTE FROM (end_time - start_time))/60.0,
                selected_slots = '[]'::jsonb,
                original_amount = total_amount
            WHERE sport IS NULL OR court IS NULL
        """)
        
        print("📋 Adding missing column to blocked_slots table...")
        # Add missing column to blocked_slots table
        try:
            cur.execute("""
                ALTER TABLE blocked_slots 
                ADD COLUMN time_slot TIME
            """)
            print("  ✅ Added time_slot column to blocked_slots")
        except Exception as e:
            if "already exists" in str(e):
                print("  ⚪ time_slot column already exists")
            else:
                print(f"  ❌ Error adding time_slot: {e}")
        
        print("📋 Creating court_pricing table...")
        # Create court_pricing table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS court_pricing (
                id SERIAL PRIMARY KEY,
                court_id VARCHAR(50) NOT NULL,
                court_name VARCHAR(100) NOT NULL,
                sport VARCHAR(50) NOT NULL,
                base_price INTEGER NOT NULL,
                peak_price INTEGER,
                off_peak_price INTEGER,
                weekend_price INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                effective_from DATE,
                effective_until DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(court_id, is_active) DEFERRABLE INITIALLY DEFERRED
            )
        """)
        print("  ✅ Created court_pricing table")
        
        print("💰 Adding court pricing data...")
        pricing_data = [
            ('padel-1', 'Court 1: Purple Mondo', 'padel', 2750, 3300, 2200, 3300),
            ('padel-2', 'Court 2: Teracotta Court', 'padel', 2750, 3300, 2200, 3300),
            ('cricket-1', 'Court 1: 110x50ft', 'cricket', 1500, 1800, 1200, 1800),
            ('cricket-2', 'Court 2: 130x60ft Multi', 'cricket', 1500, 1800, 1200, 1800),
            ('futsal-1', 'Court 1: 130x60ft Multi', 'futsal', 1250, 1500, 1000, 1500),
            ('pickleball-1', 'Court 1: Professional', 'pickleball', 1250, 1500, 1000, 1500),
        ]
        
        for court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price in pricing_data:
            cur.execute("""
                INSERT INTO court_pricing (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price, is_active, effective_from) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_DATE)
                ON CONFLICT (court_id, is_active) DO UPDATE SET 
                    court_name = EXCLUDED.court_name,
                    base_price = EXCLUDED.base_price,
                    peak_price = EXCLUDED.peak_price,
                    off_peak_price = EXCLUDED.off_peak_price,
                    weekend_price = EXCLUDED.weekend_price,
                    updated_at = CURRENT_TIMESTAMP
            """, (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price))
        
        # Commit all changes
        conn.commit()
        
        print("\n✅ Schema fix completed successfully!")
        print("🚀 Your booking system should now work!")
        print("\n📊 Summary:")
        
        # Check final status
        cur.execute("SELECT COUNT(*) FROM bookings")
        booking_count = cur.fetchone()[0]
        print(f"   📅 Total bookings: {booking_count}")
        
        cur.execute("SELECT COUNT(*) FROM court_pricing WHERE is_active = TRUE")
        pricing_count = cur.fetchone()[0] 
        print(f"   💰 Active court prices: {pricing_count}")
        
        cur.execute("SELECT COUNT(*) FROM admin_users WHERE is_active = TRUE")
        admin_count = cur.fetchone()[0]
        print(f"   👤 Active admin users: {admin_count}")
        
        print(f"\n🎉 Database ready at {datetime.now()}")
        
    except Exception as error:
        print(f"❌ Error fixing schema: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_schema()