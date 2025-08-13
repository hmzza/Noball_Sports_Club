#!/usr/bin/env python3
"""
Production Database Setup Script
Run this ONCE after deploying to DigitalOcean
"""

import psycopg2
import sys
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

def create_tables():
    """Create all database tables for the sports club"""
    
    conn = None
    try:
        print("Connecting to PostgreSQL database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        print("Creating tables...")
        
        # 1. Users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(128) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        
        # 2. Sports table  
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sports (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                price_per_hour DECIMAL(10,2) NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Bookings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(100) NOT NULL,
                customer_phone VARCHAR(20) NOT NULL,
                customer_email VARCHAR(120),
                sport_id INTEGER REFERENCES sports(id),
                booking_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                payment_status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id)
            )
        """)
        
        # 4. Contacts table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(120) NOT NULL,
                phone VARCHAR(20),
                subject VARCHAR(200),
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 5. Blocked slots table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS blocked_slots (
                id SERIAL PRIMARY KEY,
                sport_id INTEGER REFERENCES sports(id),
                blocked_date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                reason VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id)
            )
        """)
        
        # 6. Expenses table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                description VARCHAR(200) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                expense_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id)
            )
        """)
        
        # 7. Promo codes table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS promo_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                discount_type VARCHAR(10) NOT NULL, -- 'percentage' or 'fixed'
                discount_value DECIMAL(10,2) NOT NULL,
                min_amount DECIMAL(10,2) DEFAULT 0,
                max_uses INTEGER DEFAULT NULL,
                used_count INTEGER DEFAULT 0,
                valid_from DATE NOT NULL,
                valid_until DATE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("✅ All tables created successfully!")
        
        # Insert default admin user (for main users table)
        print("Creating default admin user...")
        cur.execute("""
            INSERT INTO users (username, email, password_hash, role) 
            VALUES ('admin', 'admin@noball.pk', 'pbkdf2:sha256:600000$default$hash', 'admin')
            ON CONFLICT (username) DO NOTHING
        """)
        
        # Insert admin user for admin_users table (for admin login)
        print("Creating admin user in admin_users table...")
        # Simple password hash for 'admin123' - you should change this after first login
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role) 
            VALUES ('admin', 'pbkdf2:sha256:600000$salt$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'super_admin')
            ON CONFLICT (username) DO NOTHING
        """)
        
        # Also create hmzza7 user
        cur.execute("""
            INSERT INTO admin_users (username, password_hash, role) 
            VALUES ('hmzza7', 'pbkdf2:sha256:600000$salt$1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'super_admin')
            ON CONFLICT (username) DO NOTHING
        """)
        
        # Insert default sports
        print("Adding default sports...")
        sports_data = [
            ('Padel', 5500.00, 'Premium padel courts with professional equipment'),
            ('Cricket', 3000.00, 'Full-size cricket ground for matches and practice'),
            ('Futsal', 2500.00, 'Indoor futsal courts with quality flooring'),
            ('Pickleball', 2500.00, 'Modern pickleball courts for all skill levels')
        ]
        
        for sport_name, price, description in sports_data:
            cur.execute("""
                INSERT INTO sports (name, price_per_hour, description) 
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET 
                    price_per_hour = EXCLUDED.price_per_hour,
                    description = EXCLUDED.description
            """, (sport_name, price, description))
        
        # Insert court pricing data (needed for booking system)
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
        
        print("✅ Default data inserted!")
        
        # Commit all changes
        conn.commit()
        print(f"🎉 Database setup completed successfully at {datetime.now()}")
        print("You can now use your NoBall Sports Club app!")
        
    except Exception as error:
        print(f"❌ Error setting up database: {error}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_tables()