"""
Configuration settings for NoBall Sports Club application.
"""

import os
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

class Config:
    """Base configuration class"""

    @staticmethod
    def _get_env(name: str, default: str = None, required: bool = False) -> str:
        val = os.environ.get(name, default)
        if required and (val is None or str(val).strip() == ""):
            raise RuntimeError(f"Missing required environment variable: {name}")
        return val

    # Secret key: required in production
    SECRET_KEY = _get_env.__func__("SECRET_KEY", "dev-insecure-key", required=False)

    # Database configuration
    # In production, require explicit env vars; in development, use safe defaults
    if os.environ.get("FLASK_ENV") == "production":
        # Prefer explicit DB_* vars; fall back to DATABASE_URL if provided by platform
        if os.environ.get("DB_HOST"):
            DATABASE_CONFIG = {
                "host": _get_env.__func__("DB_HOST", required=True),
                "database": _get_env.__func__("DB_NAME", required=True),
                "user": _get_env.__func__("DB_USER", required=True),
                "password": _get_env.__func__("DB_PASSWORD", required=True),
                "port": int(_get_env.__func__("DB_PORT", "5432")),
                "sslmode": _get_env.__func__("DB_SSLMODE", "require"),
            }
        else:
            # Try parsing DATABASE_URL (e.g., postgres://user:pass@host:port/dbname)
            db_url = (
                os.environ.get("DATABASE_URL")
                or os.environ.get("DATABASE_URI")
                or os.environ.get("DB_URL")
                or os.environ.get("POSTGRES_URL")
                or os.environ.get("POSTGRESQL_URL")
            )
            if db_url:
                parsed = urlparse(db_url)
                DATABASE_CONFIG = {
                    "host": parsed.hostname,
                    "database": parsed.path.lstrip("/"),
                    "user": parsed.username,
                    "password": parsed.password,
                    "port": parsed.port or 5432,
                    "sslmode": _get_env.__func__("DB_SSLMODE", "require"),
                }
            else:
                # Last-resort: fall back to local-style defaults to keep app booting,
                # but warn so platform logs show the misconfiguration.
                logger.warning("DB_HOST/DATABASE_URL not set; using localhost defaults in production.")
                DATABASE_CONFIG = {
                    "host": "localhost",
                    "database": "noball_sports",
                    "user": "postgres",
                    "password": "admin@123",
                    "port": 5432,
                    "sslmode": "prefer",
                }
        if not SECRET_KEY or SECRET_KEY == "dev-insecure-key":
            raise RuntimeError("SECRET_KEY must be set in production")
    else:
        DATABASE_CONFIG = {
            "host": os.environ.get("DB_HOST", "localhost"),
            "database": os.environ.get("DB_NAME", "noball_sports"),
            "user": os.environ.get("DB_USER", "postgres"),
            "password": os.environ.get("DB_PASSWORD", "admin@123"),
            "port": int(os.environ.get("DB_PORT", "5432")),
            "sslmode": os.environ.get("DB_SSLMODE", "prefer"),
        }

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
        "axe_throw": [{"id": "axe-1", "name": "Lane 1: Axe Throw"}],
        "archery": [{"id": "archery-1", "name": "Lane 1: Archery Range"}],
        # Phone-only experience (15-minute sessions)
        "rage_room": [
            {
                "id": "rage-room-1",
                "name": "Rage Room",
                "slot_minutes": 15,
                "booking_mode": "phone_only",
            }
        ],
    }

    # Multi-purpose court mapping
    MULTI_PURPOSE_COURTS = {"cricket-2": "multi-130x60", "futsal-1": "multi-130x60"}

    # Default per-hour pricing used as a last-resort fallback in some UI helpers.
    # Concrete pricing should come from court_pricing table; these values ensure
    # sensible defaults across environments.
    SPORT_PRICING = {
        "cricket": 3000,
        "futsal": 2500,
        "padel": 6000,
        "pickleball": 3000,
        "axe_throw": 4000,
        "archery": 3500,
        "rage_room": 0,  # phone-only; priced per conversation
    }

    # Admin Configuration
    # Admin bootstrap (used only for initial setup if enabled explicitly)
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

    # Contact / WhatsApp configuration
    # Set to digits without + (e.g., 923161439569)
    WHATSAPP_NUMBER = os.environ.get("WHATSAPP_NUMBER", "923293180180")


class DevelopmentConfig(Config):
    """Development configuration"""

    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""

    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PREFERRED_URL_SCHEME = "https"


# Configuration mapping
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
