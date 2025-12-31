"""
Promo code service for managing promotional discounts and vouchers.
"""
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date
from database import DatabaseManager
from models import PromoCode

logger = logging.getLogger(__name__)

class PromoService:
    """Service for managing promo codes and discount calculations"""
    
    @staticmethod
    def get_all_promo_codes() -> List[PromoCode]:
        """Get all promo codes"""
        try:
            query = """
                SELECT * FROM promo_codes 
                ORDER BY created_at DESC
            """
            
            results = DatabaseManager.execute_query(query)
            
            if results:
                promo_list = []
                for row in results:
                    promo = PromoCode.from_dict(dict(row))
                    promo_list.append(promo)
                
                logger.info(f"Retrieved {len(promo_list)} promo codes")
                return promo_list
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting all promo codes: {e}")
            return []
    
    @staticmethod
    def get_active_promo_codes() -> List[PromoCode]:
        """Get all active promo codes"""
        try:
            query = """
                SELECT * FROM promo_codes 
                WHERE is_active = TRUE
                AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
                AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
                ORDER BY created_at DESC
            """
            
            results = DatabaseManager.execute_query(query)
            
            if results:
                promo_list = []
                for row in results:
                    promo = PromoCode.from_dict(dict(row))
                    promo_list.append(promo)
                
                logger.info(f"Retrieved {len(promo_list)} active promo codes")
                return promo_list
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting active promo codes: {e}")
            return []
    
    @staticmethod
    def get_promo_code_by_code(code: str) -> Optional[PromoCode]:
        """Get promo code by code string"""
        try:
            query = """
                SELECT * FROM promo_codes 
                WHERE UPPER(code) = UPPER(%s)
                LIMIT 1
            """
            
            result = DatabaseManager.execute_query(query, (code,), fetch_one=True)
            
            if result:
                return PromoCode.from_dict(dict(result))
            return None
            
        except Exception as e:
            logger.error(f"Error getting promo code {code}: {e}")
            return None
    
    @staticmethod
    def create_promo_code(promo_data: Dict) -> Tuple[bool, str]:
        """Create a new promo code"""
        try:
            data = promo_data or {}
            code_val = (data.get('code') or '').upper().strip()
            if not code_val:
                return False, "Promo code is required"
            discount_type = (data.get('discount_type') or 'percentage').lower()
            if discount_type not in ('percentage', 'fixed_amount'):
                discount_type = 'percentage'
            try:
                discount_value = int(data.get('discount_value', 0))
            except Exception:
                return False, "Invalid discount value"
            if discount_value <= 0:
                return False, "Discount value must be greater than 0"

            def _parse_int(val):
                try:
                    return int(val) if val not in (None, '') else None
                except Exception:
                    return None

            def _parse_date(val):
                if not val:
                    return None
                if isinstance(val, date):
                    return val
                try:
                    return datetime.strptime(val, "%Y-%m-%d").date()
                except Exception:
                    return None

            min_amount = _parse_int(data.get('min_amount'))
            max_discount = _parse_int(data.get('max_discount'))
            usage_limit = _parse_int(data.get('usage_limit'))
            valid_from = _parse_date(data.get('valid_from'))
            valid_until = _parse_date(data.get('valid_until'))

            applicable_sports = data.get('applicable_sports')
            if isinstance(applicable_sports, str):
                # accept comma-separated or JSON
                if applicable_sports.strip().startswith('['):
                    try:
                        applicable_sports = json.loads(applicable_sports)
                    except Exception:
                        applicable_sports = None
                else:
                    applicable_sports = [s.strip() for s in applicable_sports.split(',') if s.strip()]
            if isinstance(applicable_sports, list) and not applicable_sports:
                applicable_sports = None

            # Check if code already exists
            existing = PromoService.get_promo_code_by_code(code_val)
            if existing:
                return False, "Promo code already exists"
            
            insert_query = """
                INSERT INTO promo_codes 
                (code, description, discount_type, discount_value, min_amount, 
                 max_discount, usage_limit, valid_from, valid_until, applicable_sports)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            params = (
                code_val,
                data.get('description', ''),
                discount_type,
                discount_value,
                min_amount,
                max_discount,
                usage_limit,
                valid_from,
                valid_until,
                json.dumps(applicable_sports) if applicable_sports else None,
            )
            
            result = DatabaseManager.execute_query(insert_query, params, fetch_all=False)
            
            if result is not None and result > 0:
                logger.info(f"Created promo code: {promo_data.get('code')}")
                return True, f"Promo code '{promo_data.get('code')}' created successfully"
            else:
                return False, "Failed to create promo code"
                
        except Exception as e:
            logger.error(f"Error creating promo code: {e}")
            return False, f"Error: {str(e)}"
    
    @staticmethod
    def update_promo_code(code: str, promo_data: Dict) -> Tuple[bool, str]:
        """Update an existing promo code"""
        try:
            data = promo_data or {}
            discount_type = (data.get('discount_type') or 'percentage').lower()
            if discount_type not in ('percentage', 'fixed_amount'):
                discount_type = 'percentage'
            try:
                discount_value = int(data.get('discount_value', 0))
            except Exception:
                return False, "Invalid discount value"
            if discount_value <= 0:
                return False, "Discount value must be greater than 0"

            def _parse_int(val):
                try:
                    return int(val) if val not in (None, '') else None
                except Exception:
                    return None

            def _parse_date(val):
                if not val:
                    return None
                if isinstance(val, date):
                    return val
                try:
                    return datetime.strptime(val, "%Y-%m-%d").date()
                except Exception:
                    return None

            min_amount = _parse_int(data.get('min_amount'))
            max_discount = _parse_int(data.get('max_discount'))
            usage_limit = _parse_int(data.get('usage_limit'))
            valid_from = _parse_date(data.get('valid_from'))
            valid_until = _parse_date(data.get('valid_until'))

            applicable_sports = data.get('applicable_sports')
            if isinstance(applicable_sports, str):
                if applicable_sports.strip().startswith('['):
                    try:
                        applicable_sports = json.loads(applicable_sports)
                    except Exception:
                        applicable_sports = None
                else:
                    applicable_sports = [s.strip() for s in applicable_sports.split(',') if s.strip()]
            if isinstance(applicable_sports, list) and not applicable_sports:
                applicable_sports = None

            update_query = """
                UPDATE promo_codes 
                SET description = %s, discount_type = %s, discount_value = %s, 
                    min_amount = %s, max_discount = %s, usage_limit = %s,
                    valid_from = %s, valid_until = %s, applicable_sports = %s,
                    is_active = %s, updated_at = CURRENT_TIMESTAMP
                WHERE UPPER(code) = UPPER(%s)
            """
            
            params = (
                data.get('description', ''),
                discount_type,
                discount_value,
                min_amount,
                max_discount,
                usage_limit,
                valid_from,
                valid_until,
                json.dumps(applicable_sports) if applicable_sports else None,
                bool(data.get('is_active', True)),
                code
            )
            
            result = DatabaseManager.execute_query(update_query, params, fetch_all=False)
            
            if result is not None and result > 0:
                logger.info(f"Updated promo code: {code}")
                return True, f"Promo code '{code}' updated successfully"
            else:
                return False, "Promo code not found or no changes made"
                
        except Exception as e:
            logger.error(f"Error updating promo code {code}: {e}")
            return False, f"Error: {str(e)}"
    
    @staticmethod
    def delete_promo_code(code: str) -> Tuple[bool, str]:
        """Delete (deactivate) a promo code"""
        try:
            query = """
                UPDATE promo_codes 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE UPPER(code) = UPPER(%s)
            """
            
            result = DatabaseManager.execute_query(query, (code,), fetch_all=False)
            
            if result is not None and result > 0:
                logger.info(f"Deactivated promo code: {code}")
                return True, f"Promo code '{code}' deleted successfully"
            else:
                return False, "Promo code not found"
                
        except Exception as e:
            logger.error(f"Error deleting promo code {code}: {e}")
            return False, f"Error: {str(e)}"
    
    @staticmethod
    def validate_promo_code(code: str, booking_amount: int, sport: str = None) -> Tuple[bool, str, Optional[PromoCode]]:
        """Validate a promo code for a booking"""
        try:
            promo = PromoService.get_promo_code_by_code(code)
            
            if not promo:
                return False, "Invalid promo code", None
            
            if not promo.is_active:
                return False, "Promo code is not active", None
            
            # Check date validity
            today = date.today()
            if promo.valid_from and today < promo.valid_from:
                return False, "Promo code is not yet valid", None
            
            if promo.valid_until and today > promo.valid_until:
                return False, "Promo code has expired", None
            
            # Check usage limit
            if promo.usage_limit and promo.usage_count >= promo.usage_limit:
                return False, "Promo code usage limit exceeded", None
            
            # Check minimum amount
            if promo.min_amount and booking_amount < promo.min_amount:
                return False, f"Minimum booking amount of ₨{promo.min_amount:,} required", None
            
            # Check applicable sports
            if promo.applicable_sports and sport and sport not in promo.applicable_sports:
                return False, f"Promo code not applicable to {sport}", None
            
            return True, "Promo code is valid", promo
            
        except Exception as e:
            logger.error(f"Error validating promo code {code}: {e}")
            return False, "Error validating promo code", None
    
    @staticmethod
    def calculate_discount(promo: PromoCode, booking_amount: int) -> int:
        """Calculate discount amount from promo code"""
        try:
            if promo.discount_type == 'percentage':
                discount = int((booking_amount * promo.discount_value) / 100)
                # Apply maximum discount limit if set
                if promo.max_discount and discount > promo.max_discount:
                    discount = promo.max_discount
            else:  # fixed_amount
                discount = promo.discount_value
                # Don't allow discount to exceed booking amount
                if discount > booking_amount:
                    discount = booking_amount
            
            return discount
            
        except Exception as e:
            logger.error(f"Error calculating discount: {e}")
            return 0
    
    @staticmethod
    def apply_promo_code(code: str, booking_amount: int, sport: str = None) -> Tuple[bool, str, int, int]:
        """Apply promo code and return discount details"""
        try:
            is_valid, message, promo = PromoService.validate_promo_code(code, booking_amount, sport)
            
            if not is_valid:
                return False, message, 0, booking_amount
            
            discount_amount = PromoService.calculate_discount(promo, booking_amount)
            final_amount = booking_amount - discount_amount
            
            logger.info(f"Applied promo code {code}: {booking_amount} -> {final_amount} (discount: {discount_amount})")
            return True, "Promo code applied successfully", discount_amount, final_amount
            
        except Exception as e:
            logger.error(f"Error applying promo code {code}: {e}")
            return False, "Error applying promo code", 0, booking_amount
    
    @staticmethod
    def increment_usage_count(code: str) -> bool:
        """Increment the usage count for a promo code"""
        try:
            query = """
                UPDATE promo_codes 
                SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
                WHERE UPPER(code) = UPPER(%s)
            """
            
            result = DatabaseManager.execute_query(query, (code,), fetch_all=False)
            
            if result is not None and result > 0:
                logger.info(f"Incremented usage count for promo code: {code}")
                return True
            else:
                logger.warning(f"Failed to increment usage count for promo code: {code}")
                return False
                
        except Exception as e:
            logger.error(f"Error incrementing usage count for {code}: {e}")
            return False
    
    @staticmethod
    def initialize_promo_table() -> bool:
        """Initialize promo codes table if it doesn't exist"""
        try:
            create_table_query = """
                CREATE TABLE IF NOT EXISTS promo_codes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT NOT NULL,
                    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                    discount_value INTEGER NOT NULL,
                    min_amount INTEGER,
                    max_discount INTEGER,
                    usage_limit INTEGER,
                    usage_count INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    valid_from DATE,
                    valid_until DATE,
                    applicable_sports TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
                CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
                CREATE INDEX IF NOT EXISTS idx_promo_codes_dates ON promo_codes(valid_from, valid_until);
            """
            
            DatabaseManager.execute_query(create_table_query, fetch_all=False)
            logger.info("Promo codes table initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing promo codes table: {e}")
            return False
