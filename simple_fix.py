#!/usr/bin/env python3
"""
Simple fix - Just add admin users to make login work
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

def simple_fix():
    """Add admin users and some test data to make the app work"""
    
    conn = None
    try:
        print("🔧 Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # 1. Create admin_users table
        print("👤 Creating admin_users table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'staff',
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
        """)
        
        # 2. Add admin users with a simple password hash (admin123)
        print("🔑 Adding admin users...")
        # This is a weak hash for testing - CHANGE PASSWORD IMMEDIATELY!
        admin_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5y.Cs8kKle'  # admin123
        
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
        
        # 3. Add some test bookings for demo
        print("📅 Adding test bookings...")
        cur.execute("""
            INSERT INTO bookings (customer_name, customer_phone, customer_email, sport_id, booking_date, start_time, end_time, total_amount, status, payment_status)
            VALUES ('Test Customer', '0300-1234567', 'test@example.com', 1, CURRENT_DATE + 1, '14:00', '16:00', 11000, 'confirmed', 'paid')
            ON CONFLICT DO NOTHING
        """)
        
        cur.execute("""
            INSERT INTO bookings (customer_name, customer_phone, customer_email, sport_id, booking_date, start_time, end_time, total_amount, status, payment_status)
            VALUES ('Demo User', '0301-1234567', 'demo@example.com', 2, CURRENT_DATE + 2, '18:00', '20:00', 6000, 'confirmed', 'paid')
            ON CONFLICT DO NOTHING
        """)
        
        # 4. Add a test promo code
        print("🎟️ Adding test promo code...")
        cur.execute("""
            INSERT INTO promo_codes (code, discount_type, discount_value, min_amount, max_uses, used_count, valid_from, valid_until, is_active)
            VALUES ('TEST10', 'percentage', 10.00, 1000.00, 100, 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', TRUE)
            ON CONFLICT (code) DO UPDATE SET 
                discount_value = EXCLUDED.discount_value
        """)
        
        # Commit changes
        conn.commit()
        
        # Verification
        print("\n✅ Verification:")
        
        cur.execute("SELECT username, role FROM admin_users")
        users = cur.fetchall()
        print(f"👤 Admin users: {len(users)}")
        for user in users:
            print(f"   • {user[0]} ({user[1]})")
        
        cur.execute("SELECT COUNT(*) FROM bookings")
        booking_count = cur.fetchone()[0]
        print(f"📅 Bookings: {booking_count}")
        
        cur.execute("SELECT COUNT(*) FROM promo_codes WHERE is_active = TRUE")
        promo_count = cur.fetchone()[0]
        print(f"🎟️ Active promo codes: {promo_count}")
        
        print(f"\n🎉 Simple fix completed!")
        print("\n🚀 Try now:")
        print("   🔐 Admin login: https://noball-app-an792.ondigitalocean.app/admin/login")
        print("      Username: admin")  
        print("      Password: admin123")
        print("   📊 Admin dashboard should now work!")
        print("\n⚠️ CHANGE PASSWORD after first login!")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    simple_fix()