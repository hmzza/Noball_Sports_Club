#!/usr/bin/env python3
"""
Debug the complete login flow to see where it's failing
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

def test_pbkdf2_hash(password: str, stored_hash: str) -> bool:
    """Test PBKDF2 hash like the AdminUser.check_password method"""
    try:
        stored_hash_value, salt = stored_hash.split(':')
        test_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return test_hash == stored_hash_value
    except (ValueError, AttributeError):
        return False

def debug_login_flow():
    """Debug the complete login flow"""
    
    conn = None
    try:
        print("🔧 Debugging complete login flow...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Test the complete authentication flow
        test_username = "admin"
        test_password = "admin123"
        
        print(f"🧪 Testing login for: {test_username}")
        
        # Step 1: Get user by username (like AuthService.get_user_by_username)
        cur.execute("SELECT * FROM admin_users WHERE username = %s", (test_username,))
        result = cur.fetchone()
        
        if not result:
            print("❌ User not found in database")
            return
        
        # Get column names
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_users' ORDER BY ordinal_position")
        columns = [row[0] for row in cur.fetchall()]
        user_data = dict(zip(columns, result))
        
        print("✅ User found in database:")
        print(f"  ID: {user_data.get('id')}")
        print(f"  Username: {user_data.get('username')}")
        print(f"  Role: {user_data.get('role')}")
        print(f"  Is Active: {user_data.get('is_active')}")
        print(f"  Password Hash: {user_data.get('password_hash', '')[:50]}...")
        
        # Step 2: Check if user is active
        if not user_data.get('is_active'):
            print("❌ User is not active")
            return
        
        print("✅ User is active")
        
        # Step 3: Check password (like AdminUser.check_password)
        password_hash = user_data.get('password_hash', '')
        if test_pbkdf2_hash(test_password, password_hash):
            print("✅ Password verification successful")
        else:
            print("❌ Password verification failed")
            return
        
        # Step 4: Update last login (like AuthService.update_last_login)
        cur.execute("UPDATE admin_users SET last_login = %s WHERE id = %s", 
                   (datetime.now(), user_data.get('id')))
        affected_rows = cur.rowcount
        print(f"✅ Last login updated (affected {affected_rows} rows)")
        
        conn.commit()
        
        # Step 5: Check if there are any permission/middleware issues
        print("\n🔧 Checking potential middleware issues...")
        
        # Check if there are any constraint violations or triggers
        cur.execute("""
            SELECT conname, contype FROM pg_constraint 
            WHERE conrelid = 'admin_users'::regclass
        """)
        constraints = cur.fetchall()
        print(f"Admin users table constraints: {constraints}")
        
        # Check if session table exists (in case the app expects it)
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'sessions'
            )
        """)
        sessions_table_exists = cur.fetchone()[0]
        print(f"Sessions table exists: {sessions_table_exists}")
        
        print(f"\n🎉 LOGIN FLOW DEBUGGING COMPLETE!")
        print("\nThe authentication steps are working correctly.")
        print("The issue is likely in:")
        print("1. Session handling in Flask")
        print("2. Redirect logic after login")
        print("3. Frontend JavaScript issues")
        print("4. Browser cookie/session issues")
        
        print(f"\n💡 SUGGESTIONS:")
        print("1. Try clearing browser cache/cookies completely")
        print("2. Try incognito/private browsing mode")
        print("3. Check browser developer tools for JavaScript errors")
        print("4. The login might be working but redirect failing")
        
    except Exception as error:
        print(f"❌ Error: {error}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    debug_login_flow()