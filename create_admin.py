#!/usr/bin/env python3
"""
Script to create admin user for NoBall Sports Club
"""
import os
import sys
from datetime import datetime

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseManager
from models import AdminUser
from werkzeug.security import generate_password_hash
import hashlib

def create_admin_user(username, password, role='super_admin'):
    """Create an admin user with proper password hashing"""
    try:
        conn = DatabaseManager.get_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM admin_users WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print(f"User '{username}' already exists. Updating password...")
            # Update existing user's password
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 100000).hex()
            cursor.execute("""
                UPDATE admin_users 
                SET password_hash = %s, updated_at = %s, is_active = true
                WHERE username = %s
            """, (password_hash, datetime.now(), username))
            print(f"Password updated for user '{username}'")
        else:
            # Create new user
            print(f"Creating new admin user '{username}'...")
            password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 100000).hex()
            cursor.execute("""
                INSERT INTO admin_users (username, password_hash, role, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (username, password_hash, role, True, datetime.now(), datetime.now()))
            print(f"Created new admin user '{username}' with role '{role}'")
        
        conn.commit()
        print(f"✅ Admin user '{username}' is ready!")
        print(f"Login at: https://noball.pk/admin/login")
        print(f"Username: {username}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # Create multiple admin users
    print("🚀 Creating admin users for NoBall Sports Club...")
    
    # Create/update main admin users
    create_admin_user("hamza", "admin123", "super_admin")
    create_admin_user("hmzza7", "admin123", "super_admin") 
    create_admin_user("admin", "admin123", "admin")
    
    print("\n✅ All admin users created/updated successfully!")
    print("\nYou can now login with any of these credentials:")
    print("Username: hamza | Password: admin123")
    print("Username: hmzza7 | Password: admin123") 
    print("Username: admin | Password: admin123")