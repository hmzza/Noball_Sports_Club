"""
Main Flask application - Professional, clean, and modular.
NoBall Sports Club Management System
"""

import os
import logging
from datetime import datetime, timedelta, timezone

from flask import Flask, render_template, request, jsonify

# Timezone support (use backport on Python < 3.9)
try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    from backports.zoneinfo import ZoneInfo  # pip install backports.zoneinfo

# Import modular components
from config import config
from database import DatabaseManager
from services import BookingService, ContactService
from services.auth_service import AuthService, SessionManager
from admin import admin_bp
from config import Config
from services.email_service import EmailService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------- TZ + window helpers (cross-midnight safe) ---------
ARENA_TZ = ZoneInfo("Asia/Karachi")
WORKDAY_END_MIN = 5 * 60 + 30  # 05:30

def parse_local_ymd(ymd: str) -> datetime:
    """Local midnight for a YYYY-MM-DD string."""
    y, m, d = map(int, ymd.split("-"))
    return datetime(y, m, d, 0, 0, 0, tzinfo=ARENA_TZ)

def combine_local(display_ymd: str, hhmm: str) -> datetime:
    """
    Map (selected workday date, HH:mm) → actual local datetime.
    00:00–05:30 belong to the *next* calendar date, but they are still part of the workday.
    """
    h, mm = map(int, hhmm.split(":"))
    base = parse_local_ymd(display_ymd)
    if (h * 60 + mm) < WORKDAY_END_MIN:
        base = base + timedelta(days=1)
    return base.replace(hour=h, minute=mm)

def to_storage(dt_local: datetime) -> datetime:
    """Convert local datetime to UTC (storage canonical)."""
    return dt_local.astimezone(timezone.utc)
# ------------------------------------------------------------


def create_app(config_name=None):
    """Application factory pattern for creating Flask app"""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "default")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Register blueprints
    app.register_blueprint(admin_bp)

    # Initialize database (don't fail startup if database is not ready)
    try:
        if DatabaseManager.init_database():
            logger.info("Database initialized successfully")
        else:
            logger.warning("Database initialization did not complete; some tables may be missing.")
    except Exception as e:
        logger.warning(
            f"Database initialization failed: {e}. App will start without database."
        )

    # Ensure default pricing exists (seed once if empty)
    try:
        from services.pricing_service import PricingService
        PricingService.initialize_default_pricing()
    except Exception as e:
        logger.warning(f"Pricing initialization skipped: {e}")

    # Optionally bootstrap a super admin if explicitly enabled
    try:
        if os.environ.get("BOOTSTRAP_SUPER_ADMIN") == "1":
            from services.auth_service import AuthService as _AS
            _AS.create_super_admin_from_env()
            logger.info("Super admin bootstrap attempted from environment variables")
    except Exception as e:
        logger.warning(f"Super admin bootstrap skipped: {e}")

    # Register routes
    register_main_routes(app)
    register_api_routes(app)
    register_error_handlers(app)

    logger.info("Flask application created successfully")
    return app


