"""
Professional Reports and Analytics Service
Comprehensive business intelligence for NoBall Sports Club
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import calendar
import json
from database import DatabaseManager
import logging

logger = logging.getLogger(__name__)


class ReportsService:
    """Professional analytics and reporting service"""
    
    @staticmethod
    def get_dashboard_analytics(start_date: str = None, end_date: str = None, sport: str = None) -> Dict:
        """Get comprehensive dashboard analytics"""
        try:
            # Default to last 30 days if no dates provided
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            analytics = {
                'summary': ReportsService._get_summary_metrics(start_date, end_date, sport),
                'revenue': ReportsService._get_revenue_analytics(start_date, end_date, sport),
                'bookings': ReportsService._get_booking_analytics(start_date, end_date, sport),
                'sports_performance': ReportsService._get_sports_performance(start_date, end_date),
                'time_analysis': ReportsService._get_time_analysis(start_date, end_date, sport),
                'customer_insights': ReportsService._get_customer_insights(start_date, end_date, sport),
                'trends': ReportsService._get_trends_analysis(start_date, end_date, sport),
                'date_range': {'start': start_date, 'end': end_date, 'sport': sport}
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting dashboard analytics: {e}")
            return {}
    
    @staticmethod
    def _get_summary_metrics(start_date: str, end_date: str, sport: str = None) -> Dict:
        """Get high-level summary metrics"""
        try:
            sport_filter = ""
            params = [start_date, end_date]
            
            if sport and sport != 'all':
                sport_filter = "AND sport = %s"
                params.append(sport)
            
            query = f"""
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN status = 'pending_payment' THEN 1 END) as pending_bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as total_revenue,
                    COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as avg_booking_value,
                    COUNT(DISTINCT player_name) as unique_customers,
                    COUNT(DISTINCT court) as courts_used,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN duration END), 0) as total_hours_played
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
            """
            
            result = DatabaseManager.execute_query(query, params, fetch_one=True)
            
            if result:
                # Calculate additional metrics
                confirmation_rate = (result['confirmed_bookings'] / result['total_bookings'] * 100) if result['total_bookings'] > 0 else 0
                cancellation_rate = (result['cancelled_bookings'] / result['total_bookings'] * 100) if result['total_bookings'] > 0 else 0
                
                return {
                    'total_bookings': result['total_bookings'],
                    'confirmed_bookings': result['confirmed_bookings'],
                    'cancelled_bookings': result['cancelled_bookings'],
                    'pending_bookings': result['pending_bookings'],
                    'total_revenue': float(result['total_revenue']),
                    'avg_booking_value': float(result['avg_booking_value']),
                    'unique_customers': result['unique_customers'],
                    'courts_used': result['courts_used'],
                    'total_hours_played': float(result['total_hours_played']),
                    'confirmation_rate': round(confirmation_rate, 2),
                    'cancellation_rate': round(cancellation_rate, 2)
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting summary metrics: {e}")
            return {}
    
    @staticmethod
    def _get_revenue_analytics(start_date: str, end_date: str, sport: str = None) -> Dict:
        """Get detailed revenue analytics"""
        try:
            sport_filter = ""
            params = [start_date, end_date]
            
            if sport and sport != 'all':
                sport_filter = "AND sport = %s"
                params.append(sport)
            
            # Daily revenue trend
            daily_query = f"""
                SELECT 
                    booking_date,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as daily_revenue,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as daily_bookings
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY booking_date
                ORDER BY booking_date
            """
            
            daily_results = DatabaseManager.execute_query(daily_query, params)
            
            # Revenue by sport
            sport_query = """
                SELECT 
                    sport,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as sport_revenue,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as sport_bookings,
                    COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as avg_booking_value
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s
                GROUP BY sport
                ORDER BY sport_revenue DESC
            """
            
            sport_results = DatabaseManager.execute_query(sport_query, [start_date, end_date])
            
            # Revenue by court
            court_query = f"""
                SELECT 
                    court,
                    court_name,
                    sport,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as court_revenue,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as court_bookings
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY court, court_name, sport
                ORDER BY court_revenue DESC
            """
            
            court_results = DatabaseManager.execute_query(court_query, params)
            
            return {
                'daily_trend': [
                    {
                        'date': str(row['booking_date']),
                        'revenue': float(row['daily_revenue']),
                        'bookings': row['daily_bookings']
                    } for row in (daily_results or [])
                ],
                'by_sport': [
                    {
                        'sport': row['sport'],
                        'revenue': float(row['sport_revenue']),
                        'bookings': row['sport_bookings'],
                        'avg_value': float(row['avg_booking_value'])
                    } for row in (sport_results or [])
                ],
                'by_court': [
                    {
                        'court': row['court'],
                        'court_name': row['court_name'],
                        'sport': row['sport'],
                        'revenue': float(row['court_revenue']),
                        'bookings': row['court_bookings']
                    } for row in (court_results or [])
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting revenue analytics: {e}")
            return {}
    
    @staticmethod
    def _get_booking_analytics(start_date: str, end_date: str, sport: str = None) -> Dict:
        """Get detailed booking analytics"""
        try:
            sport_filter = ""
            params = [start_date, end_date]
            
            if sport and sport != 'all':
                sport_filter = "AND sport = %s"
                params.append(sport)
            
            # Booking status distribution
            status_query = f"""
                SELECT 
                    status,
                    COUNT(*) as count,
                    COALESCE(SUM(total_amount), 0) as total_amount
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY status
            """
            
            status_results = DatabaseManager.execute_query(status_query, params)
            
            # Booking duration analysis
            duration_query = f"""
                SELECT 
                    duration,
                    COUNT(*) as count,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY duration
                ORDER BY duration
            """
            
            duration_results = DatabaseManager.execute_query(duration_query, params)
            
            # Peak hours analysis
            peak_query = f"""
                SELECT 
                    EXTRACT(HOUR FROM start_time) as hour,
                    COUNT(*) as bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY EXTRACT(HOUR FROM start_time)
                ORDER BY hour
            """
            
            peak_results = DatabaseManager.execute_query(peak_query, params)
            
            return {
                'status_distribution': [
                    {
                        'status': row['status'],
                        'count': row['count'],
                        'amount': float(row['total_amount'])
                    } for row in (status_results or [])
                ],
                'duration_analysis': [
                    {
                        'duration': float(row['duration']),
                        'count': row['count'],
                        'revenue': float(row['revenue'])
                    } for row in (duration_results or [])
                ],
                'peak_hours': [
                    {
                        'hour': int(row['hour']),
                        'bookings': row['bookings'],
                        'revenue': float(row['revenue'])
                    } for row in (peak_results or [])
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting booking analytics: {e}")
            return {}
    
    @staticmethod
    def _get_sports_performance(start_date: str, end_date: str) -> Dict:
        """Get performance comparison across sports"""
        try:
            query = """
                SELECT 
                    sport,
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue,
                    COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as avg_booking_value,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN duration END), 0) as total_hours,
                    COUNT(DISTINCT court) as courts_count,
                    COUNT(DISTINCT player_name) as unique_customers
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s
                GROUP BY sport
                ORDER BY revenue DESC
            """
            
            results = DatabaseManager.execute_query(query, [start_date, end_date])
            
            sports_data = []
            for row in (results or []):
                confirmation_rate = (row['confirmed_bookings'] / row['total_bookings'] * 100) if row['total_bookings'] > 0 else 0
                cancellation_rate = (row['cancelled_bookings'] / row['total_bookings'] * 100) if row['total_bookings'] > 0 else 0
                
                sports_data.append({
                    'sport': row['sport'],
                    'total_bookings': row['total_bookings'],
                    'confirmed_bookings': row['confirmed_bookings'],
                    'cancelled_bookings': row['cancelled_bookings'],
                    'revenue': float(row['revenue']),
                    'avg_booking_value': float(row['avg_booking_value']),
                    'total_hours': float(row['total_hours']),
                    'courts_count': row['courts_count'],
                    'unique_customers': row['unique_customers'],
                    'confirmation_rate': round(confirmation_rate, 2),
                    'cancellation_rate': round(cancellation_rate, 2)
                })
            
            return {'sports': sports_data}
            
        except Exception as e:
            logger.error(f"Error getting sports performance: {e}")
            return {}
    
    @staticmethod
    def _get_time_analysis(start_date: str, end_date: str, sport: str = None) -> Dict:
        """Get time-based analytics"""
        try:
            sport_filter = ""
            params = [start_date, end_date]
            
            if sport and sport != 'all':
                sport_filter = "AND sport = %s"
                params.append(sport)
            
            # Weekly analysis
            weekly_query = f"""
                SELECT 
                    EXTRACT(DOW FROM booking_date) as day_of_week,
                    COUNT(*) as bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY EXTRACT(DOW FROM booking_date)
                ORDER BY day_of_week
            """
            
            weekly_results = DatabaseManager.execute_query(weekly_query, params)
            
            # Monthly trend (if date range spans multiple months)
            monthly_query = f"""
                SELECT 
                    DATE_TRUNC('month', booking_date) as month,
                    COUNT(*) as bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY DATE_TRUNC('month', booking_date)
                ORDER BY month
            """
            
            monthly_results = DatabaseManager.execute_query(monthly_query, params)
            
            # Day names mapping
            day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            
            return {
                'weekly_pattern': [
                    {
                        'day': day_names[int(row['day_of_week'])],
                        'day_num': int(row['day_of_week']),
                        'bookings': row['bookings'],
                        'revenue': float(row['revenue'])
                    } for row in (weekly_results or [])
                ],
                'monthly_trend': [
                    {
                        'month': str(row['month'])[:7],  # YYYY-MM format
                        'bookings': row['bookings'],
                        'revenue': float(row['revenue'])
                    } for row in (monthly_results or [])
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting time analysis: {e}")
            return {}
    
    @staticmethod
    def _get_customer_insights(start_date: str, end_date: str, sport: str = None) -> Dict:
        """Get customer behavior insights"""
        try:
            sport_filter = ""
            params = [start_date, end_date]
            
            if sport and sport != 'all':
                sport_filter = "AND sport = %s"
                params.append(sport)
            
            # Top customers
            customers_query = f"""
                SELECT 
                    player_name,
                    player_phone,
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as total_spent,
                    COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as avg_booking_value
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                GROUP BY player_name, player_phone
                HAVING COUNT(*) > 1
                ORDER BY total_spent DESC
                LIMIT 20
            """
            
            customers_results = DatabaseManager.execute_query(customers_query, params)
            
            # Customer frequency analysis
            frequency_query = f"""
                SELECT 
                    booking_count,
                    COUNT(*) as customers
                FROM (
                    SELECT 
                        player_name,
                        COUNT(*) as booking_count
                    FROM bookings 
                    WHERE booking_date BETWEEN %s AND %s {sport_filter}
                    GROUP BY player_name
                ) freq_data
                GROUP BY booking_count
                ORDER BY booking_count
            """
            
            frequency_results = DatabaseManager.execute_query(frequency_query, params)
            
            return {
                'top_customers': [
                    {
                        'name': row['player_name'],
                        'phone': row['player_phone'],
                        'total_bookings': row['total_bookings'],
                        'confirmed_bookings': row['confirmed_bookings'],
                        'total_spent': float(row['total_spent']),
                        'avg_booking_value': float(row['avg_booking_value'])
                    } for row in (customers_results or [])
                ],
                'frequency_distribution': [
                    {
                        'booking_count': row['booking_count'],
                        'customers': row['customers']
                    } for row in (frequency_results or [])
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting customer insights: {e}")
            return {}
    
    @staticmethod
    def _get_trends_analysis(start_date: str, end_date: str, sport: str = None) -> Dict:
        """Get trend analysis and growth metrics"""
        try:
            # Compare with previous period
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            period_days = (end_dt - start_dt).days
            
            prev_start = (start_dt - timedelta(days=period_days)).strftime('%Y-%m-%d')
            prev_end = (start_dt - timedelta(days=1)).strftime('%Y-%m-%d')
            
            sport_filter = ""
            params = [start_date, end_date, prev_start, prev_end]
            
            if sport and sport != 'all':
                sport_filter = "AND sport = %s"
                params.extend([sport, sport])
            
            query = f"""
                SELECT 
                    'current' as period,
                    COUNT(*) as total_bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue,
                    COUNT(DISTINCT player_name) as unique_customers
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
                
                UNION ALL
                
                SELECT 
                    'previous' as period,
                    COUNT(*) as total_bookings,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as revenue,
                    COUNT(DISTINCT player_name) as unique_customers
                FROM bookings 
                WHERE booking_date BETWEEN %s AND %s {sport_filter}
            """
            
            results = DatabaseManager.execute_query(query, params)
            
            current_data = {}
            previous_data = {}
            
            for row in (results or []):
                if row['period'] == 'current':
                    current_data = {
                        'bookings': row['total_bookings'],
                        'revenue': float(row['revenue']),
                        'customers': row['unique_customers']
                    }
                else:
                    previous_data = {
                        'bookings': row['total_bookings'],
                        'revenue': float(row['revenue']),
                        'customers': row['unique_customers']
                    }
            
            # Calculate growth rates
            def calculate_growth(current, previous):
                if previous == 0:
                    return 100 if current > 0 else 0
                return ((current - previous) / previous) * 100
            
            trends = {
                'current_period': current_data,
                'previous_period': previous_data,
                'growth_rates': {
                    'bookings': round(calculate_growth(current_data.get('bookings', 0), previous_data.get('bookings', 0)), 2),
                    'revenue': round(calculate_growth(current_data.get('revenue', 0), previous_data.get('revenue', 0)), 2),
                    'customers': round(calculate_growth(current_data.get('customers', 0), previous_data.get('customers', 0)), 2)
                }
            }
            
            return trends
            
        except Exception as e:
            logger.error(f"Error getting trends analysis: {e}")
            return {}
    
    @staticmethod
    def get_expense_analytics(start_date: str = None, end_date: str = None) -> Dict:
        """Get expense analytics for profit/loss analysis"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            # Total expenses
            expense_query = """
                SELECT 
                    category,
                    area_category,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as count
                FROM expenses 
                WHERE expense_date BETWEEN %s AND %s
                GROUP BY category, area_category
                ORDER BY total_amount DESC
            """
            
            expense_results = DatabaseManager.execute_query(expense_query, [start_date, end_date])
            
            # Daily expense trend
            daily_expense_query = """
                SELECT 
                    expense_date,
                    COALESCE(SUM(amount), 0) as daily_expenses
                FROM expenses 
                WHERE expense_date BETWEEN %s AND %s
                GROUP BY expense_date
                ORDER BY expense_date
            """
            
            daily_expense_results = DatabaseManager.execute_query(daily_expense_query, [start_date, end_date])
            
            return {
                'by_category': [
                    {
                        'category': row['category'],
                        'area_category': row['area_category'],
                        'amount': float(row['total_amount']),
                        'count': row['count']
                    } for row in (expense_results or [])
                ],
                'daily_trend': [
                    {
                        'date': str(row['expense_date']),
                        'expenses': float(row['daily_expenses'])
                    } for row in (daily_expense_results or [])
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting expense analytics: {e}")
            return {}