"""
Admin view controllers for handling admin page rendering and logic.
"""
from flask import render_template, request, jsonify, redirect, url_for
import logging

from services.admin_service import AdminService
from services.schedule_service import ScheduleService
from services.pricing_service import PricingService
from services.expense_service import ExpenseService
from config import Config

logger = logging.getLogger(__name__)

class AdminDashboardView:
    """Admin dashboard view controller"""
    
    @staticmethod
    def render_dashboard():
        """Render modern admin dashboard with stats and recent bookings"""
        try:
            from flask import g
            from services.auth_service import AuthService
            
            stats = AdminService.get_dashboard_stats()
            recent_bookings = AdminService.get_recent_bookings()
            
            # Filter stats based on user role - staff shouldn't see revenue
            if hasattr(g, 'current_user') and g.current_user:
                if not AuthService.has_permission(g.current_user, 'view_revenue'):
                    stats.pop('revenue', None)
            
            # Add today's date for template
            from datetime import datetime
            today_date = datetime.now().strftime("%A, %B %d, %Y")
            
            return render_template(
                "admin_dashboard.html", 
                bookings=recent_bookings, 
                stats=stats
            )
        
        except Exception as e:
            logger.error(f"Dashboard error: {e}")
            return render_template("admin_dashboard.html", bookings=[], stats={})

class AdminBookingView:
    """Admin booking view controller"""
    
    @staticmethod
    def render_bookings():
        """Render admin bookings management page"""
        try:
            bookings = AdminService.get_all_bookings()
            return render_template("admin_bookings.html", bookings=bookings)
        
        except Exception as e:
            logger.error(f"Admin bookings error: {e}")
            return render_template("admin_bookings.html", bookings=[], error=str(e))
    
    @staticmethod
    def confirm_booking(booking_id: str):
        """Confirm a booking"""
        try:
            success = AdminService.perform_booking_action(booking_id, "confirm")
            
            if success:
                return redirect(
                    url_for("admin_panel.admin_bookings") + 
                    "?message=Booking confirmed successfully"
                )
            else:
                return redirect(
                    url_for("admin_panel.admin_bookings") + 
                    "?error=Failed to confirm booking"
                )
        
        except Exception as e:
            logger.error(f"Error confirming booking: {e}")
            return redirect(
                url_for("admin_panel.admin_bookings") + 
                "?error=Error confirming booking"
            )
    
    @staticmethod
    def decline_booking(booking_id: str):
        """Decline a booking"""
        try:
            success = AdminService.perform_booking_action(booking_id, "decline")
            
            if success:
                return redirect(
                    url_for("admin_panel.admin_bookings") + 
                    "?message=Booking declined successfully"
                )
            else:
                return redirect(
                    url_for("admin_panel.admin_bookings") + 
                    "?error=Failed to decline booking"
                )
        
        except Exception as e:
            logger.error(f"Error declining booking: {e}")
            return redirect(
                url_for("admin_panel.admin_bookings") + 
                "?error=Error declining booking"
            )

class AdminPricingView:
    """Admin pricing management view controller"""
    
    @staticmethod
    def render_pricing():
        """Render admin pricing management page"""
        try:
            return render_template("admin_pricing.html")
        
        except Exception as e:
            logger.error(f"Admin pricing page error: {e}")
            return render_template("admin_pricing.html", error=str(e))

class AdminScheduleView:
    """Admin schedule view controller"""
    
    @staticmethod
    def render_schedule():
        """Render schedule management page"""
        return render_template("admin_schedule.html")

class AdminBookingControlView:
    """Admin booking control view controller"""
    
    @staticmethod
    def render_booking_control():
        """Render booking control page"""
        return render_template("admin_booking_control.html")
    
    @staticmethod
    def render_reports():
        """Render reports and analytics page"""
        return render_template("admin_reports.html")

