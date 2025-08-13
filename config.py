"""
Configuration settings for NoBall Sports Club application.
"""
import os

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    
    # Database Configuration - Force production settings if on DigitalOcean
    # Detect if running on DigitalOcean (they set this environment variable)
    is_digitalocean = os.environ.get('DYNO') or os.environ.get('DIGITAL_OCEAN') or 'digitalocean.app' in os.environ.get('SERVER_NAME', '')
    
    if is_digitalocean or os.environ.get('FLASK_ENV') == 'production':
        # Force DigitalOcean production database settings
        DATABASE_CONFIG = {
            "host": "db-postgresql-sgp1-34347-do-user-24629537-0.h.db.ondigitalocean.com",
            "database": "defaultdb",
            "user": "doadmin",
            "password": "AVNS_IYR5Wif0JXj2883WILC",
            "port": 25060,
            "sslmode": "require",
        }
        print("🚀 Using FORCED production database settings for DigitalOcean")
    else:
        # Local development settings
        DATABASE_CONFIG = {
            "host": os.environ.get('DB_HOST', "localhost"),
            "database": os.environ.get('DB_NAME', "noball_sports"),
            "user": os.environ.get('DB_USER', "postgres"),
            "password": os.environ.get('DB_PASSWORD', "admin@123"),
            "port": int(os.environ.get('DB_PORT', "5432")),
            "sslmode": "prefer",
        }
        print("🏠 Using local development database settings")
    
    # Court Configurations
    COURT_CONFIG = {
        "padel": [
            {"id": "padel-1", "name": "Court 1: Purple Mondo"},
            {"id": "padel-2", "name": "Court 2: Teracotta Court"},
        ],
        "cricket": [
            {"id": "cricket-1", "name": "Court 1: 110x50ft"},
            {"id": "cricket-2", "name": "Court 2: 130x60ft Multi"},
        ],
        "futsal": [{"id": "futsal-1", "name": "Court 1: 130x60ft Multi"}],
        "pickleball": [{"id": "pickleball-1", "name": "Court 1: Professional"}],
    }
    
    # Multi-purpose court mapping
    MULTI_PURPOSE_COURTS = {
        "cricket-2": "multi-130x60",
        "futsal-1": "multi-130x60"
    }
    
    # Pricing configuration
    SPORT_PRICING = {
        "cricket": 3000,
        "futsal": 2500,
        "padel": 5500,
        "pickleball": 2500
    }
    
    # Admin Configuration
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}