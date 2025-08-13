#!/usr/bin/env python3
"""
Fix admin user login
"""

import psycopg2
import bcrypt

DB_CONFIG = {
    'host': 'db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com',
    'database': 'defaultdb',
    'user': 'doadmin', 
    'password': 'AVNS_IYR5Wif0JXj2883WILC',
    'port': 25060,
    'sslmode': 'require'
}

def fix_admin():
    """Fix admin user"""
    
    conn = None
    try:
        print("🔧 Fixing admin user...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check if admin_users table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admin_users'
            )
        """)
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            print("📋 Creating admin_users table...")
            cur.execute("""
                CREATE TABLE admin_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(20) DEFAULT 'admin',
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("  ✅ admin_users table created")
        
        # Generate proper password hash
        password = "admin123"
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Delete existing admin user and create new one
        cur.execute("DELETE FROM admin_users WHERE username = 'admin'")
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active) 
            VALUES (%s, %s, %s, %s)
        """, ('admin', password_hash, 'super_admin', True))
        
        print("  ✅ Admin user created/updated")
        
        # Verify the user exists
        cur.execute("SELECT username, role, is_active FROM admin_users WHERE username = 'admin'")
        result = cur.fetchone()
        print(f"  ✅ Verified admin user: {result}")
        
        # Test password verification
        cur.execute("SELECT password_hash FROM admin_users WHERE username = 'admin'")
        stored_hash = cur.fetchone()[0]
        
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
            print("  ✅ Password verification works")
        else:
            print("  ❌ Password verification failed")
        
        conn.commit()
        
        print(f"\n🎉 ADMIN USER FIXED!")
        print("Username: admin")
        print("Password: admin123")
        print("\nLogin at: https://noball-app-an792.ondigitalocean.app/admin/login")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_admin()