def register_main_routes(app):
    """Register main application routes"""

    @app.route("/")
    def index():
        """Main page route"""
        from config import Config
        corporate_events = []
        gallery_items = []

        try:
            from services.content_service import ContentService
            corporate_events = ContentService.get_corporate_events(limit=6)
            gallery_items = ContentService.get_gallery_photos()
        except Exception as e:
            logger.warning(f"Content load skipped: {e}")

        if not gallery_items:
            gallery_items = [
                {
                    "title": "Sports Club",
                    "description": "Islamabad's first all in one sports club",
                    "image_path": "images/openSpace.jpeg",
                },
                {
                    "title": "Padel Courts",
                    "description": "Mondo Pu Courts",
                    "image_path": "images/bothPadel.jpeg",
                },
                {
                    "title": "Rage Room",
                    "description": "Professional Setup",
                    "image_path": "images/rageRoom.jpeg",
                },
                {
                    "title": "Cricket Court",
                    "description": "Professional Setup",
                    "image_path": "images/cricketfield1.png",
                },
                {
                    "title": "Archery",
                    "description": "Safe & Supervised",
                    "image_path": "images/archery.jpeg",
                },
                {
                    "title": "Padel Court",
                    "description": "Purple Mondo Surface",
                    "image_path": "images/padelPurple.jpeg",
                },
                {
                    "title": "Padel Court",
                    "description": "Teracotta Surface",
                    "image_path": "images/padelTerra.jpeg",
                },
                {
                    "title": "Pickleball Court",
                    "description": "Premium Setup",
                    "image_path": "images/pickleball2.jpeg",
                },
                {
                    "title": "Futsal Court",
                    "description": "FIFA Standard",
                    "image_path": "images/futsalField.jpeg",
                },
                {
                    "title": "Pickleball Court",
                    "description": "Premium Setup",
                    "image_path": "images/pickleball.jpeg",
                },
                {
                    "title": "Sports Club",
                    "description": "Islamabad's first all in one sports club",
                    "image_path": "images/openSpace2.jpeg",
                },
            ]

        return render_template(
            "index_modern.html",
            whatsapp_number=Config.WHATSAPP_NUMBER,
            corporate_events=corporate_events,
            gallery_items=gallery_items,
        )

    @app.route("/booking")
    def booking():
        """Booking page route"""
        return render_template("booking_modern.html", whatsapp_number=Config.WHATSAPP_NUMBER)

    @app.route("/healthz")
    def healthz():
        """Simple health check endpoint: returns app and DB status"""
        db_ok = False
        try:
            db_ok = DatabaseManager.test_connection()
        except Exception:
            db_ok = False
        return jsonify({"ok": True, "db": db_ok}), (200 if db_ok else 503)

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        """
        Serve uploaded files (corporate/gallery). Stored under static/uploads.
        This bypasses any CDN layer that only knows build-time assets.
        """
        from flask import send_from_directory
        upload_root = os.path.join(app.root_path, "static", "uploads")
        return send_from_directory(upload_root, filename, conditional=True)


