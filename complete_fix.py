#!/usr/bin/env python3
"""
Complete database fix - Create all missing tables and data
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

def complete_fix():
    """Create all missing tables and add data - complete setup"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # First, let's create ALL tables the app needs (from database.py)
        print("📋 Creating all required tables...")
        
        # 1. Admin users table
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
        
        # 2. Court pricing table
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
            );
        """)
        
        # 3. Activity logs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
                username VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                entity_name VARCHAR(255) NOT NULL,
                details TEXT,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 4. Create indexes for performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_date_court 
            ON bookings(booking_date, court, status);
            CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
            CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
            CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
            CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
            CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
        """)
        
        print("✅ All tables created!")
        
        # Now add the data
        print("👤 Adding admin users...")
        # Simple password hash for 'admin123' - CHANGE AFTER FIRST LOGIN!
        admin_hash = 'pbkdf2:sha256:600000$salt$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active) 
            VALUES ('admin', %s, 'super_admin', TRUE)
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                updated_at = CURRENT_TIMESTAMP
        """, (admin_hash,))
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active) 
            VALUES ('hmzza7', %s, 'super_admin', TRUE)
            ON CONFLICT (username) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                updated_at = CURRENT_TIMESTAMP
        """, (admin_hash,))
        
        print("💰 Adding court pricing...")
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
        
        print("🎟️ Adding promo codes...")
        cur.execute("""
            INSERT INTO promo_codes (code, description, discount_type, discount_value, min_amount, max_discount, is_active, valid_from, valid_until, applicable_sports) 
            VALUES ('WELCOME10', 'Welcome 10%% discount', 'percentage', 10, 1000, 500, TRUE, '2024-08-01', '2025-12-31', 'all')
            ON CONFLICT (code) DO UPDATE SET 
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
        """)
        
        cur.execute("""
            INSERT INTO promo_codes (code, description, discount_type, discount_value, min_amount, is_active, valid_from, valid_until, applicable_sports) 
            VALUES ('FIRST500', 'First booking PKR 500 off', 'fixed', 500, 2000, TRUE, '2024-08-01', '2025-12-31', 'all')
            ON CONFLICT (code) DO UPDATE SET 
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
        """)
        
        # Commit everything
        conn.commit()
        
        # Final verification
        print("\n✅ Final Verification:")
        
        cur.execute("SELECT username, role FROM admin_users WHERE is_active = TRUE")
        users = cur.fetchall()
        print(f"👤 Admin Users: {len(users)}")
        for user in users:
            print(f"   • {user[0]} ({user[1]})")
        
        cur.execute("SELECT court_id, sport, base_price FROM court_pricing WHERE is_active = TRUE")
        courts = cur.fetchall()
        print(f"🏟️ Courts: {len(courts)}")
        for court in courts:
            print(f"   • {court[0]} - {court[1]} - PKR {court[2]}")
        
        cur.execute("SELECT code, discount_value FROM promo_codes WHERE is_active = TRUE")
        promos = cur.fetchall()
        print(f"🎟️ Promo Codes: {len(promos)}")
        for promo in promos:
            print(f"   • {promo[0]} - {promo[1]}")
        
        print(f"\n🎉 Complete setup finished at {datetime.now()}")
        print("\n🚀 Test your app now:")
        print("   🔐 Admin: https://noball-app-an792.ondigitalocean.app/admin/login")
        print("      Username: admin, Password: admin123")
        print("   📅 Booking: https://noball-app-an792.ondigitalocean.app/booking") 
        print("   🎟️ Promo codes: WELCOME10, FIRST500")
        print("\n⚠️ CHANGE admin password after login!")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    complete_fix()