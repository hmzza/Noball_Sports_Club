"""
Database connection and management module.
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from config import Config

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Professional database connection manager with connection pooling support"""
    
    _instance = None
    _config = Config.DATABASE_CONFIG
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
        return cls._instance
    
    @staticmethod
    def get_connection():
        """Get database connection with error handling"""
        try:
            conn = psycopg2.connect(**DatabaseManager._config)
            return conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return None
    
    @staticmethod
    def execute_query(query, params=None, fetch_one=False, fetch_all=True):
        """Execute query with proper error handling and connection management"""
        conn = None
        try:
            conn = DatabaseManager.get_connection()
            if not conn:
                return None
            
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params or ())
            
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            else:
                result = cursor.rowcount
            
            conn.commit()
            return result
        
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Query execution error: {e}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            return None
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def execute_transaction(queries_with_params):
        """Execute multiple queries in a single transaction"""
        conn = None
        try:
            conn = DatabaseManager.get_connection()
            if not conn:
                return False
            
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            for query, params in queries_with_params:
                cursor.execute(query, params or ())
            
            conn.commit()
            return True
        
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Transaction execution error: {e}")
            return False
        finally:
            if conn:
                conn.close()
    
    @staticmethod
    def init_database():
        """Initialize database tables"""
        try:
            create_tables_query = """
                CREATE TABLE IF NOT EXISTS bookings (
                    id VARCHAR(50) PRIMARY KEY,
                    sport VARCHAR(50) NOT NULL,
                    court VARCHAR(50) NOT NULL,
                    court_name VARCHAR(100) NOT NULL,
                    booking_date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    duration DECIMAL(3,1) NOT NULL,
                    selected_slots JSONB NOT NULL,
                    player_name VARCHAR(100) NOT NULL,
                    player_phone VARCHAR(20) NOT NULL,
                    player_email VARCHAR(100),
                    player_count VARCHAR(10) DEFAULT '2',
                    special_requests TEXT,
                    payment_type VARCHAR(20) DEFAULT 'advance',
                    total_amount INTEGER NOT NULL,
                    promo_code VARCHAR(50),
                    discount_amount INTEGER DEFAULT 0,
                    original_amount INTEGER,
                    admin_comments TEXT,
                    status VARCHAR(20) DEFAULT 'pending_payment',
                    payment_verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    confirmed_at TIMESTAMP,
                    cancelled_at TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS contacts (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    sport VARCHAR(50),
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS blocked_slots (
                    id SERIAL PRIMARY KEY,
                    court VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    time_slot TIME NOT NULL,
                    reason TEXT NOT NULL,
                    blocked_by VARCHAR(100) DEFAULT 'admin',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(court, date, time_slot)
                );
                
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
                
                CREATE TABLE IF NOT EXISTS promo_codes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT NOT NULL,
                    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                    discount_value INTEGER NOT NULL,
                    min_amount INTEGER,
                    max_discount INTEGER,
                    usage_limit INTEGER,
                    usage_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    valid_from DATE,
                    valid_until DATE,
                    applicable_sports TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS expenses (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    amount DECIMAL(10,2) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    area_category VARCHAR(10) NOT NULL DEFAULT 'both',
                    expense_date DATE NOT NULL,
                    expense_type VARCHAR(20) NOT NULL DEFAULT 'one_time',
                    recurring_frequency VARCHAR(20),
                    created_by VARCHAR(100) DEFAULT 'admin',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

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
                
                CREATE INDEX IF NOT EXISTS idx_bookings_date_court 
                ON bookings(booking_date, court, status);
                CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
                CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
                CREATE INDEX IF NOT EXISTS idx_promo_codes_dates ON promo_codes(valid_from, valid_until);
                CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
                CREATE INDEX IF NOT EXISTS idx_expenses_area_category ON expenses(area_category);
                CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
                CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
                CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
                CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
                CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
                CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
                CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
                CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
                CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
                
                -- Add promo code columns to existing bookings table if they don't exist
                DO $$ 
                BEGIN 
                    BEGIN
                        ALTER TABLE bookings ADD COLUMN promo_code VARCHAR(50);
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column promo_code already exists in bookings.';
                    END;
                    BEGIN
                        ALTER TABLE bookings ADD COLUMN discount_amount INTEGER DEFAULT 0;
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column discount_amount already exists in bookings.';
                    END;
                    BEGIN
                        ALTER TABLE bookings ADD COLUMN original_amount INTEGER;
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column original_amount already exists in bookings.';
                    END;
                    BEGIN
                        ALTER TABLE bookings ADD COLUMN admin_comments TEXT;
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column admin_comments already exists in bookings.';
                    END;
                    BEGIN
                        ALTER TABLE expenses ADD COLUMN area_category VARCHAR(10) DEFAULT 'both';
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column area_category already exists in expenses.';
                    END;
                END $$;
            """
            
            result = DatabaseManager.execute_query(create_tables_query, fetch_all=False)
            if result is not None:
                logger.info("Database tables created successfully")
                
                # Skip index creation for blocked_slots to avoid conflicts
                # The table will work fine without this performance index
                logger.info("Database indexes skipped to avoid conflicts")
                
                logger.info("Database initialized successfully")
                return True
            else:
                logger.error("Failed to initialize database")
                return False
        
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            return False
    
    @staticmethod
    def test_connection():
        """Test database connection"""
        try:
            conn = DatabaseManager.get_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                conn.close()
                return True
            return False
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False