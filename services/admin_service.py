"""
Admin service for administrative operations and booking management.
"""
import json
from datetime import datetime
from typing import List, Dict, Tuple
import logging

from database import DatabaseManager
from config import Config
from models import Booking, BookingStatus
from utils.time_utils import TimeUtils
from utils.booking_utils import BookingUtils
from utils.format_utils import FormatUtils

logger = logging.getLogger(__name__)

class AdminService:
    """Professional admin service for administrative operations"""
    
    @staticmethod
    def authenticate_admin(username: str, password: str) -> bool:
        """Authenticate admin login"""
        return (username == Config.ADMIN_USERNAME and 
                password == Config.ADMIN_PASSWORD)
    
    @staticmethod
    def get_dashboard_stats() -> Dict:
        """Get dashboard statistics"""
        try:
            # Get current month stats only
            stats_query = """
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_payment,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
                FROM bookings
                WHERE EXTRACT(MONTH FROM booking_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM booking_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            """
            
            result = DatabaseManager.execute_query(stats_query, fetch_one=True)
            stats = dict(result) if result else {
                "total_bookings": 0,
                "pending_payment": 0,
                "confirmed": 0,
                "cancelled": 0,
                "revenue": 0,
            }
            
            return stats
        
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            return {}
    
    @staticmethod
    def get_recent_bookings(limit: int = 10) -> List[Dict]:
        """Get recent bookings for dashboard"""
        try:
            query = """
                SELECT 
                    id, sport, court, court_name, booking_date, start_time, end_time,
                    duration, player_name, player_phone, total_amount, status, created_at,
                    promo_code, discount_amount, original_amount, special_requests, admin_comments
                FROM bookings 
                ORDER BY created_at DESC 
                LIMIT %s
            """
            
            bookings = DatabaseManager.execute_query(query, (limit,)) or []
            return [AdminService._format_booking_for_display(dict(booking)) for booking in bookings]
        
        except Exception as e:
            logger.error(f"Error getting recent bookings: {e}")
            return []
    
    @staticmethod
    def get_all_bookings() -> List[Dict]:
        """Get all bookings with proper formatting"""
        try:
            query = """
                SELECT 
                    id, sport, court, court_name, booking_date, start_time, end_time,
                    duration, selected_slots, player_name, player_phone, player_email,
                    player_count, special_requests, payment_type, total_amount, status,
                    payment_verified, created_at, confirmed_at, cancelled_at,
                    promo_code, discount_amount, original_amount, admin_comments
                FROM bookings 
                ORDER BY created_at DESC
            """
            
            raw_bookings = DatabaseManager.execute_query(query) or []
            
            bookings = []
            for booking in raw_bookings:
                try:
                    formatted_booking = AdminService._format_booking_for_display(dict(booking))
                    bookings.append(formatted_booking)
                except Exception as e:
                    logger.error(f"Error formatting booking {booking.get('id', 'unknown')}: {e}")
                    # Add the booking anyway with basic formatting
                    booking_dict = dict(booking)
                    booking_dict["formatted_time"] = "Time formatting error"
                    booking_dict["createdDateTime"] = "N/A"
                    bookings.append(booking_dict)
            
            return bookings
        
        except Exception as e:
            logger.error(f"Error getting all bookings: {e}")
            return []
    
    @staticmethod
    def search_bookings(method: str, value: str = None, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Search bookings by various criteria"""
        try:
            # Updated queries to explicitly select needed fields including promo code data and comments
            base_fields = """
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, selected_slots, player_name, player_phone, player_email,
                player_count, special_requests, payment_type, total_amount, status,
                payment_verified, created_at, confirmed_at, cancelled_at,
                promo_code, discount_amount, original_amount, admin_comments
            """
            
            if method == "id":
                query = f"SELECT {base_fields} FROM bookings WHERE id = %s"
                params = (value,)
            elif method == "phone":
                query = f"SELECT {base_fields} FROM bookings WHERE player_phone LIKE %s ORDER BY created_at DESC"
                params = (f"%{value}%",)
            elif method == "name":
                query = f"SELECT {base_fields} FROM bookings WHERE player_name ILIKE %s ORDER BY created_at DESC"
                params = (f"%{value}%",)
            elif method == "date":
                query = f"SELECT {base_fields} FROM bookings WHERE booking_date BETWEEN %s AND %s ORDER BY booking_date DESC, start_time DESC"
                params = (start_date, end_date)
            else:
                raise ValueError(f"Invalid search method: {method}")
            
            bookings = DatabaseManager.execute_query(query, params) or []
            
            # Format bookings for frontend
            formatted_bookings = []
            for booking in bookings:
                try:
                    formatted_booking = AdminService._format_booking_for_search(dict(booking))
                    formatted_bookings.append(formatted_booking)
                except Exception as e:
                    logger.error(f"Error formatting booking {booking.get('id', 'unknown')}: {e}")
                    # Add basic booking info even if formatting fails
                    formatted_bookings.append({
                        "id": str(booking.get("id", "N/A")),
                        "playerName": str(booking.get("player_name", "N/A")),
                        "status": str(booking.get("status", "unknown")),
                        "formatted_time": "Error formatting time",
                    })
            
            return formatted_bookings
        
        except Exception as e:
            logger.error(f"Error searching bookings: {e}")
            return []
    
    @staticmethod
    def create_admin_booking(booking_data: Dict) -> str:
        """Create booking from admin panel with conflict checking"""
        try:
            # Calculate end time using utility
            start_time = booking_data["startTime"]
            duration = float(booking_data["duration"])
            end_time = TimeUtils.calculate_end_time(start_time, duration)
            
            # Get sport and calculate pricing using utilities
            sport = BookingUtils.get_sport_from_court(booking_data["court"])
            court_name = BookingUtils.get_court_name(booking_data["court"])
            
            # Create selected_slots first for conflict checking
            selected_slots = TimeUtils.generate_time_slots(start_time, duration)
            
            # Check for slot conflicts before creating booking
            conflicts = AdminService._check_booking_conflicts(
                booking_data["court"], 
                booking_data["date"], 
                selected_slots
            )
            
            if conflicts:
                conflict_times = [slot["time"] for slot in conflicts]
                raise ValueError(f"Booking conflicts found at times: {', '.join(conflict_times)}")
            
            # Generate booking ID using utility
            booking_id = BookingUtils.generate_booking_id()
            
            insert_query = """
                INSERT INTO bookings (
                    id, sport, court, court_name, booking_date, start_time, end_time,
                    duration, selected_slots, player_name, player_phone, player_email,
                    player_count, special_requests, payment_type, total_amount, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            
            params = (
                booking_id,
                sport,
                booking_data["court"],
                court_name,
                booking_data["date"],
                start_time,
                end_time,
                duration,
                json.dumps(selected_slots),
                booking_data["playerName"],
                booking_data["playerPhone"],
                booking_data.get("playerEmail", ""),
                booking_data.get("playerCount", "2"),
                booking_data.get("specialRequests", ""),
                "full",
                booking_data.get("totalAmount", BookingUtils.calculate_booking_amount(sport, duration)),
                booking_data.get("status", "confirmed"),
            )
            
            result = DatabaseManager.execute_query(insert_query, params, fetch_all=False)
            
            if result is not None:
                # Log the booking creation activity
                try:
                    from services.activity_service import ActivityService
                    ActivityService.log_booking_created(booking_id, booking_data["playerName"], 
                                                      f"Admin created booking - Court: {booking_data['court']}, Duration: {duration}h")
                except Exception as log_error:
                    logger.warning(f"Failed to log booking creation: {log_error}")
                
                logger.info(f"Admin created booking: {booking_id}")
                return booking_id
            else:
                raise Exception("Failed to create booking")
        
        except Exception as e:
            logger.error(f"Error creating admin booking: {e}")
            raise e
    
    @staticmethod
    def update_booking(booking_data: Dict) -> bool:
        """Update existing booking"""
        try:
            booking_id = booking_data["bookingId"]
            
            # Build update query dynamically
            update_fields = []
            update_values = []
            
            field_mapping = {
                "sport": "sport",
                "court": "court",
                "courtName": "court_name",
                "date": "booking_date",
                "startTime": "start_time",
                "endTime": "end_time",
                "duration": "duration",
                "playerName": "player_name",
                "playerPhone": "player_phone",
                "playerEmail": "player_email",
                "playerCount": "player_count",
                "specialRequests": "special_requests",
                "adminComments": "admin_comments",
                "totalAmount": "total_amount",
                "status": "status",
            }
            
            for frontend_field, db_field in field_mapping.items():
                if frontend_field in booking_data:
                    update_fields.append(f"{db_field} = %s")
                    update_values.append(booking_data[frontend_field])
            
            if not update_fields:
                raise ValueError("No fields to update")
            
            update_values.append(booking_id)
            
            update_query = f"""
                UPDATE bookings 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            
            result = DatabaseManager.execute_query(update_query, update_values, fetch_all=False)
            
            if result is not None:
                # Log the booking update activity
                try:
                    from services.activity_service import ActivityService
                    player_name = booking_data.get("playerName", "Unknown")
                    ActivityService.log_booking_updated(booking_id, player_name, 
                                                      f"Updated booking fields: {', '.join(update_fields[:-1])}")
                except Exception as log_error:
                    logger.warning(f"Failed to log booking update: {log_error}")
                
                logger.info(f"Updated booking: {booking_id}")
                return True
            else:
                raise Exception("Failed to update booking")
        
        except Exception as e:
            logger.error(f"Error updating booking: {e}")
            raise e
    
    @staticmethod
    def perform_booking_action(booking_id: str, action: str) -> bool:
        """Perform action on booking (confirm, cancel, decline)"""
        try:
            # Get booking details for logging
            booking_query = "SELECT player_name FROM bookings WHERE id = %s"
            booking_result = DatabaseManager.execute_query(booking_query, (booking_id,), fetch_one=True)
            customer_name = booking_result['player_name'] if booking_result else 'Unknown'
            
            action_queries = {
                "confirm": """
                    UPDATE bookings 
                    SET status = 'confirmed', payment_verified = TRUE, confirmed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
                "cancel": """
                    UPDATE bookings 
                    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
                "decline": """
                    UPDATE bookings 
                    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
            }
            
            if action not in action_queries:
                raise ValueError(f"Invalid action: {action}")
            
            result = DatabaseManager.execute_query(action_queries[action], (booking_id,), fetch_all=False)
            
            if result is not None:
                # Log the activity
                from services.activity_service import ActivityService
                if action == "confirm":
                    ActivityService.log_booking_confirmed(booking_id, customer_name)
                elif action in ["cancel", "decline"]:
                    ActivityService.log_booking_cancelled(booking_id, customer_name, 
                                                        f"Action: {action}")
                
                logger.info(f"Performed action '{action}' on booking: {booking_id}")
                return True
            else:
                raise Exception(f"Failed to {action} booking")
        
        except Exception as e:
            logger.error(f"Error performing booking action: {e}")
            raise e
    
    @staticmethod
    def delete_booking(booking_id: str) -> bool:
        """Delete booking"""
        try:
            delete_query = "DELETE FROM bookings WHERE id = %s"
            result = DatabaseManager.execute_query(delete_query, (booking_id,), fetch_all=False)
            
            if result is not None:
                logger.info(f"Deleted booking: {booking_id}")
                return True
            else:
                raise Exception("Failed to delete booking")
        
        except Exception as e:
            logger.error(f"Error deleting booking: {e}")
            raise e
    
    # Helper methods
    @staticmethod
    def _format_booking_for_display(booking: Dict) -> Dict:
        """Format booking data for display"""
        try:
            # Format dates and times
            booking_date = booking.get("booking_date")
            start_time = booking.get("start_time")
            end_time = booking.get("end_time")
            created_at = booking.get("created_at")
            
            formatted_booking = dict(booking)
            
            # Format display date
            if booking_date:
                if isinstance(booking_date, str):
                    date_obj = datetime.strptime(booking_date, "%Y-%m-%d")
                else:
                    date_obj = booking_date
                formatted_booking["display_date"] = date_obj.strftime("%Y-%m-%d")
            
            # Format time display
            formatted_booking["formatted_time"] = AdminService._format_booking_time_display(
                booking_date, start_time, end_time
            )
            
            # Format created datetime
            if created_at:
                if isinstance(created_at, str):
                    created_obj = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                else:
                    created_obj = created_at
                formatted_booking["createdDateTime"] = created_obj.strftime("%b %d, %Y %I:%M %p")
            
            # Add JavaScript-expected field aliases
            formatted_booking["date"] = formatted_booking.get("booking_date", "")
            if start_time:
                # Convert time to simple format (HH:MM)
                if isinstance(start_time, str):
                    # If it's already a string like "16:00:00", convert to "16:00"
                    formatted_booking["time"] = start_time[:5] if len(start_time) >= 5 else start_time
                else:
                    formatted_booking["time"] = start_time.strftime("%H:%M")
            
            return formatted_booking
        
        except Exception as e:
            logger.error(f"Error formatting booking: {e}")
            return booking
    
    @staticmethod
    def _format_booking_for_search(booking: Dict) -> Dict:
        """Format booking data for search results"""
        try:
            booking_dict = dict(booking)
            
            # Format booking for frontend
            formatted_booking = {
                "id": booking_dict.get("id"),
                "sport": booking_dict.get("sport"),
                "court": booking_dict.get("court"),
                "courtName": booking_dict.get("court_name"),
                "playerName": booking_dict.get("player_name"),
                "playerPhone": booking_dict.get("player_phone"),
                "playerEmail": booking_dict.get("player_email", ""),
                "totalAmount": booking_dict.get("total_amount", 0),
                "status": booking_dict.get("status"),
                "duration": float(booking_dict.get("duration", 1.0)) if booking_dict.get("duration") else 1.0,
                "special_requests": booking_dict.get("special_requests"),
                "admin_comments": booking_dict.get("admin_comments"),
                "promo_code": booking_dict.get("promo_code"),
                "discount_amount": booking_dict.get("discount_amount"),
                "original_amount": booking_dict.get("original_amount"),
                "player_count": booking_dict.get("player_count"),
                "payment_type": booking_dict.get("payment_type"),
            }
            
            # Format dates and times
            if booking_dict.get("booking_date"):
                if hasattr(booking_dict["booking_date"], "strftime"):
                    formatted_booking["date"] = booking_dict["booking_date"].strftime("%Y-%m-%d")
                else:
                    formatted_booking["date"] = str(booking_dict["booking_date"])
            
            if booking_dict.get("start_time"):
                if hasattr(booking_dict["start_time"], "strftime"):
                    formatted_booking["startTime"] = booking_dict["start_time"].strftime("%H:%M")
                else:
                    formatted_booking["startTime"] = str(booking_dict["start_time"])
            
            if booking_dict.get("end_time"):
                if hasattr(booking_dict["end_time"], "strftime"):
                    formatted_booking["endTime"] = booking_dict["end_time"].strftime("%H:%M")
                else:
                    formatted_booking["endTime"] = str(booking_dict["end_time"])
            
            if booking_dict.get("created_at"):
                if hasattr(booking_dict["created_at"], "strftime"):
                    formatted_booking["createdDateTime"] = booking_dict["created_at"].strftime("%b %d, %Y %I:%M %p")
                else:
                    formatted_booking["createdDateTime"] = str(booking_dict["created_at"])
            
            # Handle selected_slots JSON
            if booking_dict.get("selected_slots"):
                try:
                    if isinstance(booking_dict["selected_slots"], str):
                        formatted_booking["selectedSlots"] = json.loads(booking_dict["selected_slots"])
                    else:
                        formatted_booking["selectedSlots"] = booking_dict["selected_slots"]
                except (json.JSONDecodeError, TypeError):
                    formatted_booking["selectedSlots"] = []
            else:
                formatted_booking["selectedSlots"] = []
            
            # Create formatted time display
            if formatted_booking.get("date") and formatted_booking.get("startTime") and formatted_booking.get("endTime"):
                formatted_booking["formatted_time"] = AdminService._format_booking_time_display(
                    formatted_booking["date"], formatted_booking["startTime"], formatted_booking["endTime"]
                )
            
            return formatted_booking
        
        except Exception as e:
            logger.error(f"Error formatting booking for search: {e}")
            return {"id": str(booking.get("id", "N/A")), "error": "Formatting failed"}
    
    @staticmethod
    def _format_booking_time_display(booking_date, start_time, end_time) -> str:
        """Helper function to format booking time for display"""
        try:
            if not all([booking_date, start_time, end_time]):
                return "Time not available"
            
            # Format date
            if isinstance(booking_date, str):
                date_obj = datetime.strptime(booking_date, "%Y-%m-%d")
            else:
                date_obj = booking_date
            
            formatted_date = date_obj.strftime("%a, %b %d")
            
            # Format times to 12-hour format
            def format_time_12hr(time_obj):
                if isinstance(time_obj, str):
                    if "." in time_obj:
                        time_obj = time_obj.split(".")[0]
                    if len(time_obj.split(":")) == 3:
                        time_obj = datetime.strptime(time_obj, "%H:%M:%S").time()
                    else:
                        time_obj = datetime.strptime(time_obj, "%H:%M").time()
                
                hour = time_obj.hour
                minute = time_obj.minute
                ampm = "AM" if hour < 12 else "PM"
                display_hour = 12 if hour == 0 else hour if hour <= 12 else hour - 12
                return f"{display_hour}:{minute:02d} {ampm}"
            
            start_12hr = format_time_12hr(start_time)
            end_12hr = format_time_12hr(end_time)
            
            return f'<div class="time-display">{formatted_date}</div><div style="font-weight: 600; color: #28a745;">{start_12hr} - {end_12hr}</div>'
        
        except Exception as e:
            logger.error(f"Error formatting time display: {e}")
            return f"{start_time} - {end_time}"
    
    # Legacy utility methods removed - now using utils package
    
    @staticmethod
    def _check_booking_conflicts(court_id: str, date: str, selected_slots: List[Dict]) -> List[Dict]:
        """Check for booking conflicts in selected time slots"""
        try:
            conflicts = []
            
            # Get all existing booked slots for this court and date
            existing_slots = AdminService._get_existing_booked_slots(court_id, date)
            
            # Check each selected slot for conflicts
            for slot in selected_slots:
                slot_time = slot["time"]
                if slot_time in existing_slots:
                    conflicts.append(slot)
            
            return conflicts
        
        except Exception as e:
            logger.error(f"Error checking booking conflicts: {e}")
            return []
    
    @staticmethod
    def _get_existing_booked_slots(court_id: str, date: str) -> List[str]:
        """Get existing booked slots for conflict checking"""
        try:
            booked_slots = set()
            
            # Direct bookings for this court
            direct_query = """
                SELECT selected_slots FROM bookings 
                WHERE status IN ('confirmed', 'pending_payment') 
                AND booking_date = %s 
                AND court = %s
            """
            
            direct_bookings = DatabaseManager.execute_query(direct_query, (date, court_id))
            if direct_bookings:
                for booking in direct_bookings:
                    slots_data = booking["selected_slots"]
                    if isinstance(slots_data, str):
                        import json
                        slots_data = json.loads(slots_data)
                    
                    if isinstance(slots_data, list):
                        for slot in slots_data:
                            if isinstance(slot, dict) and "time" in slot:
                                booked_slots.add(slot["time"])
            
            # Multi-purpose court conflicts
            if court_id in Config.MULTI_PURPOSE_COURTS:
                multi_court_type = Config.MULTI_PURPOSE_COURTS[court_id]
                conflicting_courts = [
                    k for k, v in Config.MULTI_PURPOSE_COURTS.items() 
                    if v == multi_court_type and k != court_id
                ]
                
                if conflicting_courts:
                    placeholders = ",".join(["%s"] * len(conflicting_courts))
                    conflict_query = f"""
                        SELECT selected_slots FROM bookings 
                        WHERE status IN ('confirmed', 'pending_payment') 
                        AND booking_date = %s 
                        AND court IN ({placeholders})
                    """
                    
                    conflict_params = [date] + conflicting_courts
                    conflict_bookings = DatabaseManager.execute_query(conflict_query, conflict_params)
                    
                    if conflict_bookings:
                        for booking in conflict_bookings:
                            slots_data = booking["selected_slots"]
                            if isinstance(slots_data, str):
                                import json
                                slots_data = json.loads(slots_data)
                            
                            if isinstance(slots_data, list):
                                for slot in slots_data:
                                    if isinstance(slot, dict) and "time" in slot:
                                        booked_slots.add(slot["time"])
            
            return list(booked_slots)
        
        except Exception as e:
            logger.error(f"Error getting existing booked slots: {e}")
            return []
    
    # Booking ID generation moved to BookingUtils