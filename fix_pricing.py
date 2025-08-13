#!/usr/bin/env python3
"""
Fix court pricing data insertion
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

def fix_pricing():
    """Add court pricing data"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
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
            # Simple insert or update approach
            cur.execute("DELETE FROM court_pricing WHERE court_id = %s", (court_id,))
            cur.execute("""
                INSERT INTO court_pricing (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price, is_active, effective_from) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_DATE)
            """, (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price))
            print(f"  ✅ Added pricing for {court_id}")
        
        # Commit changes
        conn.commit()
        
        # Verify
        cur.execute("SELECT court_id, sport, base_price FROM court_pricing WHERE is_active = TRUE")
        pricing = cur.fetchall()
        print(f"\n✅ Court pricing added successfully! ({len(pricing)} courts)")
        for court in pricing:
            print(f"   💰 {court[0]} - {court[1]} - PKR {court[2]}/slot")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_pricing()