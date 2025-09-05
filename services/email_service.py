"""
Email service for sending transactional emails to customers.
Configurable via environment variables to work in dev/prod.
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict


class EmailService:
    """Lightweight SMTP email sender with safe fallbacks."""

    @staticmethod
    def _get_smtp_config():
        return {
            "host": os.environ.get("SMTP_HOST"),
            "port": int(os.environ.get("SMTP_PORT", "587")),
            "user": os.environ.get("SMTP_USER"),
            "password": os.environ.get("SMTP_PASS"),
            "from_addr": os.environ.get("SMTP_FROM", os.environ.get("EMAIL_FROM", "noballarena@gmail.com")),
            "use_tls": os.environ.get("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes"),
        }

    @staticmethod
    def _send_smtp(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
        cfg = EmailService._get_smtp_config()
        if not cfg["host"] or not cfg["user"] or not cfg["password"]:
            # SMTP is not configured; skip silently
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = cfg["from_addr"]
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            if cfg["use_tls"]:
                server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_addr"], [to_email], msg.as_string())
            server.quit()
            return True
        except Exception:
            return False

    @staticmethod
    def _format_html(title: str, lines: Dict[str, str], footer: str = None) -> str:
        rows = "".join(
            f"<tr><td style='padding:6px 8px;color:#6b7280'>{key}</td><td style='padding:6px 8px;text-align:right;color:#111827;font-weight:600'>{val}</td></tr>"
            for key, val in lines.items()
        )
        return f"""
        <div style="font-family:Inter,Arial,sans-serif;background:#f9fafb;padding:16px">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.06);overflow:hidden">
            <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb">
              <h2 style="margin:0;color:#111827">{title}</h2>
            </div>
            <div style="padding:12px 20px">
              <table style="width:100%;border-collapse:collapse">{rows}</table>
            </div>
            <div style="padding:12px 20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px">
              {footer or 'Thank you for choosing The NoBall Sports Club.'}
            </div>
          </div>
        </div>
        """

    @staticmethod
    def send_booking_created(to_email: str, booking: Dict) -> bool:
        if not to_email:
            return False
        title = "Booking Received"
        lines = {
            "Booking ID:": booking.get("bookingId") or booking.get("id", "N/A"),
            "Sport:": (booking.get("sport") or "").title(),
            "Court:": booking.get("courtName") or booking.get("court") or "",
            "Date/Time:": booking.get("display_datetime") or booking.get("datetime", ""),
            "Payment:": "50% Advance" if booking.get("paymentType") == "advance" else "Full",
            "Amount:": f"PKR {int(booking.get('totalAmount', 0)):,}",
            "Status:": "Pending Payment",
        }
        html = EmailService._format_html(title, lines, footer="We will confirm shortly after verifying payment.")
        text = "\n".join(f"{k} {v}" for k, v in lines.items())
        return EmailService._send_smtp(to_email, "Your booking has been received", html, text)

    @staticmethod
    def send_booking_status(to_email: str, booking: Dict, status: str) -> bool:
        if not to_email:
            return False
        status_title = {
            "confirmed": "Booking Confirmed",
            "cancelled": "Booking Cancelled",
            "pending_payment": "Booking Update",
        }.get(status, "Booking Update")
        lines = {
            "Booking ID:": booking.get("id") or booking.get("bookingId", "N/A"),
            "Sport:": (booking.get("sport") or "").title(),
            "Court:": booking.get("court_name") or booking.get("court") or "",
            "Date:": str(booking.get("booking_date") or booking.get("date") or ""),
            "Time:": f"{booking.get('start_time','')} - {booking.get('end_time','')}",
            "Amount:": f"PKR {int(booking.get('total_amount', 0)):,}",
            "Status:": status.replace('_', ' ').title(),
        }
        html = EmailService._format_html(status_title, lines)
        text = "\n".join(f"{k} {v}" for k, v in lines.items())
        return EmailService._send_smtp(to_email, status_title, html, text)

