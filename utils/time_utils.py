"""
Time utility functions for booking and scheduling operations.
"""
from datetime import datetime, timedelta
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

class TimeUtils:
    """Utility class for time-related operations"""
    
    @staticmethod
    def calculate_end_time(start_time: str, duration: float) -> str:
        """Calculate end time based on start time and duration in hours"""
        try:
            # Parse start time
            start_hour, start_minute = map(int, start_time.split(':'))
            
            # Convert to minutes
            start_minutes = start_hour * 60 + start_minute
            
            # Add duration (in hours) converted to minutes
            end_minutes = start_minutes + int(duration * 60)
            
            # Convert back to hours and minutes
            end_hour = (end_minutes // 60) % 24
            end_min = end_minutes % 60
            
            return f"{end_hour:02d}:{end_min:02d}"
        
        except Exception as e:
            logger.error(f"Error calculating end time: {e}")
            return start_time
    
    @staticmethod
    def generate_time_slots(start_time: str, duration: float, slot_minutes: int = 30) -> List[dict]:
        """Generate time slots for a booking duration"""
        try:
            slots = []
            start_hour, start_minute = map(int, start_time.split(':'))
            start_minutes = start_hour * 60 + start_minute
            
            # Calculate total slots needed
            total_slots = int(duration * 60 / slot_minutes)
            
            for i in range(total_slots):
                slot_minutes_total = start_minutes + (i * slot_minutes)
                slot_hour = (slot_minutes_total // 60) % 24
                slot_min = slot_minutes_total % 60
                
                time_str = f"{slot_hour:02d}:{slot_min:02d}"
                slots.append({
                    "time": time_str,
                    "index": i
                })
            
            return slots
        
        except Exception as e:
            logger.error(f"Error generating time slots: {e}")
            return [{"time": start_time, "index": 0}]
    
    @staticmethod
    def format_time_12hr(time_24hr: str) -> str:
        """Convert 24-hour format to 12-hour format"""
        try:
            hour, minute = map(int, time_24hr.split(':'))
            ampm = "AM" if hour < 12 else "PM"
            display_hour = 12 if hour == 0 else hour if hour <= 12 else hour - 12
            return f"{display_hour}:{minute:02d} {ampm}"
        
        except Exception as e:
            logger.error(f"Error formatting time: {e}")
            return time_24hr
    
    @staticmethod
    def format_date_readable(date_str: str) -> str:
        """Format date string to readable format"""
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            return date_obj.strftime("%A, %B %d, %Y")
        
        except Exception as e:
            logger.error(f"Error formatting date: {e}")
            return date_str
    
    @staticmethod
    def is_valid_time_slot(time_str: str) -> bool:
        """Validate if time string is valid"""
        try:
            hour, minute = map(int, time_str.split(':'))
            return 0 <= hour <= 23 and 0 <= minute <= 59
        
        except Exception as e:
            logger.error(f"Error validating time: {e}")
            return False
    
    @staticmethod
    def get_week_date_range(date: datetime) -> Tuple[datetime, datetime]:
        """Get the start and end dates for the week containing the given date"""
        # Monday is 0, Sunday is 6
        start_date = date - timedelta(days=date.weekday())
        end_date = start_date + timedelta(days=6)
        return start_date, end_date
    
    @staticmethod
    def time_slots_overlap(slots1: List[dict], slots2: List[dict]) -> List[str]:
        """Check if two sets of time slots overlap"""
        times1 = {slot["time"] for slot in slots1 if "time" in slot}
        times2 = {slot["time"] for slot in slots2 if "time" in slot}
        overlaps = times1.intersection(times2)
        return list(overlaps)