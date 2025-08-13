"""
Authentication middleware and decorators
"""
from functools import wraps
from flask import request, jsonify, session, redirect, url_for, g
from services.auth_service import AuthService, SessionManager
from models import AdminRole


def require_auth(f):
    """Decorator that requires authentication for admin routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = session.get('admin_session_id')
        if not session_id:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('admin_panel.login'))
        
        user = SessionManager.get_user_from_session(session_id)
        if not user or not user.is_active:
            session.pop('admin_session_id', None)
            if request.is_json:
                return jsonify({'error': 'Invalid session'}), 401
            return redirect(url_for('admin_panel.login'))
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function


def require_permission(permission):
    """Decorator that requires specific permission"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                if request.is_json:
                    return jsonify({'error': 'Authentication required'}), 401
                return redirect(url_for('admin_panel.login'))
            
            if not AuthService.has_permission(g.current_user, permission):
                if request.is_json:
                    return jsonify({'error': 'Insufficient permissions'}), 403
                return redirect(url_for('admin_panel.unauthorized'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_role(*allowed_roles):
    """Decorator that requires specific role(s)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                if request.is_json:
                    return jsonify({'error': 'Authentication required'}), 401
                return redirect(url_for('admin_panel.login'))
            
            if g.current_user.role not in allowed_roles:
                if request.is_json:
                    return jsonify({'error': 'Insufficient permissions'}), 403
                return redirect(url_for('admin_panel.unauthorized'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def super_admin_only(f):
    """Decorator that only allows super admins"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user') or not g.current_user:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('admin_panel.login'))
        
        if g.current_user.role != AdminRole.SUPER_ADMIN:
            if request.is_json:
                return jsonify({'error': 'Super admin access required'}), 403
            return redirect(url_for('admin_panel.unauthorized'))
        
        return f(*args, **kwargs)
    return decorated_function


def admin_or_higher(f):
    """Decorator that allows admin and super admin roles"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user') or not g.current_user:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('admin_panel.login'))
        
        allowed_roles = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN]
        if g.current_user.role not in allowed_roles:
            if request.is_json:
                return jsonify({'error': 'Admin access required'}), 403
            return redirect(url_for('admin_panel.unauthorized'))
        
        return f(*args, **kwargs)
    return decorated_function


def check_current_user():
    """Set current user in g if session exists"""
    session_id = session.get('admin_session_id')
    if session_id:
        user = SessionManager.get_user_from_session(session_id)
        if user and user.is_active:
            g.current_user = user
            return user
    g.current_user = None
    return None