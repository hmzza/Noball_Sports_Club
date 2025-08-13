"""
Legacy admin_routes.py - now imports from modular admin package.
This file is kept for backward compatibility.
"""
from admin import admin_bp

# For backward compatibility, expose any classes that might be imported elsewhere
from services.admin_service import AdminService as AdminDatabaseManager
from services.schedule_service import ScheduleService as AdminScheduleService
from services.booking_service import BookingService as AdminBookingService

# Legacy class names for compatibility
class AdminDatabaseManager:
    """Legacy compatibility class - redirects to AdminService"""
    @staticmethod
    def execute_query(*args, **kwargs):
        from database import DatabaseManager
        return DatabaseManager.execute_query(*args, **kwargs)
    
    @staticmethod
    def get_connection():
        from database import DatabaseManager
        return DatabaseManager.get_connection()

# Export the blueprint as the main interface
__all__ = ['admin_bp', 'AdminDatabaseManager', 'AdminScheduleService', 'AdminBookingService']