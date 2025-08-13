#!/usr/bin/env python3
"""
Test admin login authentication
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

def test_admin_auth():
    """Test admin authentication"""
    
    conn = None
    try:
        print("🔧 Testing admin authentication...")
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
        print(f"admin_users table exists: {table_exists}")
        
        if not table_exists:
            print("❌ admin_users table does not exist!")
            return
        
        # Get admin user
        cur.execute("SELECT username, password_hash, role, is_active FROM admin_users WHERE username = 'admin'")
        result = cur.fetchone()
        
        if result:
            username, password_hash, role, is_active = result
            print(f"✅ Found admin user:")
            print(f"  Username: {username}")
            print(f"  Role: {role}")
            print(f"  Active: {is_active}")
            print(f"  Password hash: {password_hash[:50]}...")
            
            # Test password verification
            test_password = "admin123"
            if bcrypt.checkpw(test_password.encode('utf-8'), password_hash.encode('utf-8')):
                print("✅ Password verification successful!")
            else:
                print("❌ Password verification failed!")
                
                # Try to fix the password
                print("🔧 Fixing password...")
                new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur.execute("UPDATE admin_users SET password_hash = %s WHERE username = 'admin'", (new_hash,))
                conn.commit()
                print("✅ Password updated!")
                
        else:
            print("❌ No admin user found!")
            print("🔧 Creating admin user...")
            
            # Create admin user
            password = "admin123"
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cur.execute("""
                INSERT INTO admin_users (username, password_hash, role, is_active) 
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE SET 
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_active = EXCLUDED.is_active
            """, ('admin', password_hash, 'super_admin', True))
            
            conn.commit()
            print("✅ Admin user created/updated!")
        
        print(f"\n🎉 ADMIN LOGIN SHOULD WORK NOW!")
        print("Try logging in with:")
        print("Username: admin")
        print("Password: admin123")
        
    except Exception as error:
        print(f"❌ Error: {error}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    test_admin_auth()