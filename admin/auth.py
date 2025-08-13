"""
Admin authentication and authorization utilities.
"""
from functools import wraps
from flask import session, redirect, url_for
from services.admin_service import AdminService

def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_panel.admin_login"))
        return f(*args, **kwargs)
    
    return decorated_function

def authenticate_admin(username: str, password: str) -> bool:
    """Authenticate admin credentials"""
    return AdminService.authenticate_admin(username, password)