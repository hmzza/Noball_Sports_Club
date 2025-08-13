"""
Booking utility functions for validation and processing.
"""
import uuid
from datetime import datetime
from typing import List, Dict, Optional
import logging

from config import Config

logger = logging.getLogger(__name__)

class BookingUtils:
    """Utility class for booking-related operations"""
    
    @staticmethod
    def generate_booking_id(prefix: str = "NB") -> str:
        """Generate a unique booking ID"""
        date_str = datetime.now().strftime("%Y%m%d")
        random_str = str(uuid.uuid4())[:8].upper()
        return f"{prefix}{date_str}{random_str}"
    
    @staticmethod
    def validate_booking_data(booking_data: Dict) -> List[str]:
        """Validate booking data and return list of errors"""
        errors = []
        
        # Required fields
        required_fields = [
            "playerName", "playerPhone", "court", "date", 
            "startTime", "duration"
        ]
        
        for field in required_fields:
            if not booking_data.get(field):
                errors.append(f"{field} is required")
        
        # Validate player name
        player_name = booking_data.get("playerName", "").strip()
        if player_name and len(player_name) < 2:
            errors.append("Player name must be at least 2 characters long")
        
        # Validate phone
        player_phone = booking_data.get("playerPhone", "").strip()
        if player_phone and len(player_phone) < 10:
            errors.append("Please enter a valid phone number (at least 10 digits)")
        
        # Validate email if provided
        player_email = booking_data.get("playerEmail", "").strip()
        if player_email:
            if not BookingUtils.is_valid_email(player_email):
                errors.append("Please enter a valid email address")
        
        # Validate duration
        try:
            duration = float(booking_data.get("duration", 0))
            if duration <= 0:
                errors.append("Duration must be greater than 0")
            elif duration > 6:
                errors.append("Maximum duration is 6 hours")
        except (ValueError, TypeError):
            errors.append("Invalid duration format")
        
        # Validate date
        try:
            date_str = booking_data.get("date", "")
            if date_str:
                booking_date = datetime.strptime(date_str, "%Y-%m-%d")
                today = datetime.now().date()
                if booking_date.date() < today:
                    errors.append("Booking date cannot be in the past")
        except ValueError:
            errors.append("Invalid date format")
        
        return errors
    
    @staticmethod
    def is_valid_email(email: str) -> bool:
        """Validate email address format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def calculate_booking_amount(sport: str, duration: float) -> int:
        """Calculate booking amount based on sport and duration"""
        try:
            base_price = Config.SPORT_PRICING.get(sport.lower(), 2500)
            return int(base_price * duration)
        except Exception as e:
            logger.error(f"Error calculating booking amount: {e}")
            return 0
    
    @staticmethod
    def get_court_info(court_id: str) -> Optional[Dict]:
        """Get court information including sport and name"""
        try:
            for sport, courts in Config.COURT_CONFIG.items():
                for court in courts:
                    if court["id"] == court_id:
                        return {
                            "sport": sport,
                            "name": court["name"],
                            "id": court_id,
                            "pricing": Config.SPORT_PRICING.get(sport, 2500)
                        }
            return None
        except Exception as e:
            logger.error(f"Error getting court info: {e}")
            return None
    
    @staticmethod
    def get_sport_from_court(court_id: str) -> str:
        """Get sport type from court ID"""
        court_info = BookingUtils.get_court_info(court_id)
        return court_info["sport"] if court_info else "unknown"
    
    @staticmethod
    def get_court_name(court_id: str) -> str:
        """Get court name from court ID"""
        court_info = BookingUtils.get_court_info(court_id)
        return court_info["name"] if court_info else "Unknown Court"
    
    @staticmethod
    def is_multi_purpose_court(court_id: str) -> bool:
        """Check if court is a multi-purpose court"""
        return court_id in Config.MULTI_PURPOSE_COURTS
    
    @staticmethod
    def get_conflicting_courts(court_id: str) -> List[str]:
        """Get list of courts that conflict with the given court"""
        if not BookingUtils.is_multi_purpose_court(court_id):
            return []
        
        multi_court_type = Config.MULTI_PURPOSE_COURTS[court_id]
        return [
            k for k, v in Config.MULTI_PURPOSE_COURTS.items()
            if v == multi_court_type and k != court_id
        ]
    
    @staticmethod
    def format_booking_status(status: str) -> str:
        """Format booking status for display"""
        status_map = {
            "pending_payment": "Pending Payment",
            "confirmed": "Confirmed",
            "cancelled": "Cancelled",
            "completed": "Completed"
        }
        return status_map.get(status, status.title())
    
    @staticmethod
    def get_default_player_count(sport: str) -> int:
        """Get default player count based on sport"""
        defaults = {
            "padel": 4,
            "cricket": 6,
            "futsal": 5,
            "pickleball": 2
        }
        return defaults.get(sport.lower(), 2)
    
    @staticmethod
    def get_default_duration(sport: str) -> float:
        """Get default booking duration based on sport"""
        defaults = {
            "padel": 1.5,
            "cricket": 2.0,
            "futsal": 1.0,
            "pickleball": 1.0
        }
        return defaults.get(sport.lower(), 1.0)