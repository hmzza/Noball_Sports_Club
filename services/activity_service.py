"""
Activity logging service for tracking admin operations
"""
from typing import Optional, List, Dict
from datetime import datetime
from flask import g, request
from models import ActivityLog, ActivityType
from database import DatabaseManager


class ActivityService:
    """Professional activity logging service"""
    
    @staticmethod
    def log_activity(action: str, entity_type: str, entity_id: str, entity_name: str, 
                    details: Optional[str] = None, user_id: Optional[int] = None, 
                    username: Optional[str] = None) -> Optional[ActivityLog]:
        """Log an admin activity"""
        try:
            # Get current user info if not provided
            if not user_id or not username:
                if hasattr(g, 'current_user') and g.current_user:
                    user_id = g.current_user.id
                    username = g.current_user.username
                else:
                    # Fallback for system operations
                    user_id = None
                    username = 'system'
            
            # Get request info
            ip_address = None
            user_agent = None
            if request:
                ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR'))
                user_agent = request.headers.get('User-Agent')
            
            log = ActivityLog(
                user_id=user_id,
                username=username,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id),
                entity_name=entity_name,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.now()
            )
            
            query = """
                INSERT INTO activity_logs 
                (user_id, username, action, entity_type, entity_id, entity_name, details, ip_address, user_agent, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            result = DatabaseManager.execute_query(
                query,
                (log.user_id, log.username, log.action, log.entity_type, log.entity_id, 
                 log.entity_name, log.details, log.ip_address, log.user_agent, log.created_at),
                fetch_one=True
            )
            
            if result:
                log.id = result['id']
                return log
            return None
            
        except Exception as e:
            print(f"Error logging activity: {e}")
            return None
    
    @staticmethod
    def get_all_logs(limit: int = 100, offset: int = 0) -> List[ActivityLog]:
        """Get all activity logs with pagination"""
        try:
            query = """
                SELECT * FROM activity_logs 
                ORDER BY created_at DESC 
                LIMIT %s OFFSET %s
            """
            
            results = DatabaseManager.execute_query(query, (limit, offset))
            
            if results:
                return [ActivityLog.from_dict(dict(row)) for row in results]
            return []
        except Exception as e:
            print(f"Error getting activity logs: {e}")
            return []
    
    @staticmethod
    def get_logs_by_user(user_id: int, limit: int = 50) -> List[ActivityLog]:
        """Get activity logs for a specific user"""
        try:
            query = """
                SELECT * FROM activity_logs 
                WHERE user_id = %s 
                ORDER BY created_at DESC 
                LIMIT %s
            """
            
            results = DatabaseManager.execute_query(query, (user_id, limit))
            
            if results:
                return [ActivityLog.from_dict(dict(row)) for row in results]
            return []
        except Exception as e:
            print(f"Error getting user activity logs: {e}")
            return []
    
    @staticmethod
    def get_logs_by_entity(entity_type: str, entity_id: str) -> List[ActivityLog]:
        """Get activity logs for a specific entity"""
        try:
            query = """
                SELECT * FROM activity_logs 
                WHERE entity_type = %s AND entity_id = %s 
                ORDER BY created_at DESC
            """
            
            results = DatabaseManager.execute_query(query, (entity_type, entity_id))
            
            if results:
                return [ActivityLog.from_dict(dict(row)) for row in results]
            return []
        except Exception as e:
            print(f"Error getting entity activity logs: {e}")
            return []
    
    @staticmethod
    def get_logs_by_action(action: str, limit: int = 50) -> List[ActivityLog]:
        """Get activity logs by action type"""
        try:
            query = """
                SELECT * FROM activity_logs 
                WHERE action = %s 
                ORDER BY created_at DESC 
                LIMIT %s
            """
            
            results = DatabaseManager.execute_query(query, (action, limit))
            
            if results:
                return [ActivityLog.from_dict(dict(row)) for row in results]
            return []
        except Exception as e:
            print(f"Error getting action activity logs: {e}")
            return []
    
    @staticmethod
    def delete_log(log_id: int) -> bool:
        """Delete an activity log (super admin only)"""
        try:
            query = "DELETE FROM activity_logs WHERE id = %s"
            result = DatabaseManager.execute_query(query, (log_id,), fetch_all=False)
            return result is not None
        except Exception as e:
            print(f"Error deleting activity log: {e}")
            return False
    
    @staticmethod
    def delete_old_logs(days: int = 90) -> int:
        """Delete logs older than specified days"""
        try:
            query = """
                DELETE FROM activity_logs 
                WHERE created_at < NOW() - INTERVAL '%s days'
            """
            result = DatabaseManager.execute_query(query, (days,), fetch_all=False)
            return result if result else 0
        except Exception as e:
            print(f"Error deleting old logs: {e}")
            return 0
    
    @staticmethod
    def get_log_stats() -> Dict:
        """Get activity log statistics"""
        try:
            query = """
                SELECT 
                    COUNT(*) as total_logs,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as logs_24h,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as logs_7d,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as logs_30d
                FROM activity_logs
            """
            
            result = DatabaseManager.execute_query(query, fetch_one=True)
            return dict(result) if result else {}
        except Exception as e:
            print(f"Error getting log stats: {e}")
            return {}

    # Convenience methods for common operations
    @staticmethod
    def log_booking_confirmed(booking_id: str, customer_name: str, details: Optional[str] = None):
        """Log booking confirmation"""
        return ActivityService.log_activity(
            ActivityType.BOOKING_CONFIRMED, 
            'booking', 
            booking_id, 
            customer_name,
            details
        )
    
    @staticmethod
    def log_booking_cancelled(booking_id: str, customer_name: str, details: Optional[str] = None):
        """Log booking cancellation"""
        return ActivityService.log_activity(
            ActivityType.BOOKING_CANCELLED, 
            'booking', 
            booking_id, 
            customer_name,
            details
        )
    
    @staticmethod
    def log_booking_created(booking_id: str, customer_name: str, details: Optional[str] = None):
        """Log booking creation"""
        return ActivityService.log_activity(
            ActivityType.BOOKING_CREATED, 
            'booking', 
            booking_id, 
            customer_name,
            details
        )
    
    @staticmethod
    def log_booking_updated(booking_id: str, customer_name: str, details: Optional[str] = None):
        """Log booking update"""
        return ActivityService.log_activity(
            ActivityType.BOOKING_UPDATED, 
            'booking', 
            booking_id, 
            customer_name,
            details
        )
    
    @staticmethod
    def log_expense_created(expense_id: str, expense_title: str, amount: float):
        """Log expense creation"""
        return ActivityService.log_activity(
            ActivityType.EXPENSE_CREATED, 
            'expense', 
            expense_id, 
            expense_title,
            f"Amount: PKR {amount:,.2f}"
        )
    
    @staticmethod
    def log_expense_updated(expense_id: str, expense_title: str, amount: float):
        """Log expense update"""
        return ActivityService.log_activity(
            ActivityType.EXPENSE_UPDATED, 
            'expense', 
            expense_id, 
            expense_title,
            f"Amount: PKR {amount:,.2f}"
        )
    
    @staticmethod
    def log_user_created(user_id: str, username: str, role: str):
        """Log user creation"""
        return ActivityService.log_activity(
            ActivityType.USER_CREATED, 
            'user', 
            user_id, 
            username,
            f"Role: {role}"
        )
    
    @staticmethod
    def log_user_locked(user_id: str, username: str):
        """Log user locking"""
        return ActivityService.log_activity(
            ActivityType.USER_LOCKED, 
            'user', 
            user_id, 
            username
        )
    
    @staticmethod
    def log_user_unlocked(user_id: str, username: str):
        """Log user unlocking"""
        return ActivityService.log_activity(
            ActivityType.USER_UNLOCKED, 
            'user', 
            user_id, 
            username
        )