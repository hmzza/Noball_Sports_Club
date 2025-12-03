"""
Schedule service for managing court schedules and availability.
"""
import json
from datetime import datetime, timedelta
from typing import Dict, List
import logging

from database import DatabaseManager
from config import Config

logger = logging.getLogger(__name__)

class ScheduleService:
    """Professional schedule service for court availability management"""
    
    @staticmethod
    def get_schedule_data(start_date: str, end_date: str, sport_filter: str = None) -> Dict:
        """Get comprehensive schedule data for date range"""
        try:
            logger.info(f"Fetching schedule: {start_date} to {end_date}, sport: {sport_filter}")

            # Rage Room is phone-only with 15-minute slots; keep it off the 30-minute grid
            if sport_filter == "rage_room":
                return {}
            
            schedule = {}
            
            # Get courts based on filter
            if sport_filter and sport_filter in Config.COURT_CONFIG:
                courts = Config.COURT_CONFIG[sport_filter]
                logger.info(f"Filtering by sport '{sport_filter}': {len(courts)} courts")
            else:
                courts = []
                for sport in ["padel", "cricket", "futsal", "pickleball"]:
                    courts.extend(Config.COURT_CONFIG[sport])
                logger.info(f"All sports: {len(courts)} total courts")
            
            # Process each date in range
            current_date = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
            
            while current_date <= end_date_obj:
                date_str = current_date.strftime("%Y-%m-%d")
                schedule[date_str] = {}
                
                # Process each court
                for court in courts:
                    court_id = court["id"]
                    schedule[date_str][court_id] = {}
                    
                    # Get bookings for this court and date
                    bookings = ScheduleService._get_court_bookings(court_id, date_str)
                    
                    # Process each booking
                    for booking in bookings:
                        try:
                            slots = booking.get("selected_slots", [])
                            
                            # Handle both JSON string and parsed data
                            if isinstance(slots, str):
                                try:
                                    slots = json.loads(slots)
                                except json.JSONDecodeError:
                                    logger.error(f"Invalid JSON in selected_slots for booking {booking.get('id')}")
                                    continue
                            
                            for slot in slots:
                                if isinstance(slot, dict) and "time" in slot:
                                    slot_time = slot["time"]
                                    
                                    # Check if this is a multi-purpose court conflict
                                    is_conflict = ScheduleService._is_multi_purpose_conflict(
                                        court_id, booking.get("court"), slot_time, date_str
                                    )
                                    
                                    # Create slot data with promo code information and both comment types
                                    slot_data = {
                                        "status": "booked-conflict" if is_conflict else ScheduleService._get_booking_status(booking),
                                        "title": booking.get("player_name", "Booked"),
                                        "subtitle": f"PKR {booking.get('total_amount', 0):,}" + (" - Multi Court" if is_conflict else ""),
                                        "bookingId": booking.get("id"),
                                        "playerName": booking.get("player_name"),
                                        "playerPhone": booking.get("player_phone"),
                                        "amount": booking.get("total_amount"),
                                        "duration": booking.get("duration"),
                                        "originalCourt": booking.get("court") if is_conflict else court_id,
                                        "customerComments": booking.get("special_requests", ""),  # Customer requests
                                        "adminComments": booking.get("admin_comments", ""),       # Admin comments
                                        "comments": booking.get("special_requests", ""),         # Legacy field for compatibility
                                        "promoCode": booking.get("promo_code"),
                                        "discountAmount": booking.get("discount_amount", 0),
                                        "originalAmount": booking.get("original_amount"),
                                    }
                                    
                                    schedule[date_str][court_id][slot_time] = slot_data
                        
                        except Exception as e:
                            logger.error(f"Error processing booking {booking.get('id', 'unknown')}: {e}")
                            continue
                    
                    # Add blocked slots for this court and date
                    blocked_slots = ScheduleService._get_blocked_slots(court_id, date_str)
                    for blocked_slot in blocked_slots:
                        slot_time = blocked_slot["time_slot"]
                        
                        # Create blocked slot data
                        slot_data = {
                            "status": "blocked",
                            "title": "Blocked",
                            "subtitle": blocked_slot["reason"],
                            "blockReason": blocked_slot["reason"],
                            "isBlocked": True,
                            "blocked_by": blocked_slot.get("blocked_by", "admin"),
                            "created_at": blocked_slot.get("created_at")
                        }
                        
                        schedule[date_str][court_id][slot_time] = slot_data
                
                current_date += timedelta(days=1)
            
            logger.info("Schedule data prepared successfully")
            return schedule
        
        except Exception as e:
            logger.error(f"Error getting schedule data: {e}")
            return {}
    
    @staticmethod
    def _get_court_bookings(court_id: str, date: str) -> List[Dict]:
        """Get all bookings affecting a specific court on a date"""
        try:
            # Direct bookings for this court - including promo code data and comments
            base_fields = """
                id, sport, court, court_name, booking_date, start_time, end_time,
                duration, selected_slots, player_name, player_phone, player_email,
                player_count, special_requests, payment_type, total_amount, status,
                payment_verified, created_at, confirmed_at, cancelled_at,
                promo_code, discount_amount, original_amount, admin_comments
            """
            
            if court_id == "pickleball-1":
                direct_query = f"""
                    SELECT {base_fields} FROM bookings 
                    WHERE status IN ('confirmed', 'pending_payment') 
                    AND booking_date = %s 
                    AND (court = %s OR sport = 'pickleball')
                    ORDER BY start_time
                """
            else:
                direct_query = f"""
                    SELECT {base_fields} FROM bookings 
                    WHERE status IN ('confirmed', 'pending_payment') 
                    AND booking_date = %s 
                    AND court = %s
                    ORDER BY start_time
                """
            
            direct_bookings = DatabaseManager.execute_query(direct_query, (date, court_id)) or []
            
            # Multi-purpose court conflicts
            conflict_bookings = []
            if court_id in Config.MULTI_PURPOSE_COURTS:
                multi_court_type = Config.MULTI_PURPOSE_COURTS[court_id]
                conflicting_courts = [
                    k for k, v in Config.MULTI_PURPOSE_COURTS.items() 
                    if v == multi_court_type and k != court_id
                ]
                
                if conflicting_courts:
                    placeholders = ",".join(["%s"] * len(conflicting_courts))
                    conflict_query = f"""
                        SELECT {base_fields} FROM bookings 
                        WHERE status IN ('confirmed', 'pending_payment') 
                        AND booking_date = %s 
                        AND court IN ({placeholders})
                        ORDER BY start_time
                    """
                    
                    conflict_params = [date] + conflicting_courts
                    conflict_bookings = DatabaseManager.execute_query(conflict_query, conflict_params) or []
            
            # Convert to list of dicts
            all_bookings = []
            for booking in direct_bookings + conflict_bookings:
                if booking:
                    booking_dict = dict(booking)
                    # Ensure selected_slots is properly handled
                    if booking_dict.get("selected_slots") and isinstance(booking_dict["selected_slots"], str):
                        try:
                            booking_dict["selected_slots"] = json.loads(booking_dict["selected_slots"])
                        except json.JSONDecodeError:
                            booking_dict["selected_slots"] = []
                    all_bookings.append(booking_dict)
            
            return all_bookings
        
        except Exception as e:
            logger.error(f"Error getting court bookings: {e}")
            return []
    
    @staticmethod
    def _is_multi_purpose_conflict(court_id: str, booking_court: str, slot_time: str, date: str) -> bool:
        """Check if this is a multi-purpose court conflict"""
        try:
            is_conflict = (
                court_id in Config.MULTI_PURPOSE_COURTS and
                booking_court != court_id and
                booking_court in Config.MULTI_PURPOSE_COURTS and
                Config.MULTI_PURPOSE_COURTS[court_id] == Config.MULTI_PURPOSE_COURTS[booking_court]
            )
            
            if is_conflict:
                logger.info(f"Multi-purpose conflict detected: {court_id} vs {booking_court} at {slot_time}")
            
            return is_conflict
        except Exception as e:
            logger.error(f"Error checking multi-purpose conflict: {e}")
            return False
    
    @staticmethod
    def _get_booking_status(booking: Dict) -> str:
        """Convert booking status to schedule status"""
        try:
            status_map = {
                "pending_payment": "booked-pending",
                "confirmed": "booked-confirmed",
                "cancelled": "booked-cancelled",
            }
            db_status = booking.get("status", "unknown")
            schedule_status = status_map.get(db_status, "booked-pending")
            
            return schedule_status
        except Exception as e:
            logger.error(f"Error getting booking status: {e}")
            return "booked-pending"
    
    @staticmethod
    def _get_blocked_slots(court_id: str, date: str) -> List[Dict]:
        """Get blocked slots for a specific court and date"""
        try:
            query = """
                SELECT time_slot, reason, blocked_by, created_at
                FROM blocked_slots 
                WHERE court = %s AND date = %s
                ORDER BY time_slot
            """
            
            results = DatabaseManager.execute_query(query, (court_id, date))
            
            if results:
                blocked_slots = []
                for row in results:
                    blocked_slots.append({
                        "time_slot": row["time_slot"].strftime("%H:%M"),
                        "reason": row["reason"],
                        "blocked_by": row["blocked_by"],
                        "created_at": row["created_at"]
                    })
                
                logger.info(f"Found {len(blocked_slots)} blocked slots for {court_id} on {date}")
                return blocked_slots
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting blocked slots for {court_id} on {date}: {e}")
            return []
