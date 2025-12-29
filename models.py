"""
Data models and structures for NoBall Sports Club application.
"""
from dataclasses import dataclass
from datetime import datetime, date, time
from typing import List, Dict, Optional
import json
import hashlib
import secrets

@dataclass
class Booking:
    """Booking data model"""
    id: str
    sport: str
    court: str
    court_name: str
    booking_date: date
    start_time: time
    end_time: time
    duration: float
    selected_slots: List[Dict]
    player_name: str
    player_phone: str
    player_email: Optional[str] = None
    player_count: str = "2"
    special_requests: Optional[str] = None
    payment_type: str = "advance"
    total_amount: int = 0
    status: str = "pending_payment"
    payment_verified: bool = False
    created_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert booking to dictionary"""
        data = {
            'id': self.id,
            'sport': self.sport,
            'court': self.court,
            'court_name': self.court_name,
            'booking_date': self.booking_date.isoformat() if isinstance(self.booking_date, date) else str(self.booking_date),
            'start_time': self.start_time.strftime('%H:%M') if isinstance(self.start_time, time) else str(self.start_time),
            'end_time': self.end_time.strftime('%H:%M') if isinstance(self.end_time, time) else str(self.end_time),
            'duration': self.duration,
            'selected_slots': self.selected_slots,
            'player_name': self.player_name,
            'player_phone': self.player_phone,
            'player_email': self.player_email or '',
            'player_count': self.player_count,
            'special_requests': self.special_requests or '',
            'payment_type': self.payment_type,
            'total_amount': self.total_amount,
            'status': self.status,
            'payment_verified': self.payment_verified
        }
        
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.confirmed_at:
            data['confirmed_at'] = self.confirmed_at.isoformat()
        if self.cancelled_at:
            data['cancelled_at'] = self.cancelled_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Booking':
        """Create booking from dictionary"""
        return cls(
            id=data.get('id', ''),
            sport=data.get('sport', ''),
            court=data.get('court', ''),
            court_name=data.get('court_name', ''),
            booking_date=data.get('booking_date'),
            start_time=data.get('start_time'),
            end_time=data.get('end_time'),
            duration=float(data.get('duration', 1.0)),
            selected_slots=data.get('selected_slots', []),
            player_name=data.get('player_name', ''),
            player_phone=data.get('player_phone', ''),
            player_email=data.get('player_email'),
            player_count=data.get('player_count', '2'),
            special_requests=data.get('special_requests'),
            payment_type=data.get('payment_type', 'advance'),
            total_amount=int(data.get('total_amount', 0)),
            status=data.get('status', 'pending_payment'),
            payment_verified=bool(data.get('payment_verified', False)),
            created_at=data.get('created_at'),
            confirmed_at=data.get('confirmed_at'),
            cancelled_at=data.get('cancelled_at')
        )

@dataclass
class Contact:
    """Contact form data model"""
    id: Optional[int] = None
    name: str = ''
    email: str = ''
    phone: str = ''
    sport: Optional[str] = None
    message: str = ''
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert contact to dictionary"""
        data = {
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'sport': self.sport,
            'message': self.message
        }
        
        if self.id:
            data['id'] = self.id
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Contact':
        """Create contact from dictionary"""
        return cls(
            id=data.get('id'),
            name=data.get('name', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            sport=data.get('sport'),
            message=data.get('message', ''),
            created_at=data.get('created_at')
        )

@dataclass
class Court:
    """Court data model"""
    id: str
    name: str
    sport: str
    pricing: int
    is_multi_purpose: bool = False
    multi_purpose_group: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert court to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'sport': self.sport,
            'pricing': self.pricing,
            'is_multi_purpose': self.is_multi_purpose,
            'multi_purpose_group': self.multi_purpose_group
        }