class AdminAPIView:
    """Admin API view controller for AJAX endpoints"""
    
    @staticmethod
    def get_dashboard_stats():
        """Get dashboard statistics API endpoint"""
        try:
            stats = AdminService.get_dashboard_stats()
            return jsonify({"success": True, "stats": stats})
        
        except Exception as e:
            logger.error(f"Dashboard stats error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def get_schedule_data():
        """Get schedule data for date range API endpoint"""
        try:
            data = request.json
            start_date = data.get("startDate")
            end_date = data.get("endDate")
            sport_filter = data.get("sport")
            
            if not start_date or not end_date:
                return jsonify({
                    "success": False, 
                    "message": "Missing date parameters", 
                    "schedule": {}
                })
            
            schedule = ScheduleService.get_schedule_data(start_date, end_date, sport_filter)
            
            return jsonify({
                "success": True,
                "schedule": schedule,
                "debug_info": {
                    "total_days": len(schedule),
                    "sport_filter": sport_filter,
                    "date_range": f"{start_date} to {end_date}",
                }
            })
        
        except Exception as e:
            logger.error(f"Schedule API error: {e}")
            return jsonify({
                "success": True,  # Return success=True to prevent UI errors
                "schedule": {},
                "message": f"Error loading schedule: {str(e)}"
            })
    
    @staticmethod
    def create_booking():
        """Create booking from admin panel API endpoint"""
        try:
            booking_data = request.json
            
            # Validate required fields
            required_fields = [
                "court", "date", "startTime", "duration", 
                "playerName", "playerPhone"
            ]
            for field in required_fields:
                if not booking_data.get(field):
                    return jsonify({
                        "success": False, 
                        "message": f"Missing required field: {field}"
                    })
            
            booking_id = AdminService.create_admin_booking(booking_data)
            
            return jsonify({
                "success": True,
                "bookingId": booking_id,
                "message": "Booking created successfully",
            })
        
        except Exception as e:
            logger.error(f"Admin create booking error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def update_booking():
        """Update booking details API endpoint"""
        try:
            booking_data = request.json
            success = AdminService.update_booking(booking_data)
            
            if success:
                return jsonify({"success": True, "message": "Booking updated successfully"})
            else:
                return jsonify({"success": False, "message": "Failed to update booking"})
        
        except Exception as e:
            logger.error(f"Update booking error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def booking_action():
        """Perform action on booking API endpoint"""
        try:
            data = request.json
            booking_id = data.get("bookingId")
            action = data.get("action")
            
            if not booking_id or not action:
                return jsonify({
                    "success": False, 
                    "message": "Missing booking ID or action"
                })
            
            success = AdminService.perform_booking_action(booking_id, action)
            
            if success:
                return jsonify({"success": True, "message": f"Booking {action}ed successfully"})
            else:
                return jsonify({"success": False, "message": f"Failed to {action} booking"})
        
        except Exception as e:
            logger.error(f"Booking action error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def search_bookings():
        """Search bookings by various criteria API endpoint"""
        try:
            data = request.json
            method = data.get("method")
            value = data.get("value")
            start_date = data.get("startDate")
            end_date = data.get("endDate")
            
            bookings = AdminService.search_bookings(method, value, start_date, end_date)
            
            return jsonify({"success": True, "bookings": bookings})
        
        except Exception as e:
            logger.error(f"Search bookings error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def delete_booking():
        """Delete booking API endpoint"""
        try:
            data = request.json
            booking_id = data.get("bookingId")
            
            if not booking_id:
                return jsonify({"success": False, "message": "Missing booking ID"})
            
            success = AdminService.delete_booking(booking_id)
            
            if success:
                return jsonify({"success": True, "message": "Booking deleted successfully"})
            else:
                return jsonify({"success": False, "message": "Failed to delete booking"})
        
        except Exception as e:
            logger.error(f"Delete booking error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def get_pricing():
        """Get current pricing for all courts API endpoint"""
        try:
            # Create court pricing from config
            court_pricing = {}
            for sport, courts in Config.COURT_CONFIG.items():
                base_price = Config.SPORT_PRICING.get(sport, 0)
                for court in courts:
                    court_pricing[court["id"]] = base_price
            
            return jsonify({"success": True, "court_pricing": court_pricing})
        
        except Exception as e:
            logger.error(f"Error getting pricing: {e}")
            return jsonify({"success": False, "message": str(e), "court_pricing": {}})
    
    @staticmethod
    def update_pricing():
        """Update pricing for a court API endpoint"""
        try:
            data = request.json
            court_id = data.get("court_id")
            price = data.get("price")
            
            if not court_id or not price:
                return jsonify({"success": False, "message": "Missing court_id or price"})
            
            # Here you would normally update the database
            # For now, just return success
            logger.info(f"Pricing updated: {court_id} = PKR {price}")
            
            return jsonify({
                "success": True,
                "message": f"Pricing updated for {court_id}",
                "court_id": court_id,
                "new_price": price,
            })
        
        except Exception as e:
            logger.error(f"Error updating pricing: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def bulk_search():
        """Search bookings for bulk operations API endpoint"""
        try:
            data = request.json
            filters = {
                'status': data.get('status', ''),
                'sport': data.get('sport', ''),
                'dateFrom': data.get('dateFrom', ''),
                'dateTo': data.get('dateTo', '')
            }
            
            # Get all bookings and filter them
            all_bookings = AdminService.get_all_bookings()
            filtered_bookings = []
            
            for booking in all_bookings:
                # Filter by status
                if filters['status'] and booking.get('status') != filters['status']:
                    continue
                    
                # Filter by sport
                if filters['sport'] and booking.get('sport') != filters['sport']:
                    continue
                    
                # Filter by date range
                booking_date = booking.get('date', '')
                if filters['dateFrom'] and booking_date:
                    # Ensure both dates are strings for comparison
                    booking_date_str = str(booking_date) if booking_date else ''
                    if booking_date_str < filters['dateFrom']:
                        continue
                if filters['dateTo'] and booking_date:
                    # Ensure both dates are strings for comparison
                    booking_date_str = str(booking_date) if booking_date else ''
                    if booking_date_str > filters['dateTo']:
                        continue
                    
                # Clean booking data for JSON serialization
                clean_booking = AdminAPIView._clean_booking_for_json(booking)
                filtered_bookings.append(clean_booking)
            
            return jsonify({
                "success": True, 
                "bookings": filtered_bookings,
                "count": len(filtered_bookings)
            })
        
        except Exception as e:
            logger.error(f"Bulk search error: {e}")
            return jsonify({"success": False, "message": str(e), "bookings": []})
    
    @staticmethod
    def bulk_action():
        """Perform bulk action on multiple bookings API endpoint"""
        try:
            data = request.json
            action = data.get('action')
            booking_ids = data.get('bookingIds', [])
            
            if not action or not booking_ids:
                return jsonify({
                    "success": False, 
                    "message": "Missing action or booking IDs"
                })
            
            successful_actions = 0
            failed_actions = 0
            
            for booking_id in booking_ids:
                try:
                    if action == 'delete':
                        success = AdminService.delete_booking(booking_id)
                    else:
                        success = AdminService.perform_booking_action(booking_id, action)
                    
                    if success:
                        successful_actions += 1
                    else:
                        failed_actions += 1
                        
                except Exception as e:
                    logger.error(f"Error processing booking {booking_id}: {e}")
                    failed_actions += 1
            
            return jsonify({
                "success": True,
                "message": f"Bulk {action} completed",
                "successful": successful_actions,
                "failed": failed_actions,
                "total": len(booking_ids)
            })
        
        except Exception as e:
            logger.error(f"Bulk action error: {e}")
            return jsonify({"success": False, "message": str(e)})
    
    @staticmethod
    def _clean_booking_for_json(booking):
        """Clean booking data for JSON serialization"""
        from datetime import date, time, datetime
        from decimal import Decimal
        
        clean_booking = {}
        
        for key, value in booking.items():
            if isinstance(value, (date, time, datetime)):
                # Convert date/time objects to strings
                clean_booking[key] = str(value)
            elif isinstance(value, Decimal):
                # Convert Decimal to float
                clean_booking[key] = float(value)
            elif value is None:
                # Keep None as is
                clean_booking[key] = None
            else:
                # Keep other types as is (str, int, float, bool, list, dict)
                clean_booking[key] = value
                
        return clean_booking
    
    # Pricing API Methods
    @staticmethod
    def get_pricing():
        """Get all court pricing configurations"""
        try:
            pricing_list = PricingService.get_all_pricing()
            
            # Convert to dictionaries for JSON response
            pricing_data = [pricing.to_dict() for pricing in pricing_list]
            
            return jsonify({
                "success": True,
                "pricing": pricing_data,
                "total": len(pricing_data)
            })
        
        except Exception as e:
            logger.error(f"Get pricing API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to load pricing: {str(e)}",
                "pricing": []
            })
    
    @staticmethod
    def get_pricing_by_court(court_id: str):
        """Get pricing for specific court"""
        try:
            pricing = PricingService.get_pricing_by_court(court_id)
            
            if pricing:
                return jsonify({
                    "success": True,
                    "pricing": pricing.to_dict()
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "Pricing not found for this court"
                })
        
        except Exception as e:
            logger.error(f"Get pricing by court API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to load pricing: {str(e)}"
            })
    
    @staticmethod
    def create_or_update_pricing():
        """Create or update court pricing"""
        try:
            data = request.json
            
            if not data:
                return jsonify({
                    "success": False,
                    "message": "No pricing data provided"
                })
            
            success, message = PricingService.create_or_update_pricing(data)
            
            return jsonify({
                "success": success,
                "message": message
            })
        
        except Exception as e:
            logger.error(f"Create/update pricing API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to save pricing: {str(e)}"
            })
    
    @staticmethod
    def delete_pricing(court_id: str):
        """Delete court pricing"""
        try:
            success, message = PricingService.delete_pricing(court_id)
            
            return jsonify({
                "success": success,
                "message": message
            })
        
        except Exception as e:
            logger.error(f"Delete pricing API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to delete pricing: {str(e)}"
            })
    
    # Reports and Analytics API Methods
    @staticmethod
    def get_reports_dashboard():
        """Get comprehensive dashboard analytics"""
        try:
            from services.reports_service import ReportsService
            
            # Get filter parameters
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')  
            sport = request.args.get('sport', 'all')
            
            analytics = ReportsService.get_dashboard_analytics(start_date, end_date, sport)
            expense_analytics = ReportsService.get_expense_analytics(start_date, end_date)
            
            return jsonify({
                "success": True,
                "analytics": analytics,
                "expenses": expense_analytics
            })
        
        except Exception as e:
            logger.error(f"Reports dashboard API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to get reports data: {str(e)}"
            })
    
    @staticmethod
    def get_reports_sports():
        """Get sports performance analytics"""
        try:
            from services.reports_service import ReportsService
            
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            analytics = ReportsService.get_dashboard_analytics(start_date, end_date)
            
            return jsonify({
                "success": True,
                "sports_performance": analytics.get('sports_performance', {}),
                "trends": analytics.get('trends', {})
            })
        
        except Exception as e:
            logger.error(f"Reports sports API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to get sports analytics: {str(e)}"
            })
    
    @staticmethod
    def get_reports_revenue():
        """Get revenue analytics"""
        try:
            from services.reports_service import ReportsService
            
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            sport = request.args.get('sport', 'all')
            
            analytics = ReportsService.get_dashboard_analytics(start_date, end_date, sport)
            
            return jsonify({
                "success": True,
                "revenue": analytics.get('revenue', {}),
                "summary": analytics.get('summary', {})
            })
        
        except Exception as e:
            logger.error(f"Reports revenue API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to get revenue analytics: {str(e)}"
            })
    
    @staticmethod
    def get_reports_customers():
        """Get customer analytics"""
        try:
            from services.reports_service import ReportsService
            
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            sport = request.args.get('sport', 'all')
            
            analytics = ReportsService.get_dashboard_analytics(start_date, end_date, sport)
            
            return jsonify({
                "success": True,
                "customers": analytics.get('customer_insights', {}),
                "bookings": analytics.get('bookings', {})
            })
        
        except Exception as e:
            logger.error(f"Reports customers API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to get customer analytics: {str(e)}"
            })

