"""
Contact service for handling contact form submissions.
"""
import logging
from typing import List, Dict

from database import DatabaseManager
from models import Contact

logger = logging.getLogger(__name__)

class ContactService:
    """Professional contact service for managing contact form submissions"""
    
    @staticmethod
    def submit_contact(contact_data: Dict) -> bool:
        """Handle contact form submission"""
        try:
            # Validate required fields
            required_fields = ["name", "email", "phone", "message"]
            for field in required_fields:
                if not contact_data.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            insert_query = """
                INSERT INTO contacts (name, email, phone, sport, message)
                VALUES (%(name)s, %(email)s, %(phone)s, %(sport)s, %(message)s)
            """
            
            result = DatabaseManager.execute_query(insert_query, contact_data, fetch_all=False)
            
            if result is not None:
                logger.info(f"Contact form submitted by {contact_data['name']}")
                return True
            return False
        
        except Exception as e:
            logger.error(f"Error submitting contact form: {e}")
            return False
    
    @staticmethod
    def get_all_contacts() -> List[Dict]:
        """Get all contact form submissions"""
        try:
            query = "SELECT * FROM contacts ORDER BY created_at DESC"
            contacts = DatabaseManager.execute_query(query)
            
            if contacts:
                return [dict(contact) for contact in contacts]
            return []
        
        except Exception as e:
            logger.error(f"Error fetching contacts: {e}")
            return []
    
    @staticmethod
    def get_contacts_by_sport(sport: str) -> List[Dict]:
        """Get contact submissions filtered by sport"""
        try:
            query = "SELECT * FROM contacts WHERE sport = %s ORDER BY created_at DESC"
            contacts = DatabaseManager.execute_query(query, (sport,))
            
            if contacts:
                return [dict(contact) for contact in contacts]
            return []
        
        except Exception as e:
            logger.error(f"Error fetching contacts by sport: {e}")
            return []