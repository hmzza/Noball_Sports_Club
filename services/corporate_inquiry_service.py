"""
Corporate inquiry service for handling corporate event requests from the website.
"""
import logging
from typing import Dict, List, Optional

from database import DatabaseManager

logger = logging.getLogger(__name__)


class CorporateInquiryService:
    """Service for creating and managing corporate event inquiries."""

    @staticmethod
    def create_inquiry(payload: Dict) -> Optional[Dict]:
        """Insert a new inquiry; returns inserted row."""
        company_name = (payload.get("company_name") or "").strip()
        contact_phone = (payload.get("contact_phone") or "").strip()
        if not company_name:
            raise ValueError("Company name is required")
        if not contact_phone:
            raise ValueError("Phone is required")

        contact_name = (payload.get("contact_name") or "").strip() or None
        contact_email = (payload.get("contact_email") or "").strip() or None
        preferred_date = payload.get("preferred_date") or None
        attendees = payload.get("attendees") or None
        message = (payload.get("message") or "").strip() or None

        query = """
            INSERT INTO corporate_inquiries
                (company_name, contact_name, contact_phone, contact_email, preferred_date, attendees, message)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        row = DatabaseManager.execute_query(
            query,
            (company_name, contact_name, contact_phone, contact_email, preferred_date, attendees, message),
            fetch_one=True,
        )
        return dict(row) if row else None

    @staticmethod
    def list_inquiries(status: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """List inquiries (optionally filtered by status)."""
        params = []
        where = ""
        if status:
            where = "WHERE status = %s"
            params.append(status)
        query = f"""
            SELECT *
            FROM corporate_inquiries
            {where}
            ORDER BY created_at DESC
        """
        if limit:
            query += " LIMIT %s"
            params.append(limit)
        rows = DatabaseManager.execute_query(query, tuple(params) if params else None)
        return [dict(r) for r in rows] if rows else []

    @staticmethod
    def unread_count() -> int:
        row = DatabaseManager.execute_query(
            "SELECT COUNT(*) AS c FROM corporate_inquiries WHERE status = 'new'",
            fetch_one=True,
        )
        return int(row.get("c", 0)) if row else 0

    @staticmethod
    def mark_reviewed(inquiry_id: int) -> bool:
        res = DatabaseManager.execute_query(
            "UPDATE corporate_inquiries SET status = 'reviewed', reviewed_at = CURRENT_TIMESTAMP WHERE id = %s",
            (inquiry_id,),
            fetch_all=False,
        )
        return res is not None

    @staticmethod
    def delete_inquiry(inquiry_id: int) -> bool:
        res = DatabaseManager.execute_query(
            "DELETE FROM corporate_inquiries WHERE id = %s",
            (inquiry_id,),
            fetch_all=False,
        )
        return res is not None

