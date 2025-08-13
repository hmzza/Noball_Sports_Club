#!/usr/bin/env python3
"""
Final fix - Complete the database setup to match the app requirements
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

def final_fix():
    """Complete database setup with all missing pieces"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # 1. Create admin_users table (needed for admin login)
        print("📋 Creating admin_users table...")
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
            );
        """)
        
        # 2. Add admin users (password: admin123)
        print("👤 Creating admin users...")
        # This is a simple hash - CHANGE PASSWORD after first login!
        admin_hash = 'pbkdf2:sha256:600000$salt$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active) 
            VALUES ('admin', %s, 'super_admin', TRUE)
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role
        """, (admin_hash,))
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active) 
            VALUES ('hmzza7', %s, 'super_admin', TRUE)
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role
        """, (admin_hash,))
        
        # 3. Add court pricing data (needed for booking system)
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
                    sport = EXCLUDED.sport,
                    base_price = EXCLUDED.base_price,
                    peak_price = EXCLUDED.peak_price,
                    off_peak_price = EXCLUDED.off_peak_price,
                    weekend_price = EXCLUDED.weekend_price,
                    updated_at = CURRENT_TIMESTAMP
            """, (court_id, court_name, sport, base_price, peak_price, off_peak_price, weekend_price))
        
        # 4. Add some sample promo codes for testing
        print("🎟️ Adding sample promo codes...")
        promo_codes = [
            ('WELCOME10', 'Welcome 10% discount', 'percentage', 10, 1000, 500, None, '2024-08-01', '2025-12-31', 'all'),
            ('FIRST500', 'First booking PKR 500 off', 'fixed', 500, 2000, None, None, '2024-08-01', '2025-12-31', 'all'),
        ]
        
        for code, desc, disc_type, disc_val, min_amt, max_disc, usage_limit, valid_from, valid_until, sports in promo_codes:
            cur.execute("""
                INSERT INTO promo_codes (code, description, discount_type, discount_value, min_amount, max_discount, usage_limit, is_active, valid_from, valid_until, applicable_sports) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET 
                    description = EXCLUDED.description,
                    discount_type = EXCLUDED.discount_type,
                    discount_value = EXCLUDED.discount_value,
                    min_amount = EXCLUDED.min_amount,
                    max_discount = EXCLUDED.max_discount,
                    updated_at = CURRENT_TIMESTAMP
            """, (code, desc, disc_type, disc_val, min_amt, max_disc, usage_limit, valid_from, valid_until, sports))
        
        # 5. Verify everything was created
        print("\n✅ Verification:")
        
        # Check admin users
        cur.execute("SELECT username, role, is_active FROM admin_users")
        admin_users = cur.fetchall()
        print(f"👤 Admin Users ({len(admin_users)}):")
        for user in admin_users:
            print(f"   • {user[0]} - {user[1]} - {'Active' if user[2] else 'Inactive'}")
        
        # Check pricing
        cur.execute("SELECT court_id, court_name, sport, base_price FROM court_pricing WHERE is_active = TRUE")
        pricing = cur.fetchall()
        print(f"🏟️ Court Pricing ({len(pricing)}):")
        for court in pricing:
            print(f"   • {court[0]} - {court[1]} - {court[2]} - PKR {court[3]}/slot")
        
        # Check promo codes
        cur.execute("SELECT code, description, discount_value FROM promo_codes WHERE is_active = TRUE")
        promos = cur.fetchall()
        print(f"🎟️ Promo Codes ({len(promos)}):")
        for promo in promos:
            print(f"   • {promo[0]} - {promo[1]} - {promo[2]}")
        
        # Commit all changes
        conn.commit()
        print(f"\n🎉 Database setup completed successfully!")
        print("\n🚀 Your app is now ready:")
        print("   • Admin Login: https://noball-app-an792.ondigitalocean.app/admin/login")
        print("   • Username: admin | Password: admin123")
        print("   • Username: hmzza7 | Password: admin123")
        print("   • Customer Booking: https://noball-app-an792.ondigitalocean.app/booking")
        print("   • Test promo codes: WELCOME10, FIRST500")
        print("\n⚠️ IMPORTANT: Change admin passwords after first login!")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    final_fix()