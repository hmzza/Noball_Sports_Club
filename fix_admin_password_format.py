#!/usr/bin/env python3
"""
Fix admin password with correct PBKDF2 format that the AdminUser model expects
"""

import psycopg2
import hashlib
import secrets
from datetime import datetime

DB_CONFIG = {
    'host': 'db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com',
    'database': 'defaultdb',
    'user': 'doadmin', 
    'password': 'AVNS_IYR5Wif0JXj2883WILC',
    'port': 25060,
    'sslmode': 'require'
}

def create_pbkdf2_hash(password: str) -> str:
    """Create PBKDF2 hash in the format the AdminUser model expects"""
    salt = secrets.token_hex(16)
    hash_value = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return hash_value + ':' + salt

def test_pbkdf2_hash(password: str, stored_hash: str) -> bool:
    """Test PBKDF2 hash like the AdminUser.check_password method"""
    try:
        stored_hash_value, salt = stored_hash.split(':')
        test_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return test_hash == stored_hash_value
    except (ValueError, AttributeError):
        return False

def fix_admin_passwords():
    """Fix admin passwords with correct PBKDF2 format"""
    
    conn = None
    try:
        print("🔧 Fixing admin passwords with correct PBKDF2 format...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Delete all existing admin users
        cur.execute("DELETE FROM admin_users")
        print("🗑️  Cleared existing admin users")
        
        # Create admin user with PBKDF2 hash
        admin_password = "admin123"
        admin_hash = create_pbkdf2_hash(admin_password)
        
        print(f"Generated PBKDF2 hash: {admin_hash[:50]}...")
        
        # Test the hash
        if test_pbkdf2_hash(admin_password, admin_hash):
            print("✅ PBKDF2 hash verification successful!")
        else:
            print("❌ PBKDF2 hash verification failed!")
            return
        
        # Insert admin user
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, ('admin', admin_hash, 'super_admin', True, datetime.now(), datetime.now()))
        
        result = cur.fetchone()
        admin_id = result[0] if result else None
        print(f"✅ Created admin user with ID: {admin_id}")
        
        # Create hmzza7 user with PBKDF2 hash
        hmzza7_password = "admin@11212"
        hmzza7_hash = create_pbkdf2_hash(hmzza7_password)
        
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role, is_active, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, ('hmzza7', hmzza7_hash, 'super_admin', True, datetime.now(), datetime.now()))
        
        result = cur.fetchone()
        hmzza7_id = result[0] if result else None
        print(f"✅ Created hmzza7 user with ID: {hmzza7_id}")
        
        conn.commit()
        
        # Verify by reading back and testing
        print("\n🧪 Verifying created users...")
        cur.execute("SELECT username, password_hash FROM admin_users")
        users = cur.fetchall()
        
        for username, password_hash in users:
            test_password = "admin123" if username == "admin" else "admin@11212"
            if test_pbkdf2_hash(test_password, password_hash):
                print(f"✅ {username}: password verification successful")
            else:
                print(f"❌ {username}: password verification failed")
        
        print(f"\n🎉 ADMIN USERS FIXED WITH CORRECT PBKDF2 FORMAT!")
        print("\nTRY LOGGING IN WITH:")
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
    fix_admin_passwords()