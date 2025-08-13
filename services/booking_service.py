"""
Booking service for customer-facing booking operations.
"""
import json
import uuid
from datetime import datetime
from typing import List, Dict, Tuple
import logging

from database import DatabaseManager
from config import Config
from models import Booking, BookingStatus
from services.blocked_slot_service import BlockedSlotService
from services.pricing_service import PricingService

logger = logging.getLogger(__name__)

class BookingService:
    """Professional booking service for customer operations"""
    
    @staticmethod
    def get_booked_slots(court_id: str, date: str) -> List[str]:
        """Get all booked time slots for a specific court and date"""
        try:
            logger.info(f"Fetching booked slots for court: {court_id}, date: {date}")
            
            booked_slots = set()
            
            # Query direct bookings for this court
            direct_query = """
                SELECT selected_slots FROM bookings 
                WHERE status IN ('confirmed', 'pending_payment') 
                AND booking_date = %s 
                AND court = %s
            """
            
            direct_bookings = DatabaseManager.execute_query(direct_query, (date, court_id))
            
            if direct_bookings:
                logger.info(f"Found {len(direct_bookings)} direct bookings")
                for booking in direct_bookings:
                    slots = booking["selected_slots"]
                    if slots:
                        for slot in slots:
                            if isinstance(slot, dict) and "time" in slot:
                                booked_slots.add(slot["time"])
            
            # Check multi-purpose court conflicts
            if court_id in Config.MULTI_PURPOSE_COURTS:
                multi_court_type = Config.MULTI_PURPOSE_COURTS[court_id]
                conflicting_courts = [
                    k for k, v in Config.MULTI_PURPOSE_COURTS.items() 
                    if v == multi_court_type and k != court_id
                ]
                
                if conflicting_courts:
                    logger.info(f"Checking conflicts with courts: {conflicting_courts}")
                    
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
                        logger.info(f"Found {len(conflict_bookings)} conflicting bookings")
                        for booking in conflict_bookings:
                            slots = booking["selected_slots"]
                            if slots:
                                for slot in slots:
                                    if isinstance(slot, dict) and "time" in slot:
                                        booked_slots.add(slot["time"])
            
            # Add blocked slots to the list
            blocked_slots = BlockedSlotService.get_blocked_slots(court_id, date)
            if blocked_slots:
                logger.info(f"Found {len(blocked_slots)} blocked slots")
                booked_slots.update(blocked_slots)
            
            result = sorted(list(booked_slots))
            logger.info(f"Total unavailable slots (booked + blocked): {len(result)}")
            return result
        
        except Exception as e:
            logger.error(f"Error fetching booked slots: {e}")
            return []
    
    @staticmethod
    def check_slot_availability(court_id: str, date: str, selected_slots: List[Dict]) -> Tuple[bool, List[str]]:
        """Check if selected slots are still available"""
        try:
            booked_slots = BookingService.get_booked_slots(court_id, date)
            slot_times = [slot["time"] for slot in selected_slots]
            
            conflicts = [slot for slot in slot_times if slot in booked_slots]
            return len(conflicts) == 0, conflicts
        
        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            return False, []
    
    @staticmethod
    def create_booking(booking_data: Dict) -> str:
        """Create a new booking with validation"""
        try:
            # Validate required fields
            required_fields = [
                "sport", "court", "courtName", "date", "startTime", 
                "endTime", "duration", "selectedSlots", "playerName", "playerPhone"
            ]
            
            for field in required_fields:
                if not booking_data.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            # Generate booking ID
            booking_id = BookingService._generate_booking_id()
            
            # Calculate total amount using dynamic pricing
            original_amount = BookingService.calculate_booking_price(
                booking_data["court"], 
                booking_data["date"], 
                booking_data["selectedSlots"]
            )
            
            # Handle promo code if provided
            promo_code = booking_data.get("promoCode", "").strip()
            discount_amount = booking_data.get("discountAmount", 0)
            final_amount = booking_data.get("totalAmount", original_amount)
            
            # Store original amount before discount
            original_booking_amount = original_amount
            
            # Increment promo code usage if promo was applied
            if promo_code and discount_amount > 0:
                from services.promo_service import PromoService
                PromoService.increment_usage_count(promo_code)
                logger.info(f"Promo code {promo_code} used, discount: {discount_amount}")
            
            # Use the final amount (after promo discount)
            booking_data["totalAmount"] = final_amount
            
            # Prepare insert query
            insert_query = """
                INSERT INTO bookings (
                    id, sport, court, court_name, booking_date, start_time, end_time,
                    duration, selected_slots, player_name, player_phone, player_email,
                    player_count, special_requests, payment_type, total_amount, 
                    promo_code, discount_amount, original_amount, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            
            params = (
                booking_id,
                booking_data["sport"],
                booking_data["court"],
                booking_data["courtName"],
                booking_data["date"],
                booking_data["startTime"],
                booking_data["endTime"],
                booking_data["duration"],
                json.dumps(booking_data["selectedSlots"]),
                booking_data["playerName"],
                booking_data["playerPhone"],
                booking_data.get("playerEmail", ""),
                booking_data.get("playerCount", "2"),
                booking_data.get("specialRequests", ""),
                booking_data.get("paymentType", "advance"),
                final_amount,
                promo_code if promo_code else None,
                discount_amount,
                original_booking_amount,
                BookingStatus.PENDING_PAYMENT,
            )
            
            result = DatabaseManager.execute_query(insert_query, params, fetch_all=False)
            
            if result is not None:
                # Log the booking creation activity
                try:
                    from services.activity_service import ActivityService
                    ActivityService.log_booking_created(booking_id, booking_data["playerName"], 
                                                      f"Customer created booking - Court: {booking_data['courtName']}, Duration: {booking_data['duration']}h")
                except Exception as log_error:
                    logger.warning(f"Failed to log booking creation: {log_error}")
                
                logger.info(f"Successfully created booking: {booking_id}")
                return booking_id
            else:
                raise Exception("Failed to insert booking")
        
        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            raise e
    
    @staticmethod
    def get_booking_by_id(booking_id: str) -> Dict:
        """Get booking details by ID"""
        try:
            query = "SELECT * FROM bookings WHERE id = %s"
            result = DatabaseManager.execute_query(query, (booking_id,), fetch_one=True)
            
            if result:
                return dict(result)
            return {}
        
        except Exception as e:
            logger.error(f"Error fetching booking {booking_id}: {e}")
            return {}
    
    @staticmethod
    def update_booking_status(booking_id: str, status: str) -> bool:
        """Update booking status"""
        try:
            if status not in BookingStatus.get_all_statuses():
                raise ValueError(f"Invalid status: {status}")
            
            query = "UPDATE bookings SET status = %s WHERE id = %s"
            result = DatabaseManager.execute_query(query, (status, booking_id), fetch_all=False)
            
            if result is not None:
                logger.info(f"Updated booking {booking_id} status to {status}")
                return True
            return False
        
        except Exception as e:
            logger.error(f"Error updating booking status: {e}")
            return False
    
    @staticmethod
    def calculate_booking_price(court_id: str, booking_date: str, selected_slots: List[Dict]) -> int:
        """Calculate total booking price using dynamic pricing"""
        try:
            from datetime import datetime
            
            # Convert booking date string to date object
            booking_date_obj = datetime.strptime(booking_date, "%Y-%m-%d").date()
            
            # Extract time slots from selected slots
            time_slots = [slot.get("time") for slot in selected_slots if slot.get("time")]
            
            # Use pricing service to calculate price
            total_price = PricingService.calculate_price(court_id, booking_date_obj, time_slots)
            
            logger.info(f"Calculated price for {court_id} on {booking_date}: {total_price} PKR for {len(time_slots)} slots")
            return total_price
            
        except Exception as e:
            logger.error(f"Error calculating booking price: {e}")
            # Fallback to hardcoded pricing if calculation fails
            return BookingService._get_fallback_price(court_id, len(selected_slots))
    
    @staticmethod
    def _get_fallback_price(court_id: str, slot_count: int) -> int:
        """Fallback pricing method using hardcoded values"""
        # Use existing hardcoded prices as fallback
        fallback_prices = {
            'padel-1': 5500,
            'padel-2': 5500, 
            'cricket-1': 3000,
            'cricket-2': 3000,
            'futsal-1': 2500,
            'pickleball-1': 2500
        }
        
        base_price = fallback_prices.get(court_id, 3000)
        return base_price * slot_count
    
    @staticmethod
    def _generate_booking_id() -> str:
        """Generate unique booking ID"""
        date_str = datetime.now().strftime("%Y%m%d")
        random_str = str(uuid.uuid4())[:8].upper()
        return f"NB{date_str}{random_str}"