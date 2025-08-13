// Professional Admin Expenses Management System
// Clean, maintainable, and well-structured

class ExpensesManager {
    constructor() {
        this.currentView = 'all';
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentAreaFilter = 'all';
        this.expenses = [];
        this.stats = {};
        this.editingExpense = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadExpenses();
        this.updateStats();
        console.log("✅ Expenses Manager initialized successfully");
    }
    
    setupEventListeners() {
        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });
        
        // Date filter
        const filterDate = document.getElementById('filter-date');
        if (filterDate) {
            filterDate.value = this.currentDate;
        }
        
        // Area filter
        const areaFilter = document.getElementById('area-filter');
        if (areaFilter) {
            areaFilter.addEventListener('change', (e) => {
                this.currentAreaFilter = e.target.value;
                this.loadExpenses();
            });
        }
        
        // Form submission
        const form = document.getElementById('expenseForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveExpense();
            });
        }
        
        console.log("✅ Event listeners setup complete");
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Update active button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Show/hide date filter
        const dateFilter = document.getElementById('date-filter');
        const expensesTitle = document.getElementById('expenses-title');
        
        if (view === 'daily' || view === 'monthly') {
            dateFilter.style.display = 'block';
            expensesTitle.textContent = view === 'daily' ? 'Daily Expenses' : 'Monthly Expenses';
        } else {
            dateFilter.style.display = 'none';
            expensesTitle.textContent = 'All Expenses';
        }
        
        // Load appropriate data
        this.loadExpenses();
    }
    
    async loadExpenses() {
        try {
            this.showLoading();
            
            let url = '/admin/api/expenses';
            const params = new URLSearchParams();
            
            // Add area filter parameter
            if (this.currentAreaFilter && this.currentAreaFilter !== 'all') {
                params.append('area_category', this.currentAreaFilter);
            }
            
            if (this.currentView === 'daily') {
                url = `/admin/api/expenses/daily`;
                params.append('date', this.currentDate);
            } else if (this.currentView === 'monthly') {
                const date = new Date(this.currentDate);
                url = `/admin/api/expenses/monthly`;
                params.append('year', date.getFullYear());
                params.append('month', date.getMonth() + 1);
            }
            
            // Add parameters to URL if any exist
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                this.expenses = data.expenses || [];
                this.renderExpenses();
            } else {
                this.showError('Failed to load expenses: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.showError('Error loading expenses: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    renderExpenses() {
        const container = document.getElementById('expenses-container');
        
        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fs-1 text-muted"></i>
                    <h5 class="text-muted mt-3">No expenses found</h5>
                    <p class="text-muted">Start by adding your first expense</p>
                </div>
            `;
            return;
        }
        
        const expensesHtml = this.expenses.map(expense => this.createExpenseCard(expense)).join('');
        container.innerHTML = expensesHtml;
    }
    
    createExpenseCard(expense) {
        const categoryClass = `category-${expense.category}`;
        const amount = parseFloat(expense.amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        const expenseDate = new Date(expense.expense_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <div class="expense-card">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <div class="d-flex align-items-start">
                                <div class="flex-grow-1">
                                    <h6 class="mb-1 fw-bold">${expense.title}</h6>
                                    <p class="text-muted small mb-2">${expense.description || 'No description'}</p>
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="category-badge ${categoryClass}">
                                            ${this.getCategoryDisplayName(expense.category)}
                                        </span>
                                        <span class="area-badge area-${expense.area_category}">
                                            ${this.getAreaDisplayName(expense.area_category)}
                                        </span>
                                        <small class="text-muted">
                                            <i class="fas fa-calendar me-1"></i>
                                            ${expenseDate}
                                        </small>
                                        ${expense.created_by ? 
                                            `<small class="text-muted ms-2">
                                                <i class="fas fa-user me-1"></i>
                                                by ${expense.created_by}
                                            </small>` : ''
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="amount-display">
                                PKR ${amount}
                            </div>
                            ${expense.expense_type !== 'one_time' ? 
                                `<small class="text-muted">
                                    <i class="fas fa-repeat me-1"></i>
                                    ${expense.recurring_frequency || expense.expense_type}
                                </small>` : ''
                            }
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex gap-2 justify-content-end">
                                <button class="btn btn-sm btn-edit" onclick="expensesManager.editExpense(${expense.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="expensesManager.deleteExpense(${expense.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getCategoryDisplayName(category) {
        const displayNames = {
            'utilities': 'Utilities & Bills',
            'maintenance': 'Maintenance & Repairs',
            'equipment': 'Equipment & Gear',
            'staff': 'Staff & Payroll',
            'marketing': 'Marketing & Advertising',
            'supplies': 'Supplies & Materials',
            'rent': 'Rent & Property',
            'other': 'Other Expenses'
        };
        return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    getAreaDisplayName(areaCategory) {
        const displayNames = {
            'a': 'Area A',
            'b': 'Area B',
            'both': 'Both Areas'
        };
        return displayNames[areaCategory] || 'Both Areas';
    }
    
    async updateStats() {
        try {
            const response = await fetch('/admin/api/expenses/statistics');
            const data = await response.json();
            
            if (data.success) {
                this.stats = data.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    updateStatsDisplay() {
        const totalExpenses = document.getElementById('total-expenses');
        const totalAmount = document.getElementById('total-amount');
        const monthlyAmount = document.getElementById('monthly-amount');
        const dailyAmount = document.getElementById('daily-amount');
        
        if (totalExpenses) totalExpenses.textContent = this.stats.total_expenses || 0;
        if (totalAmount) totalAmount.textContent = `PKR ${(this.stats.total_amount || 0).toLocaleString()}`;
        if (monthlyAmount) monthlyAmount.textContent = `PKR ${(this.stats.monthly_amount || 0).toLocaleString()}`;
        if (dailyAmount) dailyAmount.textContent = `PKR ${(this.stats.daily_amount || 0).toLocaleString()}`;
        
        // Update area-wise statistics
        const areaAAmount = document.getElementById('area-a-amount');
        const areaACount = document.getElementById('area-a-count');
        const areaBAmount = document.getElementById('area-b-amount');
        const areaBCount = document.getElementById('area-b-count');
        const areaBothAmount = document.getElementById('area-both-amount');
        const areaBothCount = document.getElementById('area-both-count');
        
        if (areaAAmount) areaAAmount.textContent = `PKR ${(this.stats.area_a_amount || 0).toLocaleString()}`;
        if (areaACount) areaACount.textContent = this.stats.area_a_count || 0;
        if (areaBAmount) areaBAmount.textContent = `PKR ${(this.stats.area_b_amount || 0).toLocaleString()}`;
        if (areaBCount) areaBCount.textContent = this.stats.area_b_count || 0;
        if (areaBothAmount) areaBothAmount.textContent = `PKR ${(this.stats.area_both_amount || 0).toLocaleString()}`;
        if (areaBothCount) areaBothCount.textContent = this.stats.area_both_count || 0;
    }
    
    showAddExpenseModal() {
        this.editingExpense = null;
        this.resetForm();
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-receipt me-2"></i>Add New Expense';
        
        // Set default date to today
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        
        const modal = new bootstrap.Modal(document.getElementById('expenseModal'));
        modal.show();
    }
    
    async editExpense(expenseId) {
        try {
            // Find expense in current list
            const expense = this.expenses.find(e => e.id === expenseId);
            if (!expense) {
                this.showError('Expense not found');
                return;
            }
            
            this.editingExpense = expense;
            this.populateForm(expense);
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Expense';
            
            const modal = new bootstrap.Modal(document.getElementById('expenseModal'));
            modal.show();
        } catch (error) {
            console.error('Error editing expense:', error);
            this.showError('Error loading expense for editing');
        }
    }
    
    populateForm(expense) {
        document.getElementById('expenseId').value = expense.id;
        document.getElementById('expenseTitle').value = expense.title;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expenseCategory').value = expense.category;
        document.getElementById('expenseAreaCategory').value = expense.area_category || 'both';
        document.getElementById('expenseDate').value = expense.expense_date;
        document.getElementById('expenseDescription').value = expense.description || '';
        document.getElementById('expenseType').value = expense.expense_type;
        document.getElementById('recurringFrequency').value = expense.recurring_frequency || '';
    }
    
    resetForm() {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseId').value = '';
    }
    
    async saveExpense() {
        try {
            const form = document.getElementById('expenseForm');
            const formData = new FormData(form);
            const expenseData = {};
            
            for (let [key, value] of formData.entries()) {
                expenseData[key] = value;
            }
            
            // Validation
            if (!expenseData.title || !expenseData.amount || !expenseData.category || !expenseData.expense_date) {
                this.showError('Please fill in all required fields');
                return;
            }
            
            if (parseFloat(expenseData.amount) <= 0) {
                this.showError('Amount must be greater than 0');
                return;
            }
            
            this.setLoading(true);
            
            let url = '/admin/api/expenses';
            let method = 'POST';
            
            if (this.editingExpense) {
                url = `/admin/api/expenses/${this.editingExpense.id}`;
                method = 'PUT';
                expenseData.id = this.editingExpense.id;
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expenseData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                bootstrap.Modal.getInstance(document.getElementById('expenseModal')).hide();
                await this.loadExpenses();
                await this.updateStats();
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            this.showError('Error saving expense: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }
    
    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/api/expenses/${expenseId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: expenseId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                await this.loadExpenses();
                await this.updateStats();
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showError('Error deleting expense: ' + error.message);
        }
    }
    
    applyDateFilter() {
        const filterDate = document.getElementById('filter-date');
        this.currentDate = filterDate.value;
        this.loadExpenses();
    }
    
    showLoading() {
        const container = document.getElementById('expenses-container');
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin fs-2 text-muted"></i>
                <p class="text-muted mt-2">Loading expenses...</p>
            </div>
        `;
    }
    
    hideLoading() {
        // Loading will be replaced by renderExpenses()
    }
    
    setLoading(loading) {
        const btn = document.querySelector('#expenseModal .btn-success');
        const spinner = btn.querySelector('.loading-spinner');
        const text = btn.querySelector('.btn-text');
        
        if (loading) {
            btn.disabled = true;
            spinner.style.display = 'inline-block';
            text.textContent = 'Saving...';
        } else {
            btn.disabled = false;
            spinner.style.display = 'none';
            text.textContent = 'Save Expense';
        }
    }
    
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type) {
        const toast = document.getElementById('toast');
        const toastBody = document.getElementById('toast-message');
        
        toastBody.textContent = message;
        toast.className = `toast ${type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Global functions for template
function showAddExpenseModal() {
    expensesManager.showAddExpenseModal();
}

function saveExpense() {
    expensesManager.saveExpense();
}

function applyDateFilter() {
    expensesManager.applyDateFilter();
}

// Initialize when DOM is loaded
let expensesManager;
document.addEventListener('DOMContentLoaded', function() {
    expensesManager = new ExpensesManager();
});