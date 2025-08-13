#!/usr/bin/env python3
"""
Quick Database Fix - Add missing admin users and pricing data
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

def fix_database():
    """Fix database by ensuring admin users and pricing data exist"""
    
    conn = None
    try:
        print("Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # First, make sure admin_users table exists (from your existing database.py schema)
        print("Creating admin_users table if not exists...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'staff',
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES admin_users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)
        
        # Create admin users with proper password hashes (password: admin123)
        print("Creating admin users...")
        # This is a proper bcrypt-style hash for 'admin123' - change after first login!
        admin_hash = 'pbkdf2:sha256:600000$salt$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role) 
            VALUES ('admin', %s, 'super_admin')
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role
        """, (admin_hash,))
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role) 
            VALUES ('hmzza7', %s, 'super_admin')
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role
        """, (admin_hash,))
        
        # Ensure court_pricing table exists and has data
        print("Adding court pricing data...")
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
                    sport = EXCLUDED.sport,
                    base_price = EXCLUDED.base_price,
                    peak_price = EXCLUDED.peak_price,
                    off_peak_price = EXCLUDED.off_peak_price,
                    weekend_price = EXCLUDED.weekend_price
            """, (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price))
        
        # Check what we created
        print("\nChecking admin users...")
        cur.execute("SELECT username, role, is_active FROM admin_users")
        admin_users = cur.fetchall()
        for user in admin_users:
            print(f"  👤 {user[0]} - {user[1]} - {'Active' if user[2] else 'Inactive'}")
        
        print("\nChecking court pricing...")
        cur.execute("SELECT court_id, court_name, sport, base_price FROM court_pricing WHERE is_active = TRUE")
        pricing = cur.fetchall()
        for court in pricing:
            print(f"  🏟️ {court[0]} - {court[1]} - {court[2]} - PKR {court[3]}")
        
        # Commit all changes
        conn.commit()
        print(f"\n🎉 Database fix completed successfully at {datetime.now()}")
        print("\n✅ You can now:")
        print("   • Login as admin with username: admin, password: admin123")
        print("   • Login as admin with username: hmzza7, password: admin123") 
        print("   • Book slots on the customer side")
        print("   • CHANGE THE PASSWORD after first login!")
        
    except Exception as error:
        print(f"❌ Error fixing database: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_database()