"""
Format utility functions for consistent data presentation.
"""
from datetime import datetime
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

class FormatUtils:
    """Utility class for formatting data for display"""
    
    @staticmethod
    def format_currency(amount: Any, currency: str = "PKR") -> str:
        """Format amount as currency"""
        try:
            amount_num = float(amount) if amount is not None else 0
            return f"{currency} {amount_num:,.0f}"
        except (ValueError, TypeError):
            return f"{currency} 0"
    
    @staticmethod
    def format_phone(phone: str) -> str:
        """Format phone number for display"""
        try:
            # Remove non-digit characters
            digits = ''.join(filter(str.isdigit, phone))
            
            # Format based on length
            if len(digits) >= 11:
                return f"+{digits[0]} {digits[1:4]} {digits[4:7]} {digits[7:]}"
            elif len(digits) >= 10:
                return f"{digits[:3]} {digits[3:6]} {digits[6:]}"
            else:
                return phone
        except Exception as e:
            logger.error(f"Error formatting phone: {e}")
            return phone
    
    @staticmethod
    def format_datetime_display(dt: Any) -> str:
        """Format datetime for user-friendly display"""
        try:
            if isinstance(dt, str):
                # Try to parse different datetime formats
                for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"]:
                    try:
                        dt = datetime.strptime(dt, fmt)
                        break
                    except ValueError:
                        continue
                else:
                    return str(dt)
            
            if isinstance(dt, datetime):
                return dt.strftime("%B %d, %Y at %I:%M %p")
            
            return str(dt)
        
        except Exception as e:
            logger.error(f"Error formatting datetime: {e}")
            return str(dt)
    
    @staticmethod
    def format_date_display(date: Any) -> str:
        """Format date for user-friendly display"""
        try:
            if isinstance(date, str):
                date_obj = datetime.strptime(date, "%Y-%m-%d")
            elif isinstance(date, datetime):
                date_obj = date
            else:
                return str(date)
            
            return date_obj.strftime("%A, %B %d, %Y")
        
        except Exception as e:
            logger.error(f"Error formatting date: {e}")
            return str(date)
    
    @staticmethod
    def format_time_range(start_time: str, end_time: str) -> str:
        """Format time range for display"""
        try:
            from .time_utils import TimeUtils
            start_12hr = TimeUtils.format_time_12hr(start_time)
            end_12hr = TimeUtils.format_time_12hr(end_time)
            return f"{start_12hr} - {end_12hr}"
        
        except Exception as e:
            logger.error(f"Error formatting time range: {e}")
            return f"{start_time} - {end_time}"
    
    @staticmethod
    def format_duration(hours: float) -> str:
        """Format duration for display"""
        try:
            if hours == 1:
                return "1 hour"
            elif hours < 1:
                minutes = int(hours * 60)
                return f"{minutes} minutes"
            elif hours == int(hours):
                return f"{int(hours)} hours"
            else:
                return f"{hours} hours"
        
        except Exception as e:
            logger.error(f"Error formatting duration: {e}")
            return f"{hours} hours"
    
    @staticmethod
    def format_status_badge(status: str) -> dict:
        """Get status badge information including CSS class and display text"""
        status_info = {
            "pending_payment": {
                "text": "Pending Payment",
                "class": "badge-warning",
                "color": "#ffc107"
            },
            "confirmed": {
                "text": "Confirmed",
                "class": "badge-success", 
                "color": "#28a745"
            },
            "cancelled": {
                "text": "Cancelled",
                "class": "badge-secondary",
                "color": "#6c757d"
            },
            "completed": {
                "text": "Completed",
                "class": "badge-info",
                "color": "#17a2b8"
            },
            "available": {
                "text": "Available",
                "class": "badge-light",
                "color": "#f8f9fa"
            },
            "booked-pending": {
                "text": "Pending Payment",
                "class": "badge-warning",
                "color": "#ffc107"
            },
            "booked-confirmed": {
                "text": "Confirmed",
                "class": "badge-success",
                "color": "#28a745"
            },
            "booked-conflict": {
                "text": "Multi-Court Booking",
                "class": "badge-danger",
                "color": "#dc3545"
            }
        }
        
        return status_info.get(status, {
            "text": status.replace("_", " ").title(),
            "class": "badge-secondary",
            "color": "#6c757d"
        })
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 50, suffix: str = "...") -> str:
        """Truncate text to specified length"""
        try:
            if not text or len(text) <= max_length:
                return text or ""
            
            return text[:max_length - len(suffix)] + suffix
        
        except Exception as e:
            logger.error(f"Error truncating text: {e}")
            return str(text) if text else ""
    
    @staticmethod
    def format_booking_summary(booking: dict) -> dict:
        """Format booking data for summary display"""
        try:
            from .booking_utils import BookingUtils
            
            summary = {
                "id": booking.get("id", "N/A"),
                "player_name": booking.get("player_name", "N/A"),
                "court_name": BookingUtils.get_court_name(booking.get("court", "")),
                "sport": BookingUtils.get_sport_from_court(booking.get("court", "")).title(),
                "date": FormatUtils.format_date_display(booking.get("booking_date", "")),
                "time_range": FormatUtils.format_time_range(
                    booking.get("start_time", ""), 
                    booking.get("end_time", "")
                ),
                "duration": FormatUtils.format_duration(float(booking.get("duration", 1))),
                "amount": FormatUtils.format_currency(booking.get("total_amount", 0)),
                "status": FormatUtils.format_status_badge(booking.get("status", "")),
                "created": FormatUtils.format_datetime_display(booking.get("created_at", ""))
            }
            
            return summary
        
        except Exception as e:
            logger.error(f"Error formatting booking summary: {e}")
            return {"error": "Failed to format booking data"}
    
    @staticmethod
    def format_error_message(error: Exception) -> str:
        """Format error message for user display"""
        error_msg = str(error)
        
        # Common database errors
        if "duplicate key" in error_msg.lower():
            return "This booking already exists."
        elif "foreign key" in error_msg.lower():
            return "Invalid court or booking reference."
        elif "not null" in error_msg.lower():
            return "Missing required information."
        elif "connection" in error_msg.lower():
            return "Database connection error. Please try again."
        
        # Generic fallback
        return "An error occurred while processing your request."