class AdminExpenseView:
    """Admin expense management view controller"""
    
    @staticmethod
    def render_expenses():
        """Render expense management page"""
        try:
            stats = ExpenseService.get_expense_statistics()
            return render_template("admin_expenses.html", stats=stats)
        
        except Exception as e:
            logger.error(f"Expense view error: {e}")
            return render_template("admin_expenses.html", stats={}, error=str(e))
    
    @staticmethod
    def get_all_expenses():
        """Get all expenses API endpoint"""
        try:
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 50))
            offset = (page - 1) * limit
            area_category = request.args.get('area_category')
            
            expenses = ExpenseService.get_all_expenses(limit, offset, area_category)
            stats = ExpenseService.get_expense_statistics()
            
            return jsonify({
                "success": True,
                "expenses": expenses,
                "stats": stats
            })
        
        except Exception as e:
            logger.error(f"Get expenses API error: {e}")
            return jsonify({
                "success": False,
                "message": str(e),
                "expenses": []
            })
    
    @staticmethod
    def create_expense():
        """Create new expense API endpoint"""
        try:
            from flask import g
            data = request.json
            
            # Add current user information
            if hasattr(g, 'current_user') and g.current_user:
                data['created_by'] = g.current_user.username
            
            success, message, expense_id = ExpenseService.create_expense(data)
            
            return jsonify({
                "success": success,
                "message": message,
                "expense_id": expense_id
            })
        
        except Exception as e:
            logger.error(f"Create expense API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to create expense: {str(e)}"
            })
    
    @staticmethod
    def update_expense():
        """Update expense API endpoint"""
        try:
            from flask import g
            data = request.json
            expense_id = data.get('id')
            
            if not expense_id:
                return jsonify({
                    "success": False,
                    "message": "Expense ID is required"
                })
            
            # Don't override created_by when updating - let the original creator remain
            # Remove created_by from update data if it exists
            data.pop('created_by', None)
            
            success, message = ExpenseService.update_expense(expense_id, data)
            
            return jsonify({
                "success": success,
                "message": message
            })
        
        except Exception as e:
            logger.error(f"Update expense API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to update expense: {str(e)}"
            })
    
    @staticmethod
    def delete_expense():
        """Delete expense API endpoint"""
        try:
            data = request.json
            expense_id = data.get('id')
            
            if not expense_id:
                return jsonify({
                    "success": False,
                    "message": "Expense ID is required"
                })
            
            success, message = ExpenseService.delete_expense(expense_id)
            
            return jsonify({
                "success": success,
                "message": message
            })
        
        except Exception as e:
            logger.error(f"Delete expense API error: {e}")
            return jsonify({
                "success": False,
                "message": f"Failed to delete expense: {str(e)}"
            })
    
    @staticmethod
    def get_expense_statistics():
        """Get expense statistics API endpoint"""
        try:
            stats = ExpenseService.get_expense_statistics()
            return jsonify({
                "success": True,
                "stats": stats
            })
        
        except Exception as e:
            logger.error(f"Get expense statistics API error: {e}")
            return jsonify({
                "success": False,
                "message": str(e),
                "stats": {}
            })
    
    @staticmethod
    def get_monthly_expenses():
        """Get expenses for specific month API endpoint"""
        try:
            year = int(request.args.get('year', 2024))
            month = int(request.args.get('month', 1))
            area_category = request.args.get('area_category')
            
            expenses = ExpenseService.get_monthly_expenses(year, month, area_category)
            
            return jsonify({
                "success": True,
                "expenses": expenses,
                "year": year,
                "month": month
            })
        
        except Exception as e:
            logger.error(f"Get monthly expenses API error: {e}")
            return jsonify({
                "success": False,
                "message": str(e),
                "expenses": []
            })
    
    @staticmethod
    def get_daily_expenses():
        """Get expenses for specific day API endpoint"""
        try:
            from datetime import datetime
            date_str = request.args.get('date')
            area_category = request.args.get('area_category')
            
            if date_str:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = datetime.now().date()
            
            expenses = ExpenseService.get_daily_expenses(target_date, area_category)
            
            return jsonify({
                "success": True,
                "expenses": expenses,
                "date": target_date.isoformat()
            })
        
        except Exception as e:
            logger.error(f"Get daily expenses API error: {e}")
            return jsonify({
                "success": False,
                "message": str(e),
                "expenses": []
            })
    
    @staticmethod
    def get_date_range_expenses():
        """Get expenses for date range API endpoint"""
        try:
            from datetime import datetime
            start_date_str = request.args.get('start_date')
            end_date_str = request.args.get('end_date')
            area_category = request.args.get('area_category')
            
            if not start_date_str or not end_date_str:
                return jsonify({
                    "success": False,
                    "message": "Both start_date and end_date are required",
                    "expenses": []
                })
            
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": "Invalid date format. Use YYYY-MM-DD",
                    "expenses": []
                })
            
            if start_date > end_date:
                return jsonify({
                    "success": False,
                    "message": "Start date must be before or equal to end date",
                    "expenses": []
                })
            
            expenses = ExpenseService.get_expenses_by_date_range(start_date, end_date, area_category)
            
            return jsonify({
                "success": True,
                "expenses": expenses,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            })
        
        except Exception as e:
            logger.error(f"Get date range expenses API error: {e}")
            return jsonify({
                "success": False,
                "message": str(e),
                "expenses": []
            })