def register_api_routes(app):
    """Register API routes"""

    @app.route("/api/booked-slots", methods=["POST"])
    def get_booked_slots():
        """
        Get booked time slots for a specific court and WORKDAY date.
        The service should return a list of "HH:mm" strings (including 00:00–05:30 that
        belong to this workday).
        """
        try:
            data = request.get_json(force=True) or {}
            court = data.get("court")
            date = data.get("date")  # workday (selected calendar date)

            if not court or not date:
                return jsonify({"error": "Missing court or date"}), 400

            booked_slots = BookingService.get_booked_slots(court, date)
            return jsonify(booked_slots)

        except Exception as e:
            logger.error(f"API error - get_booked_slots: {e}")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/check-conflicts", methods=["POST"])
    def check_conflicts():
        """
        Check for conflicts before final booking confirmation (legacy date+slots).
        Uses WORKDAY date (the selected date) and the list of HH:mm slots.
        """
        try:
            data = request.get_json(force=True) or {}
            court = data.get("court")
            date = data.get("date")  # workday
            selected_slots = data.get("selectedSlots", [])

            if not all([court, date, selected_slots]):
                return (
                    jsonify({"hasConflict": True, "message": "Missing required data"}),
                    400,
                )

            available, conflicts = BookingService.check_slot_availability(
                court, date, selected_slots
            )

            return jsonify(
                {
                    "hasConflict": not available,
                    "message": ("Slots no longer available" if not available else "Slots available"),
                    "conflicts": conflicts,
                }
            )

        except Exception as e:
            logger.error(f"API error - check_conflicts: {e}")
            return (
                jsonify({"hasConflict": True, "message": "Error checking availability"}),
                500,
            )

    @app.route("/api/create-booking", methods=["POST"])
    def create_booking():
        """
        Create a new booking with conflict prevention (cross-midnight safe + legacy adapter).
        Canonical booking/workday date is ALWAYS the SELECTED date on the frontend.
        """
        try:
            data = request.get_json(force=True) or {}

            court = data.get("court")
            workday = data.get("date") or data.get("booking_date")  # selected date (workday)
            selected = data.get("selectedSlots", [])  # [{time:'HH:mm', index:int}, ...] OR ["HH:mm", ...]

            # Basic validations
            if not court or not workday or not selected:
                return jsonify({"success": False, "message": "Missing court/date/slots"}), 400

            # Customer field validations
            player_name = (data.get("playerName") or "").strip()
            player_phone = (data.get("playerPhone") or "").strip()
            player_email = (data.get("playerEmail") or "").strip()

            if not player_name or len(player_name) < 2:
                return jsonify({"success": False, "message": "Please enter your full name"}), 400

            import re
            phone_pattern = re.compile(r"^(03\d{9}|\+923\d{9})$")
            if not phone_pattern.match(player_phone):
                return jsonify({"success": False, "message": "Please enter a valid Pakistani mobile number (03XXXXXXXXX or +923XXXXXXXXX)"}), 400

            email_pattern = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
            if not email_pattern.match(player_email):
                return jsonify({"success": False, "message": "Please enter a valid email address"}), 400

            # Normalize selected slots to list of HH:mm strings
            times = [(s["time"] if isinstance(s, dict) else s) for s in selected]
            if not all(isinstance(t, str) and ":" in t for t in times):
                return jsonify({"success": False, "message": "Invalid time slots format"}), 400

            # Build concrete datetimes (local) for robustness / email / UTC storage if needed
            start_dts_local = sorted(combine_local(workday, t) for t in times)
            start_local = start_dts_local[0]
            end_local = start_dts_local[-1] + timedelta(minutes=30)

            start_utc = to_storage(start_local)
            end_utc = to_storage(end_local)
            slot_starts_utc = [to_storage(dt) for dt in start_dts_local]

            # Duration (hours) for legacy code/notifications
            duration_hours = round(len(times) * 0.5, 2)
            slots_count = len(times)

            # ---- Conflict check: try new signature, fallback to legacy ----
            try:
                available, conflicts = BookingService.check_slot_availability(
                    court=court,
                    start_at_utc=start_utc,
                    end_at_utc=end_utc,
                    slot_starts_utc=slot_starts_utc,
                )
            except TypeError:
                # Legacy API (court, date, selected_slots)
                # Ensure it's list of dicts with "time"
                legacy_slots = selected if (selected and isinstance(selected[0], dict) and "time" in selected[0]) \
                    else [{"time": t} for t in times]
                available, conflicts = BookingService.check_slot_availability(
                    court, workday, legacy_slots
                )

            if not available:
                return jsonify({
                    "success": False,
                    "message": "One or more selected time slots are no longer available",
                    "conflicts": conflicts,
                }), 409

            # ---- Create booking payload (include canonical + legacy fields) ----
            payload = {
                "court": court,
                "sport": data.get("sport"),
                "courtName": data.get("courtName"),
                "playerName": data.get("playerName"),
                "playerPhone": data.get("playerPhone"),
                "playerEmail": data.get("playerEmail"),
                "playerCount": data.get("playerCount", "2"),
                "specialRequests": data.get("specialRequests", ""),
                "paymentType": data.get("paymentType", "advance"),
                "totalAmount": data.get("totalAmount", 0),
                "promoCode": data.get("promoCode", ""),

                # Canonical timestamps (UTC)
                "start_at_utc": start_utc.isoformat(),
                "end_at_utc": end_utc.isoformat(),

                # Display helpers
                "display_date": workday,                # workday (selected date)
                "start_hhmm": data.get("startTime"),
                "end_hhmm": data.get("endTime"),
                "selected_slots": selected,

                # Legacy compatibility (existing service code expects these)
                "startTime": data.get("startTime"),
                "endTime": data.get("endTime"),
                "selectedSlots": selected,
                "duration": data.get("duration", duration_hours),  # ensure present
                "slots_count": slots_count,

                # Common DB fields used elsewhere
                "booking_date": workday,  # WORKDAY anchor
                "date": workday,
                "start_time": data.get("startTime"),
                "end_time": data.get("endTime"),
            }

            booking_id = BookingService.create_booking(payload)

            # Fire-and-forget: email customer (SMTP must be configured)
            try:
                display_dt = f"{payload.get('display_date')} {payload.get('start_hhmm')} - {payload.get('end_hhmm')}"
                EmailService.send_booking_created(
                    to_email=payload.get('playerEmail') or data.get('playerEmail'),
                    booking={
                        "bookingId": booking_id,
                        "sport": payload.get('sport'),
                        "courtName": payload.get('courtName') or payload.get('court'),
                        "display_datetime": display_dt,
                        "paymentType": payload.get('paymentType'),
                        "totalAmount": payload.get('totalAmount', 0),
                    },
                )
            except Exception:
                pass

            return jsonify({
                "success": True,
                "bookingId": booking_id,
                "message": "Booking created successfully",
            })

        except ValueError as e:
            return jsonify({"success": False, "message": str(e)}), 400
        except Exception as e:
            logger.exception("API error - create_booking")
            return jsonify({"success": False, "message": "Failed to create booking"}), 500

    @app.route("/submit-contact", methods=["POST"])
    def submit_contact():
        """Handle contact form submissions"""
        try:
            contact_data = {
                "name": request.form.get("name"),
                "email": request.form.get("email"),
                "phone": request.form.get("phone"),
                "sport": request.form.get("sport"),
                "message": request.form.get("message"),
            }

            if not all([contact_data["name"], contact_data["email"], contact_data["phone"], contact_data["message"]]):
                return jsonify({"success": False, "error": "Missing required fields"}), 400

            success = ContactService.submit_contact(contact_data)
            if success:
                return jsonify({"success": True, "message": "Contact form submitted successfully"})
            else:
                raise Exception("Failed to save contact")

        except Exception as e:
            logger.error(f"Contact form error: {e}")
            return jsonify({"success": False, "error": "Internal server error"}), 500

    # Debug endpoints
    @app.route("/api/debug-bookings-customer", methods=["GET"])
    def debug_bookings_customer():
        """Debug endpoint for customer side"""
        try:
            query = """
                SELECT id, sport, court, booking_date, status, player_name, selected_slots, created_at
                FROM bookings 
                WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days'
                ORDER BY created_at DESC 
                LIMIT 10
            """
            bookings = DatabaseManager.execute_query(query)

            bookings_list = []
            if bookings:
                for booking in bookings:
                    booking_dict = dict(booking)
                    if booking_dict.get("booking_date"):
                        booking_dict["booking_date"] = booking_dict["booking_date"].strftime("%Y-%m-%d")
                    if booking_dict.get("created_at"):
                        booking_dict["created_at"] = booking_dict["created_at"].isoformat()
                    bookings_list.append(booking_dict)

            return jsonify({"success": True, "bookings": bookings_list, "count": len(bookings_list)})

        except Exception as e:
            logger.error(f"Debug bookings error: {e}")
            return jsonify({"success": False, "error": str(e)})

    @app.route("/api/test-db-customer", methods=["GET"])
    def test_db_customer():
        """Test database connection for customer side"""
        try:
            total_result = DatabaseManager.execute_query(
                "SELECT COUNT(*) as count FROM bookings", fetch_one=True
            )
            total_bookings = total_result["count"] if total_result else 0

            today_result = DatabaseManager.execute_query(
                "SELECT COUNT(*) as count FROM bookings WHERE booking_date = CURRENT_DATE",
                fetch_one=True,
            )
            today_bookings = today_result["count"] if today_result else 0

            status_results = DatabaseManager.execute_query(
                """
                SELECT status, COUNT(*) as count
                FROM bookings 
                WHERE booking_date >= CURRENT_DATE
                GROUP BY status
                """
            )
            status_counts = {}
            if status_results:
                for row in status_results:
                    status_counts[row["status"]] = row["count"]

            return jsonify(
                {
                    "success": True,
                    "total_bookings": total_bookings,
                    "today_bookings": today_bookings,
                    "status_counts": status_counts,
                    "message": "Database connection working",
                }
            )

        except Exception as e:
            logger.error(f"Database test error: {e}")
            return jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "message": "Database connection failed",
                }
            )

    @app.route("/api/block-slot", methods=["POST"])
    def block_slot():
        """Block a specific time slot"""
        try:
            from services.blocked_slot_service import BlockedSlotService

            data = request.json
            court = data.get("court")
            date = data.get("date")
            time_slot = data.get("time_slot")
            reason = data.get("reason", "No reason provided")

            if not all([court, date, time_slot]):
                return jsonify({"success": False, "message": "Missing required fields: court, date, time_slot"}), 400

            success, message = BlockedSlotService.block_slot(court, date, time_slot, reason)
            return jsonify({"success": success, "message": message}), (200 if success else 400)

        except Exception as e:
            logger.error(f"API error - block_slot: {e}")
            return jsonify({"success": False, "message": "Failed to block slot"}), 500

    @app.route("/api/unblock-slot", methods=["POST"])
    def unblock_slot():
        """Unblock a specific time slot"""
        try:
            from services.blocked_slot_service import BlockedSlotService

            data = request.json
            court = data.get("court")
            date = data.get("date")
            time_slot = data.get("time_slot")

            if not all([court, date, time_slot]):
                return jsonify({"success": False, "message": "Missing required fields: court, date, time_slot"}), 400

            success, message = BlockedSlotService.unblock_slot(court, date, time_slot)
            return jsonify({"success": success, "message": message}), (200 if success else 400)

        except Exception as e:
            logger.error(f"API error - unblock_slot: {e}")
            return jsonify({"success": False, "message": "Failed to unblock slot"}), 500

    @app.route("/api/calculate-price", methods=["POST"])
    def calculate_price():
        """Calculate booking price for customer (workday-based)"""
        try:
            data = request.json
            court_id = data.get("court_id")
            booking_date = data.get("booking_date")  # workday
            selected_slots = data.get("selected_slots", [])

            if not all([court_id, booking_date, selected_slots]):
                return jsonify({"success": False, "message": "Missing required fields: court_id, booking_date, selected_slots"}), 400

            total_price = BookingService.calculate_booking_price(court_id, booking_date, selected_slots)

            return jsonify({"success": True, "total_price": total_price, "currency": "PKR", "slots_count": len(selected_slots)})

        except Exception as e:
            logger.error(f"API error - calculate_price: {e}")
            return jsonify({"success": False, "message": "Failed to calculate price"}), 500

    @app.route("/api/apply-promo-code", methods=["POST"])
    def apply_promo_code():
        """Apply promo code for customer booking"""
        try:
            from services.promo_service import PromoService

            data = request.json

            if not data:
                return jsonify({"success": False, "message": "No data provided"}), 400

            promo_code = data.get("promo_code", "").strip().upper()
            sport = data.get("sport")

            # Validate booking_amount
            booking_amount_raw = data.get("booking_amount")
            if booking_amount_raw is None:
                return jsonify({"success": False, "message": "Booking amount is required"}), 400

            try:
                booking_amount = int(booking_amount_raw)
            except (ValueError, TypeError):
                return jsonify({"success": False, "message": f"Invalid booking amount: {booking_amount_raw}"}), 400

            if not promo_code:
                return jsonify({"success": False, "message": "Promo code is required"}), 400
            if booking_amount <= 0:
                return jsonify({"success": False, "message": f"Booking amount must be greater than 0, got: {booking_amount}"}), 400

            success, message, discount_amount, final_amount = PromoService.apply_promo_code(
                promo_code, booking_amount, sport
            )

            if success:
                discount_text = f"You saved ₨{discount_amount:,}!" if discount_amount > 0 else "Promo code applied!"
                return jsonify(
                    {
                        "success": True,
                        "message": message,
                        "discount_amount": discount_amount,
                        "final_amount": final_amount,
                        "original_amount": booking_amount,
                        "discount_text": discount_text,
                    }
                )
            else:
                return jsonify({"success": False, "message": message}), 400

        except Exception as e:
            logger.error(f"API error - apply_promo_code: {e}")
            return jsonify({"success": False, "message": "Error applying promo code"}), 500

    @app.route("/api/pricing-info", methods=["GET"])
    def get_pricing_info():
        """Get pricing information for customer display"""
        try:
            from services.pricing_service import PricingService

            pricing_data = PricingService.get_all_pricing()

            # Format pricing data for customer display
            formatted_pricing = {}
            for pricing in pricing_data:
                sport = pricing.sport
                if sport not in formatted_pricing:
                    formatted_pricing[sport] = {
                        "courts": [],
                        "base_price_per_hour": None,
                        "peak_price_per_hour": None,
                        "off_peak_price_per_hour": None,
                        "weekend_price_per_hour": None,
                    }

                # Convert per-slot pricing to per-hour pricing (2 slots = 1 hour)
                court_info = {
                    "court_id": pricing.court_id,
                    "court_name": pricing.court_name,
                    "base_price_per_hour": pricing.base_price * 2,
                    "peak_price_per_hour": ((pricing.peak_price * 2) if pricing.peak_price else None),
                    "off_peak_price_per_hour": ((pricing.off_peak_price * 2) if pricing.off_peak_price else None),
                    "weekend_price_per_hour": ((pricing.weekend_price * 2) if pricing.weekend_price else None),
                }

                formatted_pricing[sport]["courts"].append(court_info)

                if formatted_pricing[sport]["base_price_per_hour"] is None:
                    formatted_pricing[sport]["base_price_per_hour"] = court_info["base_price_per_hour"]
                    formatted_pricing[sport]["peak_price_per_hour"] = court_info["peak_price_per_hour"]
                    formatted_pricing[sport]["off_peak_price_per_hour"] = court_info["off_peak_price_per_hour"]
                    formatted_pricing[sport]["weekend_price_per_hour"] = court_info["weekend_price_per_hour"]

            return jsonify(
                {
                    "success": True,
                    "pricing": formatted_pricing,
                    "timing_info": {
                        "peak_hours": "5:00 PM - 2:00 AM",
                        "off_peak_hours": "2:00 PM - 5:00 PM & 2:00 AM - 6:00 AM",
                        "weekend": "Saturday & Sunday (All Day)",
                    },
                }
            )

        except Exception as e:
            logger.error(f"API error - get_pricing_info: {e}")
            return jsonify({"success": False, "message": "Failed to get pricing info"}), 500


def register_error_handlers(app):
    """Register error handlers"""

    @app.route("/favicon.ico")
    def favicon():
        """Handle favicon requests"""
        return "", 204  # No Content - prevents 404 error

    @app.errorhandler(404)
    def not_found(error):
        return render_template("404.html"), 404

    @app.errorhandler(500)
    def server_error(error):
        return render_template("500.html"), 500


# Create app instance
app = create_app()

if __name__ == "__main__":
    if app:
        logger.info("Starting NoBall Sports Club application...")
        import os as _os
        app.run(debug=_os.environ.get("FLASK_DEBUG") == "1", host="0.0.0.0", port=int(_os.environ.get("PORT", "5010")))
    else:
        logger.error("Failed to create application. Please check your configuration.")
