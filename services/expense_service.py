"""
Expense management service for handling expense operations.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
from decimal import Decimal
import logging

from database import DatabaseManager
from models import Expense, ExpenseCategory

logger = logging.getLogger(__name__)

class ExpenseService:
    """Service for managing expenses with daily and monthly tracking"""
    
    @staticmethod
    def create_expense(expense_data: Dict) -> Tuple[bool, str, Optional[int]]:
        """Create a new expense entry"""
        try:
            # Validate required fields
            required_fields = ['title', 'amount', 'category', 'expense_date']
            missing_fields = [field for field in required_fields if not expense_data.get(field)]
            
            if missing_fields:
                return False, f"Missing required fields: {', '.join(missing_fields)}", None
            
            # Validate amount
            try:
                amount = float(expense_data['amount'])
                if amount <= 0:
                    return False, "Amount must be greater than 0", None
            except (ValueError, TypeError):
                return False, "Invalid amount format", None
            
            # Validate category
            if expense_data['category'] not in ExpenseCategory.get_all_categories():
                return False, "Invalid expense category", None
            
            # Validate area_category
            from models import ExpenseAreaCategory
            area_category = expense_data.get('area_category', 'both')
            if area_category not in ExpenseAreaCategory.get_all_areas():
                return False, "Invalid area category", None
            
            # Validate date
            try:
                expense_date = datetime.strptime(expense_data['expense_date'], '%Y-%m-%d').date()
            except ValueError:
                return False, "Invalid date format. Use YYYY-MM-DD", None
            
            query = """
                INSERT INTO expenses (
                    title, description, amount, category, area_category, expense_date,
                    expense_type, recurring_frequency, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            params = (
                expense_data['title'].strip(),
                expense_data.get('description', '').strip() or None,
                amount,
                expense_data['category'],
                expense_data.get('area_category', 'both'),
                expense_date,
                expense_data.get('expense_type', 'one_time'),
                expense_data.get('recurring_frequency'),
                expense_data.get('created_by', 'admin')
            )
            
            result = DatabaseManager.execute_query(query, params, fetch_one=True)
            
            if result:
                # Log the expense creation activity
                try:
                    from services.activity_service import ActivityService
                    ActivityService.log_expense_created(str(result['id']), expense_data['title'], amount)
                except Exception as log_error:
                    logger.warning(f"Failed to log expense creation: {log_error}")
                
                logger.info(f"Expense created successfully: ID {result['id']}")
                return True, "Expense created successfully", result['id']
            else:
                return False, "Failed to create expense", None
                
        except Exception as e:
            logger.error(f"Error creating expense: {e}")
            return False, f"Database error: {str(e)}", None
    
    @staticmethod
    def get_all_expenses(limit: int = 100, offset: int = 0, area_category: str = None) -> List[Dict]:
        """Get all expenses with pagination and optional area filtering"""
        try:
            # Build query with optional area filter
            where_clause = ""
            params = []
            
            if area_category and area_category != 'all':
                where_clause = "WHERE area_category = %s"
                params.append(area_category)
            
            query = f"""
                SELECT id, title, description, amount, category, area_category, expense_date,
                       expense_type, recurring_frequency, created_by, created_at, updated_at
                FROM expenses
                {where_clause}
                ORDER BY expense_date DESC, created_at DESC
                LIMIT %s OFFSET %s
            """
            
            params.extend([limit, offset])
            results = DatabaseManager.execute_query(query, params)
            
            if results:
                expenses = []
                for row in results:
                    expense_dict = dict(row)
                    # Convert decimal to float for JSON serialization
                    expense_dict['amount'] = float(expense_dict['amount'])
                    expenses.append(expense_dict)
                return expenses
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching expenses: {e}")
            return []
    
    @staticmethod
    def get_expense_by_id(expense_id: int) -> Optional[Dict]:
        """Get expense by ID"""
        try:
            query = """
                SELECT id, title, description, amount, category, area_category, expense_date,
                       expense_type, recurring_frequency, created_by, created_at, updated_at
                FROM expenses
                WHERE id = %s
            """
            
            result = DatabaseManager.execute_query(query, (expense_id,), fetch_one=True)
            
            if result:
                expense_dict = dict(result)
                expense_dict['amount'] = float(expense_dict['amount'])
                return expense_dict
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching expense {expense_id}: {e}")
            return None
    
    @staticmethod
    def update_expense(expense_id: int, expense_data: Dict) -> Tuple[bool, str]:
        """Update an existing expense"""
        try:
            # Check if expense exists
            existing = ExpenseService.get_expense_by_id(expense_id)
            if not existing:
                return False, "Expense not found"
            
            # Validate amount if provided
            if 'amount' in expense_data:
                try:
                    amount = float(expense_data['amount'])
                    if amount <= 0:
                        return False, "Amount must be greater than 0"
                    expense_data['amount'] = amount
                except (ValueError, TypeError):
                    return False, "Invalid amount format"
            
            # Validate category if provided
            if 'category' in expense_data and expense_data['category'] not in ExpenseCategory.get_all_categories():
                return False, "Invalid expense category"
            
            # Validate area_category if provided
            if 'area_category' in expense_data:
                from models import ExpenseAreaCategory
                if expense_data['area_category'] not in ExpenseAreaCategory.get_all_areas():
                    return False, "Invalid area category"
            
            # Validate date if provided
            if 'expense_date' in expense_data:
                try:
                    expense_data['expense_date'] = datetime.strptime(expense_data['expense_date'], '%Y-%m-%d').date()
                except ValueError:
                    return False, "Invalid date format. Use YYYY-MM-DD"
            
            # Build dynamic update query
            update_fields = []
            update_values = []
            
            updatable_fields = ['title', 'description', 'amount', 'category', 'area_category', 'expense_date', 
                              'expense_type', 'recurring_frequency']
            
            for field in updatable_fields:
                if field in expense_data:
                    update_fields.append(f"{field} = %s")
                    update_values.append(expense_data[field])
            
            if not update_fields:
                return False, "No valid fields to update"
            
            # Add updated_at
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.append(expense_id)
            
            query = f"""
                UPDATE expenses 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id
            """
            
            result = DatabaseManager.execute_query(query, update_values, fetch_one=True)
            
            if result:
                # Log the expense update activity
                try:
                    from services.activity_service import ActivityService
                    expense_title = expense_data.get('title', existing.get('title', 'Unknown'))
                    amount = float(expense_data.get('amount', existing.get('amount', 0)))
                    ActivityService.log_expense_updated(str(expense_id), expense_title, amount)
                except Exception as log_error:
                    logger.warning(f"Failed to log expense update: {log_error}")
                
                logger.info(f"Expense {expense_id} updated successfully")
                return True, "Expense updated successfully"
            else:
                return False, "Failed to update expense"
                
        except Exception as e:
            logger.error(f"Error updating expense {expense_id}: {e}")
            return False, f"Database error: {str(e)}"
    
    @staticmethod
    def delete_expense(expense_id: int) -> Tuple[bool, str]:
        """Delete an expense"""
        try:
            # Check if expense exists
            existing = ExpenseService.get_expense_by_id(expense_id)
            if not existing:
                return False, "Expense not found"
            
            query = "DELETE FROM expenses WHERE id = %s RETURNING id"
            result = DatabaseManager.execute_query(query, (expense_id,), fetch_one=True)
            
            if result:
                # Log the expense deletion activity  
                try:
                    from services.activity_service import ActivityService
                    expense_title = existing.get('title', 'Unknown')
                    amount = float(existing.get('amount', 0))
                    ActivityService.log_activity('expense_deleted', 'expense', str(expense_id), 
                                               expense_title, f"Amount: PKR {amount:,.2f}")
                except Exception as log_error:
                    logger.warning(f"Failed to log expense deletion: {log_error}")
                
                logger.info(f"Expense {expense_id} deleted successfully")
                return True, "Expense deleted successfully"
            else:
                return False, "Failed to delete expense"
                
        except Exception as e:
            logger.error(f"Error deleting expense {expense_id}: {e}")
            return False, f"Database error: {str(e)}"
    
    @staticmethod
    def get_expenses_by_date_range(start_date: date, end_date: date, area_category: str = None) -> List[Dict]:
        """Get expenses within a date range with optional area filtering"""
        try:
            # Build query with optional area filter
            where_conditions = ["expense_date BETWEEN %s AND %s"]
            params = [start_date, end_date]
            
            if area_category and area_category != 'all':
                where_conditions.append("area_category = %s")
                params.append(area_category)
            
            query = f"""
                SELECT id, title, description, amount, category, area_category, expense_date,
                       expense_type, recurring_frequency, created_by, created_at, updated_at
                FROM expenses
                WHERE {' AND '.join(where_conditions)}
                ORDER BY expense_date DESC, created_at DESC
            """
            
            results = DatabaseManager.execute_query(query, params)
            
            if results:
                expenses = []
                for row in results:
                    expense_dict = dict(row)
                    expense_dict['amount'] = float(expense_dict['amount'])
                    expenses.append(expense_dict)
                return expenses
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching expenses by date range: {e}")
            return []
    
    @staticmethod
    def get_daily_expenses(target_date: date, area_category: str = None) -> List[Dict]:
        """Get expenses for a specific day with optional area filtering"""
        return ExpenseService.get_expenses_by_date_range(target_date, target_date, area_category)
    
    @staticmethod
    def get_monthly_expenses(year: int, month: int, area_category: str = None) -> List[Dict]:
        """Get expenses for a specific month with optional area filtering"""
        try:
            start_date = date(year, month, 1)
            # Get last day of month
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
            
            return ExpenseService.get_expenses_by_date_range(start_date, end_date, area_category)
            
        except Exception as e:
            logger.error(f"Error fetching monthly expenses: {e}")
            return []
    
    @staticmethod
    def get_expense_statistics() -> Dict:
        """Get expense statistics and summary"""
        try:
            # Get total expenses count
            total_query = "SELECT COUNT(*) as total FROM expenses"
            total_result = DatabaseManager.execute_query(total_query, fetch_one=True)
            total_expenses = total_result['total'] if total_result else 0
            
            # Get total amount
            amount_query = "SELECT COALESCE(SUM(amount), 0) as total_amount FROM expenses"
            amount_result = DatabaseManager.execute_query(amount_query, fetch_one=True)
            total_amount = float(amount_result['total_amount']) if amount_result else 0
            
            # Get monthly total for current month
            today = date.today()
            monthly_query = """
                SELECT COALESCE(SUM(amount), 0) as monthly_amount 
                FROM expenses 
                WHERE EXTRACT(YEAR FROM expense_date) = %s 
                AND EXTRACT(MONTH FROM expense_date) = %s
            """
            monthly_result = DatabaseManager.execute_query(
                monthly_query, (today.year, today.month), fetch_one=True
            )
            monthly_amount = float(monthly_result['monthly_amount']) if monthly_result else 0
            
            # Get daily total for today
            daily_query = "SELECT COALESCE(SUM(amount), 0) as daily_amount FROM expenses WHERE expense_date = %s"
            daily_result = DatabaseManager.execute_query(daily_query, (today,), fetch_one=True)
            daily_amount = float(daily_result['daily_amount']) if daily_result else 0
            
            # Get expenses by category
            category_query = """
                SELECT category, COALESCE(SUM(amount), 0) as category_amount, COUNT(*) as category_count
                FROM expenses
                GROUP BY category
                ORDER BY category_amount DESC
            """
            category_results = DatabaseManager.execute_query(category_query)
            
            categories = []
            if category_results:
                for row in category_results:
                    categories.append({
                        'category': row['category'],
                        'display_name': ExpenseCategory.get_category_display_name(row['category']),
                        'amount': float(row['category_amount']),
                        'count': row['category_count']
                    })
            
            # Get expenses by area category
            area_query = """
                SELECT area_category, COALESCE(SUM(amount), 0) as area_amount, COUNT(*) as area_count
                FROM expenses
                GROUP BY area_category
            """
            area_results = DatabaseManager.execute_query(area_query)
            
            # Initialize area statistics
            area_a_amount = 0
            area_a_count = 0
            area_b_amount = 0
            area_b_count = 0
            area_both_amount = 0
            area_both_count = 0
            
            if area_results:
                for row in area_results:
                    area_cat = row['area_category']
                    amount = float(row['area_amount'])
                    count = row['area_count']
                    
                    if area_cat == 'a':
                        area_a_amount = amount
                        area_a_count = count
                    elif area_cat == 'b':
                        area_b_amount = amount
                        area_b_count = count
                    elif area_cat == 'both':
                        area_both_amount = amount
                        area_both_count = count
            
            return {
                'total_expenses': total_expenses,
                'total_amount': total_amount,
                'monthly_amount': monthly_amount,
                'daily_amount': daily_amount,
                'categories': categories,
                'area_a_amount': area_a_amount,
                'area_a_count': area_a_count,
                'area_b_amount': area_b_amount,
                'area_b_count': area_b_count,
                'area_both_amount': area_both_amount,
                'area_both_count': area_both_count
            }
            
        except Exception as e:
            logger.error(f"Error getting expense statistics: {e}")
            return {
                'total_expenses': 0,
                'total_amount': 0,
                'monthly_amount': 0,
                'daily_amount': 0,
                'categories': []
            }