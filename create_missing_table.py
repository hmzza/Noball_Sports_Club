#!/usr/bin/env python3
"""
Create missing court_pricing table properly
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

def create_table():
    """Create court_pricing table and add data"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("📋 Creating court_pricing table...")
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            """, (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price))
            print(f"  ✅ Added pricing for {court_id} - {sport}")
        
        # Commit changes
        conn.commit()
        
        # Verify everything
        cur.execute("SELECT COUNT(*) FROM court_pricing WHERE is_active = TRUE")
        pricing_count = cur.fetchone()[0] 
        print(f"\n🎉 Success! {pricing_count} court prices added")
        
        cur.execute("SELECT COUNT(*) FROM bookings")
        booking_count = cur.fetchone()[0]
        print(f"📅 Total bookings: {booking_count}")
        
        print("\n✅ Database is now ready for bookings!")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_table()