@dataclass
class TimeSlot:
    """Time slot data model"""
    time: str
    status: str = "available"  # available, booked, conflict
    booking_id: Optional[str] = None
    player_name: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert time slot to dictionary"""
        return {
            'time': self.time,
            'status': self.status,
            'booking_id': self.booking_id,
            'player_name': self.player_name
        }

class BookingStatus:
    """Booking status constants"""
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    
    @classmethod
    def get_all_statuses(cls) -> List[str]:
        return [cls.PENDING_PAYMENT, cls.CONFIRMED, cls.CANCELLED]

@dataclass
class BlockedSlot:
    """Blocked slot data model"""
    id: Optional[int] = None
    court: str = ''
    date: str = ''  # YYYY-MM-DD format
    time_slot: str = ''  # HH:MM format
    reason: str = ''
    blocked_by: str = 'admin'  # admin user who blocked it
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert blocked slot to dictionary"""
        data = {
            'court': self.court,
            'date': self.date,
            'time_slot': self.time_slot,
            'reason': self.reason,
            'blocked_by': self.blocked_by
        }
        
        if self.id:
            data['id'] = self.id
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'BlockedSlot':
        """Create blocked slot from dictionary"""
        return cls(
            id=data.get('id'),
            court=data.get('court', ''),
            date=data.get('date', ''),
            time_slot=data.get('time_slot', ''),
            reason=data.get('reason', ''),
            blocked_by=data.get('blocked_by', 'admin'),
            created_at=data.get('created_at')
        )

