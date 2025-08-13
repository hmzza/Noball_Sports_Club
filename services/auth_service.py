"""
Authentication service for admin users
"""
from typing import Optional, List, Dict
from datetime import datetime
import secrets
from models import AdminUser, AdminRole
from database import DatabaseManager


class AuthService:
    """Professional authentication service for admin users"""
    
    @staticmethod
    def create_user(username: str, password: str, role: str, created_by: Optional[int] = None) -> Optional[AdminUser]:
        """Create a new admin user"""
        try:
            if AuthService.get_user_by_username(username):
                return None
            
            user = AdminUser()
            user.username = username
            user.set_password(password)
            user.role = role
            user.created_by = created_by
            user.created_at = datetime.now()
            user.updated_at = datetime.now()
            
            query = """
                INSERT INTO admin_users (username, password_hash, role, created_by, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            result = DatabaseManager.execute_query(
                query,
                (user.username, user.password_hash, user.role, user.created_by, user.created_at, user.updated_at),
                fetch_one=True
            )
            
            if result:
                user.id = result['id']
                return user
            return None
            
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    @staticmethod
    def authenticate_user(username: str, password: str) -> Optional[AdminUser]:
        """Authenticate user with username and password"""
        try:
            user = AuthService.get_user_by_username(username)
            if user and user.is_active and user.check_password(password):
                AuthService.update_last_login(user.id)
                return user
            return None
        except Exception as e:
            print(f"Error authenticating user: {e}")
            return None
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[AdminUser]:
        """Get user by username"""
        try:
            query = "SELECT * FROM admin_users WHERE username = %s"
            result = DatabaseManager.execute_query(query, (username,), fetch_one=True)
            
            if result:
                return AdminUser.from_dict(dict(result))
            return None
        except Exception as e:
            print(f"Error getting user by username: {e}")
            return None
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[AdminUser]:
        """Get user by ID"""
        try:
            query = "SELECT * FROM admin_users WHERE id = %s"
            result = DatabaseManager.execute_query(query, (user_id,), fetch_one=True)
            
            if result:
                return AdminUser.from_dict(dict(result))
            return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None
    
    @staticmethod
    def get_all_users() -> List[AdminUser]:
        """Get all admin users"""
        try:
            query = "SELECT * FROM admin_users ORDER BY created_at DESC"
            results = DatabaseManager.execute_query(query)
            
            if results:
                return [AdminUser.from_dict(dict(row)) for row in results]
            return []
        except Exception as e:
            print(f"Error getting all users: {e}")
            return []
    
    @staticmethod
    def update_user(user_id: int, updates: Dict) -> bool:
        """Update user information"""
        try:
            set_clauses = []
            params = []
            
            allowed_fields = ['username', 'role', 'is_active']
            for field, value in updates.items():
                if field in allowed_fields:
                    set_clauses.append(f"{field} = %s")
                    params.append(value)
            
            if not set_clauses:
                return False
            
            set_clauses.append("updated_at = %s")
            params.append(datetime.now())
            params.append(user_id)
            
            query = f"UPDATE admin_users SET {', '.join(set_clauses)} WHERE id = %s"
            result = DatabaseManager.execute_query(query, params, fetch_all=False)
            
            return result is not None
        except Exception as e:
            print(f"Error updating user: {e}")
            return False
    
    @staticmethod
    def change_password(user_id: int, new_password: str) -> bool:
        """Change user password"""
        try:
            user = AdminUser()
            user.set_password(new_password)
            
            query = "UPDATE admin_users SET password_hash = %s, updated_at = %s WHERE id = %s"
            result = DatabaseManager.execute_query(
                query,
                (user.password_hash, datetime.now(), user_id),
                fetch_all=False
            )
            
            return result is not None
        except Exception as e:
            print(f"Error changing password: {e}")
            return False
    
    @staticmethod
    def lock_user(user_id: int) -> bool:
        """Lock (deactivate) a user account"""
        return AuthService.update_user(user_id, {'is_active': False})
    
    @staticmethod
    def unlock_user(user_id: int) -> bool:
        """Unlock (activate) a user account"""
        return AuthService.update_user(user_id, {'is_active': True})
    
    @staticmethod
    def update_last_login(user_id: int) -> bool:
        """Update user's last login timestamp"""
        try:
            query = "UPDATE admin_users SET last_login = %s WHERE id = %s"
            result = DatabaseManager.execute_query(
                query,
                (datetime.now(), user_id),
                fetch_all=False
            )
            return result is not None
        except Exception as e:
            print(f"Error updating last login: {e}")
            return False
    
    @staticmethod
    def has_permission(user: AdminUser, permission: str) -> bool:
        """Check if user has specific permission"""
        user_permissions = AdminRole.get_role_permissions(user.role)
        return permission in user_permissions
    
    @staticmethod
    def create_super_admin() -> Optional[AdminUser]:
        """Create the initial super admin account"""
        try:
            existing_super_admin = AuthService.get_user_by_username('hmzza7')
            if existing_super_admin:
                return existing_super_admin
                
            return AuthService.create_user(
                username='hmzza7',
                password='admin@11212',
                role=AdminRole.SUPER_ADMIN
            )
        except Exception as e:
            print(f"Error creating super admin: {e}")
            return None


class SessionManager:
    """Simple session management"""
    
    _sessions = {}
    
    @classmethod
    def create_session(cls, user: AdminUser) -> str:
        """Create a new session for user"""
        session_id = secrets.token_urlsafe(32)
        cls._sessions[session_id] = {
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'created_at': datetime.now()
        }
        return session_id
    
    @classmethod
    def get_session(cls, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        return cls._sessions.get(session_id)
    
    @classmethod
    def destroy_session(cls, session_id: str) -> bool:
        """Destroy session"""
        if session_id in cls._sessions:
            del cls._sessions[session_id]
            return True
        return False
    
    @classmethod
    def get_user_from_session(cls, session_id: str) -> Optional[AdminUser]:
        """Get user from session"""
        session = cls.get_session(session_id)
        if session:
            return AuthService.get_user_by_id(session['user_id'])
        return None