"""
Blocked slot service for managing court slot blocking functionality.
"""
import logging
from typing import List, Dict, Optional, Tuple
from database import DatabaseManager
from models import BlockedSlot
from datetime import datetime

logger = logging.getLogger(__name__)

class BlockedSlotService:
    """Service for managing blocked slots"""
    
    @staticmethod
    def block_slot(court: str, date: str, time_slot: str, reason: str, blocked_by: str = 'admin') -> Tuple[bool, str]:
        """Block a specific time slot for a court on a given date"""
        try:
            logger.info(f"Blocking slot: {court}, {date}, {time_slot}")
            
            # Check if slot is already blocked
            existing_query = """
                SELECT id FROM blocked_slots 
                WHERE court = %s AND date = %s AND time_slot = %s
            """
            existing = DatabaseManager.execute_query(
                existing_query, 
                (court, date, time_slot), 
                fetch_one=True
            )
            
            if existing:
                return False, "Slot is already blocked"
            
            # Insert new blocked slot
            insert_query = """
                INSERT INTO blocked_slots (court, date, time_slot, reason, blocked_by, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            result = DatabaseManager.execute_query(
                insert_query,
                (court, date, time_slot, reason, blocked_by, datetime.now()),
                fetch_one=True
            )
            
            if result:
                logger.info(f"Slot blocked successfully with ID: {result['id']}")
                return True, f"Slot blocked successfully"
            else:
                return False, "Failed to block slot"
                
        except Exception as e:
            logger.error(f"Error blocking slot: {e}")
            return False, f"Error blocking slot: {str(e)}"
    
    @staticmethod
    def unblock_slot(court: str, date: str, time_slot: str) -> Tuple[bool, str]:
        """Unblock a specific time slot"""
        try:
            logger.info(f"Unblocking slot: {court}, {date}, {time_slot}")
            
            delete_query = """
                DELETE FROM blocked_slots 
                WHERE court = %s AND date = %s AND time_slot = %s
            """
            
            result = DatabaseManager.execute_query(
                delete_query,
                (court, date, time_slot),
                fetch_all=False
            )
            
            if result and result > 0:
                logger.info(f"Slot unblocked successfully")
                return True, "Slot unblocked successfully"
            else:
                return False, "Slot was not blocked or already unblocked"
                
        except Exception as e:
            logger.error(f"Error unblocking slot: {e}")
            return False, f"Error unblocking slot: {str(e)}"
    
    @staticmethod
    def get_blocked_slots(court: str, date: str) -> List[str]:
        """Get all blocked time slots for a specific court and date"""
        try:
            logger.info(f"Getting blocked slots for: {court}, {date}")
            
            query = """
                SELECT time_slot FROM blocked_slots 
                WHERE court = %s AND date = %s
                ORDER BY time_slot
            """
            
            results = DatabaseManager.execute_query(query, (court, date))
            
            if results:
                blocked_times = [row['time_slot'].strftime('%H:%M') for row in results]
                logger.info(f"Found {len(blocked_times)} blocked slots")
                return blocked_times
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting blocked slots: {e}")
            return []
    
    @staticmethod
    def get_blocked_slot_details(court: str, date: str, time_slot: str) -> Optional[BlockedSlot]:
        """Get details of a specific blocked slot"""
        try:
            query = """
                SELECT * FROM blocked_slots 
                WHERE court = %s AND date = %s AND time_slot = %s
            """
            
            result = DatabaseManager.execute_query(
                query, 
                (court, date, time_slot), 
                fetch_one=True
            )
            
            if result:
                return BlockedSlot(
                    id=result['id'],
                    court=result['court'],
                    date=result['date'].isoformat(),
                    time_slot=result['time_slot'].strftime('%H:%M'),
                    reason=result['reason'],
                    blocked_by=result['blocked_by'],
                    created_at=result['created_at']
                )
            return None
            
        except Exception as e:
            logger.error(f"Error getting blocked slot details: {e}")
            return None
    
    @staticmethod
    def get_all_blocked_slots_for_date_range(start_date: str, end_date: str) -> List[BlockedSlot]:
        """Get all blocked slots for a date range (for admin view)"""
        try:
            query = """
                SELECT * FROM blocked_slots 
                WHERE date BETWEEN %s AND %s
                ORDER BY date, time_slot
            """
            
            results = DatabaseManager.execute_query(query, (start_date, end_date))
            
            if results:
                blocked_slots = []
                for row in results:
                    blocked_slots.append(BlockedSlot(
                        id=row['id'],
                        court=row['court'],
                        date=row['date'].isoformat(),
                        time_slot=row['time_slot'].strftime('%H:%M'),
                        reason=row['reason'],
                        blocked_by=row['blocked_by'],
                        created_at=row['created_at']
                    ))
                return blocked_slots
            return []
            
        except Exception as e:
            logger.error(f"Error getting blocked slots for date range: {e}")
            return []