@dataclass
class Expense:
    """Expense data model for tracking daily and monthly costs"""
    id: Optional[int] = None
    title: str = ''
    description: Optional[str] = None
    amount: float = 0.0
    category: str = ''  # utilities, maintenance, equipment, staff, marketing, other
    area_category: str = 'both'  # a, b, both - which area this expense belongs to
    expense_date: date = None
    expense_type: str = 'one_time'  # one_time, recurring, monthly
    recurring_frequency: Optional[str] = None  # daily, weekly, monthly
    created_by: str = 'admin'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert expense to dictionary"""
        data = {
            'title': self.title,
            'description': self.description or '',
            'amount': float(self.amount),
            'category': self.category,
            'area_category': self.area_category,
            'expense_date': self.expense_date.isoformat() if isinstance(self.expense_date, date) else str(self.expense_date),
            'expense_type': self.expense_type,
            'recurring_frequency': self.recurring_frequency,
            'created_by': self.created_by
        }
        
        if self.id:
            data['id'] = self.id
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Expense':
        """Create expense from dictionary"""
        expense_date = data.get('expense_date')
        if isinstance(expense_date, str):
            expense_date = datetime.strptime(expense_date, '%Y-%m-%d').date()
            
        return cls(
            id=data.get('id'),
            title=data.get('title', ''),
            description=data.get('description'),
            amount=float(data.get('amount', 0.0)),
            category=data.get('category', ''),
            area_category=data.get('area_category', 'both'),
            expense_date=expense_date,
            expense_type=data.get('expense_type', 'one_time'),
            recurring_frequency=data.get('recurring_frequency'),
            created_by=data.get('created_by', 'admin'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )

class ExpenseCategory:
    """Expense category constants"""
    UTILITIES = "utilities"
    MAINTENANCE = "maintenance" 
    EQUIPMENT = "equipment"
    STAFF = "staff"
    MARKETING = "marketing"
    SUPPLIES = "supplies"
    RENT = "rent"
    OTHER = "other"
    
    @classmethod
    def get_all_categories(cls) -> List[str]:
        return [
            cls.UTILITIES, cls.MAINTENANCE, cls.EQUIPMENT, 
            cls.STAFF, cls.MARKETING, cls.SUPPLIES, cls.RENT, cls.OTHER
        ]
    
    @classmethod
    def get_category_display_name(cls, category: str) -> str:
        """Get display name for category"""
        display_names = {
            cls.UTILITIES: "Utilities & Bills",
            cls.MAINTENANCE: "Maintenance & Repairs", 
            cls.EQUIPMENT: "Equipment & Gear",
            cls.STAFF: "Staff & Payroll",
            cls.MARKETING: "Marketing & Advertising",
            cls.SUPPLIES: "Supplies & Materials",
            cls.RENT: "Rent & Property",
            cls.OTHER: "Other Expenses"
        }
        return display_names.get(category, category.title())

class ExpenseAreaCategory:
    """Area category constants for expenses"""
    AREA_A = "a"
    AREA_B = "b"
    BOTH = "both"
    
    @classmethod
    def get_all_areas(cls) -> List[str]:
        return [cls.AREA_A, cls.AREA_B, cls.BOTH]
    
    @classmethod
    def get_area_display_name(cls, area: str) -> str:
        """Get display name for area category"""
        display_names = {
            cls.AREA_A: "Area A",
            cls.AREA_B: "Area B", 
            cls.BOTH: "Both Areas"
        }
        return display_names.get(area, area.title())

class PaymentType:
    """Payment type constants"""
    ADVANCE = "advance"
    FULL = "full"
    
    @classmethod
    def get_all_types(cls) -> List[str]:
        return [cls.ADVANCE, cls.FULL]

@dataclass
class CourtPricing:
    """Court pricing data model for dynamic pricing management"""
    id: Optional[int] = None
    court_id: str = ''  # e.g., 'padel-1', 'cricket-1'
    court_name: str = ''  # e.g., 'Court 1: Purple Mondo'
    sport: str = ''  # e.g., 'padel', 'cricket'
    base_price: int = 0  # Price per 30-minute slot in PKR
    peak_price: Optional[int] = None  # Peak hours pricing (optional)
    off_peak_price: Optional[int] = None  # Off-peak pricing (optional)
    weekend_price: Optional[int] = None  # Weekend pricing (optional)
    is_active: bool = True  # Whether this pricing is currently active
    effective_from: Optional[date] = None  # When this pricing becomes effective
    effective_until: Optional[date] = None  # When this pricing expires
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert court pricing to dictionary"""
        data = {
            'court_id': self.court_id,
            'court_name': self.court_name,
            'sport': self.sport,
            'base_price': self.base_price,
            'peak_price': self.peak_price,
            'off_peak_price': self.off_peak_price,
            'weekend_price': self.weekend_price,
            'is_active': self.is_active
        }
        
        if self.id:
            data['id'] = self.id
        if self.effective_from:
            data['effective_from'] = self.effective_from.isoformat()
        if self.effective_until:
            data['effective_until'] = self.effective_until.isoformat()
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'CourtPricing':
        """Create court pricing from dictionary"""
        return cls(
            id=data.get('id'),
            court_id=data.get('court_id', ''),
            court_name=data.get('court_name', ''),
            sport=data.get('sport', ''),
            base_price=int(data.get('base_price', 0)),
            peak_price=int(data.get('peak_price')) if data.get('peak_price') else None,
            off_peak_price=int(data.get('off_peak_price')) if data.get('off_peak_price') else None,
            weekend_price=int(data.get('weekend_price')) if data.get('weekend_price') else None,
            is_active=bool(data.get('is_active', True)),
            effective_from=data.get('effective_from'),
            effective_until=data.get('effective_until'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )


@dataclass
class PromoCode:
    """Promo code data model"""
    code: str
    description: str
    discount_type: str  # 'percentage' or 'fixed_amount'
    discount_value: int  # percentage (1-100) or fixed amount in PKR
    min_amount: Optional[int] = None  # minimum booking amount required
    max_discount: Optional[int] = None  # maximum discount limit for percentage discounts
    usage_limit: Optional[int] = None  # maximum number of uses (None = unlimited)
    usage_count: int = 0  # current number of uses
    is_active: bool = True
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    applicable_sports: Optional[List[str]] = None  # None = all sports
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert promo code to dictionary"""
        data = {
            'code': self.code,
            'description': self.description,
            'discount_type': self.discount_type,
            'discount_value': self.discount_value,
            'min_amount': self.min_amount,
            'max_discount': self.max_discount,
            'usage_limit': self.usage_limit,
            'usage_count': self.usage_count,
            'is_active': self.is_active,
            'applicable_sports': json.dumps(self.applicable_sports) if self.applicable_sports else None
        }
        
        if self.id:
            data['id'] = self.id
        if self.valid_from:
            data['valid_from'] = self.valid_from.isoformat() if isinstance(self.valid_from, date) else str(self.valid_from)
        if self.valid_until:
            data['valid_until'] = self.valid_until.isoformat() if isinstance(self.valid_until, date) else str(self.valid_until)
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'PromoCode':
        """Create promo code from dictionary"""
        applicable_sports = None
        if data.get('applicable_sports'):
            try:
                applicable_sports = json.loads(data.get('applicable_sports'))
            except (json.JSONDecodeError, TypeError):
                applicable_sports = None
                
        return cls(
            id=data.get('id'),
            code=data.get('code', ''),
            description=data.get('description', ''),
            discount_type=data.get('discount_type', 'percentage'),
            discount_value=int(data.get('discount_value', 0)),
            min_amount=int(data.get('min_amount')) if data.get('min_amount') else None,
            max_discount=int(data.get('max_discount')) if data.get('max_discount') else None,
            usage_limit=int(data.get('usage_limit')) if data.get('usage_limit') else None,
            usage_count=int(data.get('usage_count', 0)),
            is_active=bool(data.get('is_active', True)),
            valid_from=data.get('valid_from'),
            valid_until=data.get('valid_until'),
            applicable_sports=applicable_sports,
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )

@dataclass
class AdminUser:
    """Admin user data model"""
    id: Optional[int] = None
    username: str = ''
    password_hash: str = ''
    role: str = 'staff'  # super_admin, admin, staff
    is_active: bool = True
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    
    def set_password(self, password: str):
        """Hash and set password"""
        salt = secrets.token_hex(16)
        self.password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() + ':' + salt
    
    def check_password(self, password: str) -> bool:
        """Check if provided password matches stored hash"""
        try:
            stored_hash, salt = self.password_hash.split(':')
            return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() == stored_hash
        except (ValueError, AttributeError):
            return False
    
    def to_dict(self) -> Dict:
        """Convert admin user to dictionary"""
        data = {
            'username': self.username,
            'role': self.role,
            'is_active': self.is_active,
            'created_by': self.created_by
        }
        
        if self.id:
            data['id'] = self.id
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        if self.last_login:
            data['last_login'] = self.last_login.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AdminUser':
        """Create admin user from dictionary"""
        return cls(
            id=data.get('id'),
            username=data.get('username', ''),
            password_hash=data.get('password_hash', ''),
            role=data.get('role', 'staff'),
            is_active=bool(data.get('is_active', True)),
            created_by=data.get('created_by'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            last_login=data.get('last_login')
        )

class AdminRole:
    """Admin role constants"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    STAFF = "staff"
    
    @classmethod
    def get_all_roles(cls) -> List[str]:
        return [cls.SUPER_ADMIN, cls.ADMIN, cls.STAFF]
    
    @classmethod
    def get_role_permissions(cls, role: str) -> List[str]:
        """Get permissions for each role"""
        permissions = {
            cls.SUPER_ADMIN: [
                'view_dashboard', 'view_schedule', 'view_bookings', 'view_pricing',
                'view_promo_codes', 'view_expenses', 'view_reports', 'view_revenue',
                'manage_bookings', 'manage_schedule', 'manage_pricing', 
                'manage_promo_codes', 'manage_expenses', 'manage_users', 'manage_content',
                'edit_users', 'lock_users', 'create_users', 'view_logs', 'delete_logs'
            ],
            cls.ADMIN: [
                'view_dashboard', 'view_schedule', 'view_bookings', 'view_pricing',
                'view_promo_codes', 'view_expenses', 'view_reports', 'view_revenue',
                'manage_bookings', 'manage_schedule', 'manage_pricing', 
                'manage_promo_codes', 'manage_expenses', 'manage_content', 'view_logs'
            ],
            cls.STAFF: [
                'view_dashboard', 'view_schedule', 'view_bookings', 'manage_bookings'
            ]
        }
        return permissions.get(role, [])

@dataclass
class ActivityLog:
    """Activity log data model for tracking admin operations"""
    id: Optional[int] = None
    user_id: int = 0
    username: str = ''
    action: str = ''  # created, updated, deleted, confirmed, cancelled, etc.
    entity_type: str = ''  # booking, expense, user, etc.
    entity_id: str = ''  # ID of the affected entity
    entity_name: str = ''  # Name/description of the entity (e.g., customer name, expense title)
    details: Optional[str] = None  # Additional details about the action
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert activity log to dictionary"""
        data = {
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'entity_name': self.entity_name,
            'details': self.details,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent
        }
        
        if self.id:
            data['id'] = self.id
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
            
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ActivityLog':
        """Create activity log from dictionary"""
        return cls(
            id=data.get('id'),
            user_id=int(data.get('user_id')) if data.get('user_id') is not None else None,
            username=data.get('username', ''),
            action=data.get('action', ''),
            entity_type=data.get('entity_type', ''),
            entity_id=str(data.get('entity_id', '')),
            entity_name=data.get('entity_name', ''),
            details=data.get('details'),
            ip_address=data.get('ip_address'),
            user_agent=data.get('user_agent'),
            created_at=data.get('created_at')
        )

class ActivityType:
    """Activity type constants"""
    # Booking actions
    BOOKING_CREATED = "booking_created"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_UPDATED = "booking_updated"
    BOOKING_DELETED = "booking_deleted"
    
    # Expense actions
    EXPENSE_CREATED = "expense_created"
    EXPENSE_UPDATED = "expense_updated"
    EXPENSE_DELETED = "expense_deleted"
    
    # User actions
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_LOCKED = "user_locked"
    USER_UNLOCKED = "user_unlocked"
    USER_PASSWORD_CHANGED = "user_password_changed"
    
    # Pricing actions
    PRICING_UPDATED = "pricing_updated"
    PROMO_CREATED = "promo_created"
    PROMO_UPDATED = "promo_updated"
    PROMO_DELETED = "promo_deleted"
    
    # Schedule actions
    SLOT_BLOCKED = "slot_blocked"
    SLOT_UNBLOCKED = "slot_unblocked"
    
    @classmethod
    def get_display_name(cls, action: str) -> str:
        """Get user-friendly display name for action"""
        display_names = {
            cls.BOOKING_CREATED: "Created booking",
            cls.BOOKING_CONFIRMED: "Confirmed booking",
            cls.BOOKING_CANCELLED: "Cancelled booking",
            cls.BOOKING_UPDATED: "Updated booking",
            cls.BOOKING_DELETED: "Deleted booking",
            cls.EXPENSE_CREATED: "Created expense",
            cls.EXPENSE_UPDATED: "Updated expense", 
            cls.EXPENSE_DELETED: "Deleted expense",
            cls.USER_CREATED: "Created user",
            cls.USER_UPDATED: "Updated user",
            cls.USER_LOCKED: "Locked user",
            cls.USER_UNLOCKED: "Unlocked user",
            cls.USER_PASSWORD_CHANGED: "Changed user password",
            cls.PRICING_UPDATED: "Updated pricing",
            cls.PROMO_CREATED: "Created promo code",
            cls.PROMO_UPDATED: "Updated promo code",
            cls.PROMO_DELETED: "Deleted promo code",
            cls.SLOT_BLOCKED: "Blocked time slot",
            cls.SLOT_UNBLOCKED: "Unblocked time slot"
        }
        return display_names.get(action, action.replace('_', ' ').title())
