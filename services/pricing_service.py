"""
Pricing service for managing court pricing and dynamic price calculations.
"""
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date
from database import DatabaseManager
from models import CourtPricing
from config import Config

logger = logging.getLogger(__name__)

class PricingService:
    """Service for managing court pricing and price calculations"""
    
    @staticmethod
    def get_all_pricing() -> List[CourtPricing]:
        """Get all court pricing configurations"""
        try:
            query = """
                SELECT * FROM court_pricing 
                WHERE is_active = TRUE
                ORDER BY sport, court_id
            """
            
            results = DatabaseManager.execute_query(query)
            
            if results:
                pricing_list = []
                for row in results:
                    pricing = CourtPricing(
                        id=row['id'],
                        court_id=row['court_id'],
                        court_name=row['court_name'],
                        sport=row['sport'],
                        base_price=row['base_price'],
                        peak_price=row['peak_price'],
                        off_peak_price=row['off_peak_price'],
                        weekend_price=row['weekend_price'],
                        is_active=row['is_active'],
                        effective_from=row['effective_from'],
                        effective_until=row['effective_until'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                    pricing_list.append(pricing)
                
                logger.info(f"Retrieved {len(pricing_list)} pricing configurations")
                return pricing_list
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting all pricing: {e}")
            return []
    
    @staticmethod
    def get_pricing_by_court(court_id: str) -> Optional[CourtPricing]:
        """Get pricing configuration for a specific court"""
        try:
            query = """
                SELECT * FROM court_pricing 
                WHERE court_id = %s AND is_active = TRUE
                ORDER BY created_at DESC
                LIMIT 1
            """
            
            result = DatabaseManager.execute_query(query, (court_id,), fetch_one=True)
            
            if result:
                return CourtPricing(
                    id=result['id'],
                    court_id=result['court_id'],
                    court_name=result['court_name'],
                    sport=result['sport'],
                    base_price=result['base_price'],
                    peak_price=result['peak_price'],
                    off_peak_price=result['off_peak_price'],
                    weekend_price=result['weekend_price'],
                    is_active=result['is_active'],
                    effective_from=result['effective_from'],
                    effective_until=result['effective_until'],
                    created_at=result['created_at'],
                    updated_at=result['updated_at']
                )
            return None
            
        except Exception as e:
            logger.error(f"Error getting pricing for court {court_id}: {e}")
            return None
    
    @staticmethod
    def create_or_update_pricing(pricing_data: Dict) -> Tuple[bool, str]:
        """Create or update court pricing"""
        try:
            court_id = pricing_data.get('court_id')
            if not court_id:
                return False, "Court ID is required"
            
            # Check if pricing already exists
            existing = PricingService.get_pricing_by_court(court_id)
            
            if existing:
                # Update existing pricing
                update_query = """
                    UPDATE court_pricing 
                    SET court_name = %s, sport = %s, base_price = %s, 
                        peak_price = %s, off_peak_price = %s, weekend_price = %s,
                        effective_from = %s, effective_until = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE court_id = %s AND is_active = TRUE
                """
                
                params = (
                    pricing_data.get('court_name'),
                    pricing_data.get('sport'),
                    int(pricing_data.get('base_price', 0)),
                    int(pricing_data.get('peak_price')) if pricing_data.get('peak_price') else None,
                    int(pricing_data.get('off_peak_price')) if pricing_data.get('off_peak_price') else None,
                    int(pricing_data.get('weekend_price')) if pricing_data.get('weekend_price') else None,
                    pricing_data.get('effective_from'),
                    pricing_data.get('effective_until'),
                    court_id
                )
                
                result = DatabaseManager.execute_query(update_query, params, fetch_all=False)
                
                if result is not None:
                    logger.info(f"Updated pricing for court {court_id}")
                    return True, f"Pricing updated for {court_id}"
                else:
                    return False, "Failed to update pricing"
            
            else:
                # Create new pricing
                insert_query = """
                    INSERT INTO court_pricing 
                    (court_id, court_name, sport, base_price, peak_price, off_peak_price, 
                     weekend_price, effective_from, effective_until)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                params = (
                    court_id,
                    pricing_data.get('court_name'),
                    pricing_data.get('sport'),
                    int(pricing_data.get('base_price', 0)),
                    int(pricing_data.get('peak_price')) if pricing_data.get('peak_price') else None,
                    int(pricing_data.get('off_peak_price')) if pricing_data.get('off_peak_price') else None,
                    int(pricing_data.get('weekend_price')) if pricing_data.get('weekend_price') else None,
                    pricing_data.get('effective_from'),
                    pricing_data.get('effective_until')
                )
                
                result = DatabaseManager.execute_query(insert_query, params, fetch_all=False)
                
                if result is not None:
                    logger.info(f"Created pricing for court {court_id}")
                    return True, f"Pricing created for {court_id}"
                else:
                    return False, "Failed to create pricing"
                    
        except Exception as e:
            logger.error(f"Error creating/updating pricing: {e}")
            return False, f"Error: {str(e)}"
    
    @staticmethod
    def delete_pricing(court_id: str) -> Tuple[bool, str]:
        """Delete (deactivate) pricing for a court"""
        try:
            query = """
                UPDATE court_pricing 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE court_id = %s AND is_active = TRUE
            """
            
            result = DatabaseManager.execute_query(query, (court_id,), fetch_all=False)
            
            if result is not None and result > 0:
                logger.info(f"Deactivated pricing for court {court_id}")
                return True, f"Pricing removed for {court_id}"
            else:
                return False, "No active pricing found to remove"
                
        except Exception as e:
            logger.error(f"Error deleting pricing for {court_id}: {e}")
            return False, f"Error: {str(e)}"
    
    @staticmethod
    def calculate_price(court_id: str, booking_date: date, time_slots: List[str]) -> int:
        """Calculate price for booking based on court, date, and time slots"""
        try:
            pricing = PricingService.get_pricing_by_court(court_id)
            
            if not pricing:
                # Fallback to hardcoded pricing if not found in database
                return PricingService._get_fallback_pricing(court_id, len(time_slots))
            
            # Check if booking date is within effective period
            today = date.today()
            if pricing.effective_from and booking_date < pricing.effective_from:
                return PricingService._get_fallback_pricing(court_id, len(time_slots))
            if pricing.effective_until and booking_date > pricing.effective_until:
                return PricingService._get_fallback_pricing(court_id, len(time_slots))
            
            # Determine pricing based on day and time
            is_weekend = booking_date.weekday() >= 5  # Saturday = 5, Sunday = 6
            
            total_price = 0
            for time_slot in time_slots:
                slot_price = pricing.base_price
                
                # Apply weekend pricing if available
                if is_weekend and pricing.weekend_price:
                    slot_price = pricing.weekend_price
                else:
                    # Check for peak/off-peak pricing
                    hour = int(time_slot.split(':')[0])
                    
                    # Peak hours: 5 PM - 2 AM (17:00 - 02:00 next day)
                    if ((hour >= 17) or (hour < 2)) and pricing.peak_price:
                        slot_price = pricing.peak_price
                    # Off-peak hours: 2 PM - 5 PM (14:00 - 17:00) and 2 AM - 6 AM (02:00 - 06:00)
                    elif ((14 <= hour < 17) or (2 <= hour < 6)) and pricing.off_peak_price:
                        slot_price = pricing.off_peak_price
                
                total_price += slot_price
            
            logger.info(f"Calculated price for {court_id}: {total_price} PKR for {len(time_slots)} slots")
            return total_price
            
        except Exception as e:
            logger.error(f"Error calculating price: {e}")
            return PricingService._get_fallback_pricing(court_id, len(time_slots))
    
    @staticmethod
    def _get_fallback_pricing(court_id: str, slot_count: int) -> int:
        """Fallback pricing when database pricing is not available"""
        # Use existing hardcoded prices as fallback
        fallback_prices = {
            'padel-1': 5500,
            'padel-2': 5500,
            'cricket-1': 3000,
            'cricket-2': 3000,
            'futsal-1': 2500,
            'pickleball-1': 2500
        }
        
        base_price = fallback_prices.get(court_id, 3000)  # Default 3000 if not found
        return base_price * slot_count
    
    @staticmethod
    def initialize_default_pricing() -> bool:
        """Initialize default pricing for all courts if none exists"""
        try:
            from database import DatabaseManager

            if not DatabaseManager.test_connection():
                logger.warning("Skipping default pricing init: database not reachable.")
                return False

            # Check if any pricing exists
            existing_count_query = "SELECT COUNT(*) as count FROM court_pricing WHERE is_active = TRUE"
            count_result = DatabaseManager.execute_query(existing_count_query, fetch_one=True)
            
            if count_result and count_result['count'] > 0:
                logger.info("Pricing already initialized, skipping default setup")
                return True
            
            # Initialize default pricing based on current config
            # Prices below are per 30-minute slot (used by pricing engine).
            # They correspond to per-hour "From" prices as:
            #  padel-1: 3000 → 6000/hr, padel-2: 2750 → 5500/hr
            #  cricket-1: 1500 → 3000/hr, cricket-2: 1750 → 3500/hr
            #  futsal-1: 1250 → 2500/hr, pickleball-1: 1500 → 3000/hr
            default_courts = [
                {'id': 'padel-1', 'name': 'Court 1: Purple Mondo', 'sport': 'padel', 'price': 3000},
                {'id': 'padel-2', 'name': 'Court 2: Teracotta Court', 'sport': 'padel', 'price': 2750},
                {'id': 'cricket-1', 'name': 'Court 1: 110x50ft', 'sport': 'cricket', 'price': 1500},
                {'id': 'cricket-2', 'name': 'Court 2: 130x60ft Multi', 'sport': 'cricket', 'price': 1750},
                {'id': 'futsal-1', 'name': 'Court 1: 130x60ft Multi', 'sport': 'futsal', 'price': 1250},
                {'id': 'pickleball-1', 'name': 'Court 1: Professional Setup', 'sport': 'pickleball', 'price': 1500}
            ]
            
            for court in default_courts:
                pricing_data = {
                    'court_id': court['id'],
                    'court_name': court['name'],
                    'sport': court['sport'],
                    'base_price': court['price'],
                    'peak_price': None,
                    'off_peak_price': None,
                    'weekend_price': None,
                    'effective_from': None,
                    'effective_until': None
                }
                
                success, message = PricingService.create_or_update_pricing(pricing_data)
                if success:
                    logger.info(f"Initialized pricing for {court['id']}")
                else:
                    logger.error(f"Failed to initialize pricing for {court['id']}: {message}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing default pricing: {e}")
            return False
