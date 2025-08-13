"""
Validation utility functions for form validation and data integrity.
"""
import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom validation error"""
    pass

class Validators:
    """Utility class for validation operations"""
    
    @staticmethod
    def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
        """Validate that all required fields are present and not empty"""
        errors = []
        
        for field in required_fields:
            value = data.get(field)
            if not value or (isinstance(value, str) and not value.strip()):
                errors.append(f"{field.replace('_', ' ').title()} is required")
        
        return errors
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not email:
            return True  # Optional field
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email.strip()))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number format"""
        if not phone:
            return False
        
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        # Check if we have at least 10 digits
        return len(digits) >= 10
    
    @staticmethod
    def validate_time_format(time_str: str) -> bool:
        """Validate time format (HH:MM)"""
        if not time_str:
            return False
        
        try:
            hours, minutes = time_str.split(':')
            hour = int(hours)
            minute = int(minutes)
            return 0 <= hour <= 23 and 0 <= minute <= 59
        except (ValueError, AttributeError):
            return False
    
    @staticmethod
    def validate_date_format(date_str: str) -> bool:
        """Validate date format (YYYY-MM-DD)"""
        if not date_str:
            return False
        
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_future_date(date_str: str) -> bool:
        """Validate that date is not in the past"""
        try:
            booking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            today = date.today()
            return booking_date >= today
        except ValueError:
            return False
    
    @staticmethod
    def validate_duration(duration: Any) -> bool:
        """Validate booking duration"""
        try:
            duration_float = float(duration)
            return 0.5 <= duration_float <= 6.0  # 30 minutes to 6 hours
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_player_count(count: Any) -> bool:
        """Validate player count"""
        try:
            count_int = int(count)
            return 1 <= count_int <= 10
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_amount(amount: Any) -> bool:
        """Validate monetary amount"""
        try:
            amount_float = float(amount)
            return amount_float >= 0
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_booking_data(data: Dict[str, Any]) -> Dict[str, List[str]]:
        """Comprehensive booking data validation"""
        errors = {
            'required': [],
            'format': [],
            'business': []
        }
        
        # Required field validation
        required_fields = ['playerName', 'playerPhone', 'court', 'date', 'startTime', 'duration']
        errors['required'] = Validators.validate_required_fields(data, required_fields)
        
        # Format validation
        if data.get('playerEmail') and not Validators.validate_email(data['playerEmail']):
            errors['format'].append("Invalid email format")
        
        if data.get('playerPhone') and not Validators.validate_phone(data['playerPhone']):
            errors['format'].append("Invalid phone number format")
        
        if data.get('startTime') and not Validators.validate_time_format(data['startTime']):
            errors['format'].append("Invalid time format (use HH:MM)")
        
        if data.get('date') and not Validators.validate_date_format(data['date']):
            errors['format'].append("Invalid date format (use YYYY-MM-DD)")
        
        if data.get('duration') and not Validators.validate_duration(data['duration']):
            errors['format'].append("Duration must be between 30 minutes and 6 hours")
        
        # Business logic validation
        if data.get('date') and not Validators.validate_future_date(data['date']):
            errors['business'].append("Booking date cannot be in the past")
        
        if data.get('playerName'):
            name = data['playerName'].strip()
            if len(name) < 2:
                errors['business'].append("Player name must be at least 2 characters")
            elif len(name) > 100:
                errors['business'].append("Player name must be less than 100 characters")
        
        if data.get('totalAmount') and not Validators.validate_amount(data['totalAmount']):
            errors['business'].append("Invalid amount")
        
        return errors
    
    @staticmethod
    def get_all_errors(validation_result: Dict[str, List[str]]) -> List[str]:
        """Get all validation errors as a flat list"""
        all_errors = []
        for error_type, errors in validation_result.items():
            all_errors.extend(errors)
        return all_errors
    
    @staticmethod
    def has_errors(validation_result: Dict[str, List[str]]) -> bool:
        """Check if validation result contains any errors"""
        return any(errors for errors in validation_result.values())
    
    @staticmethod
    def validate_court_id(court_id: str) -> bool:
        """Validate court ID format"""
        if not court_id:
            return False
        
        # Court ID should be in format: sport-number (e.g., padel-1, cricket-2)
        pattern = r'^(padel|cricket|futsal|pickleball)-\d+$'
        return bool(re.match(pattern, court_id))
    
    @staticmethod
    def validate_booking_status(status: str) -> bool:
        """Validate booking status"""
        valid_statuses = ['pending_payment', 'confirmed', 'cancelled', 'completed']
        return status in valid_statuses
    
    @staticmethod
    def sanitize_input(input_str: str, max_length: Optional[int] = None) -> str:
        """Sanitize user input"""
        if not input_str:
            return ""
        
        # Remove leading/trailing whitespace
        sanitized = input_str.strip()
        
        # Remove null bytes and control characters
        sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', sanitized)
        
        # Limit length if specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized
    
    @staticmethod
    def validate_search_params(method: str, value: str = None) -> bool:
        """Validate search parameters"""
        valid_methods = ['id', 'phone', 'name', 'date']
        
        if method not in valid_methods:
            return False
        
        if method in ['id', 'phone', 'name'] and not value:
            return False
        
        if method == 'phone' and not Validators.validate_phone(value):
            return False
        
        return True