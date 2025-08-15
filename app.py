"""
Main Flask application - Professional, clean, and modular.
NoBall Sports Club Management System
"""

import os
import logging
from flask import Flask, render_template, request, jsonify, session
from functools import wraps

# Import modular components
from config import config
from database import DatabaseManager
from services import BookingService, ContactService
from services.auth_service import AuthService, SessionManager
from admin import admin_bp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
        DatabaseManager.init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(
            f"Database initialization failed: {e}. App will start without database."
        )

    # Create super admin account if it doesn't exist
    try:
        AuthService.create_super_admin()
        logger.info("Super admin account checked/created successfully")
    except Exception as e:
        logger.warning(f"Failed to create super admin: {e}. Will skip for now.")

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
        return render_template("index_modern.html")

    @app.route("/booking")
    def booking():
        """Booking page route"""
        return render_template("booking_modern.html")


def register_api_routes(app):
    """Register API routes"""

    @app.route("/api/booked-slots", methods=["POST"])
    def get_booked_slots():
        """Get booked time slots for a specific court and date"""
        try:
            data = request.json
            court = data.get("court")
            date = data.get("date")

            if not court or not date:
                return jsonify({"error": "Missing court or date"}), 400

            booked_slots = BookingService.get_booked_slots(court, date)
            return jsonify(booked_slots)

        except Exception as e:
            logger.error(f"API error - get_booked_slots: {e}")
            return jsonify({"error": "Internal server error"}), 500

    @app.route("/api/check-conflicts", methods=["POST"])
    def check_conflicts():
        """Check for conflicts before final booking confirmation"""
        try:
            data = request.json
            court = data.get("court")
            date = data.get("date")
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
                    "message": (
                        "Slots no longer available"
                        if not available
                        else "Slots available"
                    ),
                    "conflicts": conflicts,
                }
            )

        except Exception as e:
            logger.error(f"API error - check_conflicts: {e}")
            return (
                jsonify(
                    {"hasConflict": True, "message": "Error checking availability"}
                ),
                500,
            )

    @app.route("/api/create-booking", methods=["POST"])
    def create_booking():
        """Create a new booking with conflict prevention"""
        try:
            booking_data = request.json

            # Final conflict check
            court = booking_data.get("court")
            date = booking_data.get("date")
            selected_slots = booking_data.get("selectedSlots", [])

            available, conflicts = BookingService.check_slot_availability(
                court, date, selected_slots
            )

            if not available:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "One or more selected time slots are no longer available",
                            "conflicts": conflicts,
                        }
                    ),
                    409,
                )

            # Create booking
            booking_id = BookingService.create_booking(booking_data)

            return jsonify(
                {
                    "success": True,
                    "bookingId": booking_id,
                    "message": "Booking created successfully",
                }
            )

        except ValueError as e:
            return jsonify({"success": False, "message": str(e)}), 400
        except Exception as e:
            logger.error(f"API error - create_booking: {e}")
            return (
                jsonify({"success": False, "message": "Failed to create booking"}),
                500,
            )

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

            # Validate required fields
            if not all(
                [
                    contact_data["name"],
                    contact_data["email"],
                    contact_data["phone"],
                    contact_data["message"],
                ]
            ):
                return (
                    jsonify({"success": False, "error": "Missing required fields"}),
                    400,
                )

            success = ContactService.submit_contact(contact_data)

            if success:
                return jsonify(
                    {"success": True, "message": "Contact form submitted successfully"}
                )
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
                    # Convert date/time objects to strings
                    if booking_dict.get("booking_date"):
                        booking_dict["booking_date"] = booking_dict[
                            "booking_date"
                        ].strftime("%Y-%m-%d")
                    if booking_dict.get("created_at"):
                        booking_dict["created_at"] = booking_dict[
                            "created_at"
                        ].isoformat()
                    bookings_list.append(booking_dict)

            return jsonify(
                {
                    "success": True,
                    "bookings": bookings_list,
                    "count": len(bookings_list),
                }
            )

        except Exception as e:
            logger.error(f"Debug bookings error: {e}")
            return jsonify({"success": False, "error": str(e)})

    @app.route("/api/test-db-customer", methods=["GET"])
    def test_db_customer():
        """Test database connection for customer side"""
        try:
            # Test basic query
            total_query = "SELECT COUNT(*) as count FROM bookings"
            total_result = DatabaseManager.execute_query(total_query, fetch_one=True)
            total_bookings = total_result["count"] if total_result else 0

            # Test today's bookings
            today_query = """
                SELECT COUNT(*) as count FROM bookings 
                WHERE booking_date = CURRENT_DATE
            """
            today_result = DatabaseManager.execute_query(today_query, fetch_one=True)
            today_bookings = today_result["count"] if today_result else 0

            # Test pending vs confirmed
            status_query = """
                SELECT status, COUNT(*) as count
                FROM bookings 
                WHERE booking_date >= CURRENT_DATE
                GROUP BY status
            """
            status_results = DatabaseManager.execute_query(status_query)
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
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Missing required fields: court, date, time_slot",
                        }
                    ),
                    400,
                )

            success, message = BlockedSlotService.block_slot(
                court, date, time_slot, reason
            )

            return jsonify({"success": success, "message": message}), (
                200 if success else 400
            )

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
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Missing required fields: court, date, time_slot",
                        }
                    ),
                    400,
                )

            success, message = BlockedSlotService.unblock_slot(court, date, time_slot)

            return jsonify({"success": success, "message": message}), (
                200 if success else 400
            )

        except Exception as e:
            logger.error(f"API error - unblock_slot: {e}")
            return jsonify({"success": False, "message": "Failed to unblock slot"}), 500

    @app.route("/api/calculate-price", methods=["POST"])
    def calculate_price():
        """Calculate booking price for customer"""
        try:
            data = request.json
            court_id = data.get("court_id")
            booking_date = data.get("booking_date")
            selected_slots = data.get("selected_slots", [])

            if not all([court_id, booking_date, selected_slots]):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Missing required fields: court_id, booking_date, selected_slots",
                        }
                    ),
                    400,
                )

            total_price = BookingService.calculate_booking_price(
                court_id, booking_date, selected_slots
            )

            return jsonify(
                {
                    "success": True,
                    "total_price": total_price,
                    "currency": "PKR",
                    "slots_count": len(selected_slots),
                }
            )

        except Exception as e:
            logger.error(f"API error - calculate_price: {e}")
            return (
                jsonify({"success": False, "message": "Failed to calculate price"}),
                500,
            )

    @app.route("/api/apply-promo-code", methods=["POST"])
    def apply_promo_code():
        """Apply promo code for customer booking"""
        try:
            from services.promo_service import PromoService

            data = request.json
            logger.info(f"Promo code request data: {data}")

            if not data:
                return jsonify({"success": False, "message": "No data provided"}), 400

            promo_code = data.get("promo_code", "").strip().upper()
            sport = data.get("sport")

            # Better validation for booking_amount
            booking_amount_raw = data.get("booking_amount")
            if booking_amount_raw is None:
                return (
                    jsonify(
                        {"success": False, "message": "Booking amount is required"}
                    ),
                    400,
                )

            try:
                booking_amount = int(booking_amount_raw)
            except (ValueError, TypeError):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Invalid booking amount: {booking_amount_raw}",
                        }
                    ),
                    400,
                )

            logger.info(
                f"Applying promo code: {promo_code}, amount: {booking_amount}, sport: {sport}"
            )

            if not promo_code:
                return (
                    jsonify({"success": False, "message": "Promo code is required"}),
                    400,
                )

            if booking_amount <= 0:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Booking amount must be greater than 0, got: {booking_amount}",
                        }
                    ),
                    400,
                )

            # Apply promo code
            success, message, discount_amount, final_amount = (
                PromoService.apply_promo_code(promo_code, booking_amount, sport)
            )

            if success:
                # Create discount description
                if discount_amount > 0:
                    discount_text = f"You saved ₨{discount_amount:,}!"
                else:
                    discount_text = "Promo code applied!"

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
            return (
                jsonify({"success": False, "message": "Error applying promo code"}),
                500,
            )

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
                    "peak_price_per_hour": (
                        (pricing.peak_price * 2) if pricing.peak_price else None
                    ),
                    "off_peak_price_per_hour": (
                        (pricing.off_peak_price * 2) if pricing.off_peak_price else None
                    ),
                    "weekend_price_per_hour": (
                        (pricing.weekend_price * 2) if pricing.weekend_price else None
                    ),
                }

                formatted_pricing[sport]["courts"].append(court_info)

                # Set sport-level pricing (use first court's pricing as representative)
                if formatted_pricing[sport]["base_price_per_hour"] is None:
                    formatted_pricing[sport]["base_price_per_hour"] = court_info[
                        "base_price_per_hour"
                    ]
                    formatted_pricing[sport]["peak_price_per_hour"] = court_info[
                        "peak_price_per_hour"
                    ]
                    formatted_pricing[sport]["off_peak_price_per_hour"] = court_info[
                        "off_peak_price_per_hour"
                    ]
                    formatted_pricing[sport]["weekend_price_per_hour"] = court_info[
                        "weekend_price_per_hour"
                    ]

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
            return (
                jsonify({"success": False, "message": "Failed to get pricing info"}),
                500,
            )


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
        app.run(debug=True, host="0.0.0.0", port=5010)
    else:
        logger.error("Failed to create application. Please check your configuration.")
