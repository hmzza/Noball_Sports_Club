#!/usr/bin/env python3
"""
Debug production login - see what's happening in the database
"""

import psycopg2
import bcrypt
from datetime import datetime

DB_CONFIG = {
    'host': 'db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com',
    'database': 'defaultdb',
    'user': 'doadmin', 
    'password': 'AVNS_IYR5Wif0JXj2883WILC',
    'port': 25060,
    'sslmode': 'require'
}

def debug_production():
    """Debug production database auth"""
    
    conn = None
    try:
        print("🔧 Debugging production authentication...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check what admin users exist
        cur.execute("SELECT id, username, password_hash, role, is_active, created_at FROM admin_users ORDER BY created_at DESC")
        users = cur.fetchall()
        
        print(f"📋 Found {len(users)} admin users:")
        for user in users:
            user_id, username, password_hash, role, is_active, created_at = user
            print(f"  ID: {user_id}")
            print(f"  Username: {username}")
            print(f"  Role: {role}")  
            print(f"  Active: {is_active}")
            print(f"  Created: {created_at}")
            print(f"  Password hash: {password_hash[:50]}...")
            
            # Test both possible passwords
            test_passwords = ["admin123", "admin@11212"]
            for pwd in test_passwords:
                try:
                    if bcrypt.checkpw(pwd.encode('utf-8'), password_hash.encode('utf-8')):
                        print(f"  ✅ Password '{pwd}' works!")
                        break
                except Exception as e:
                    print(f"  ❌ Error testing password '{pwd}': {e}")
            else:
                print(f"  ❌ Neither test password works")
            
            print("-" * 50)
        
        # Based on the logs, it seems the app is creating a super admin with different credentials
        # Let's check what the AuthService.create_super_admin() method is doing
        print("\n🔧 Creating/updating admin user with correct credentials...")
        
        # Delete existing admin user
        cur.execute("DELETE FROM admin_users WHERE username = 'admin'")
        
        # Create new admin user with correct credentials
        password = "admin123"
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, ('admin', password_hash, 'super_admin', True, datetime.now(), datetime.now()))
        
        result = cur.fetchone()
        if result:
            user_id = result[0]
            print(f"✅ Created admin user with ID: {user_id}")
        
        conn.commit()
        
        # Also create the hmzza7 user that the app seems to be creating
        print("\n🔧 Also creating hmzza7 user (from logs)...")
        cur.execute("DELETE FROM admin_users WHERE username = 'hmzza7'")
        
        hmzza7_password = "admin@11212"
        hmzza7_hash = bcrypt.hashpw(hmzza7_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ('hmzza7', hmzza7_hash, 'super_admin', True, datetime.now(), datetime.now()))
        
        conn.commit()
        print("✅ Created hmzza7 user")
        
        print(f"\n🎉 TRY THESE LOGIN COMBINATIONS:")
        print("Option 1:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\nOption 2:")
        print("  Username: hmzza7")
        print("  Password: admin@11212")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    debug_production()