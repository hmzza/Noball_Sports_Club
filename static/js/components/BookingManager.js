/**
 * Modern Booking Manager Component
 * Handles all booking-related operations with clean architecture
 */

class BookingManager extends BaseComponent {
    getDefaultOptions() {
        return {
            courtConfig: {
                padel: [
                    { id: "padel-1", name: "Court 1: Purple Mondo" },
                    { id: "padel-2", name: "Court 2: Teracotta Court" }
                ],
                cricket: [
                    { id: "cricket-1", name: "Court 1: 110x50ft" },
                    { id: "cricket-2", name: "Court 2: 130x60ft Multi" }
                ],
                futsal: [{ id: "futsal-1", name: "Court 1: 130x60ft Multi" }],
                pickleball: [{ id: "pickleball-1", name: "Court 1: Professional" }],
                axe_throw: [{ id: "axe-1", name: "Lane 1: Axe Throw" }],
                archery: [{ id: "archery-1", name: "Lane 1: Archery Range" }]
            },
            sportPricing: {
                cricket: 3000,
                futsal: 2500,
                padel: 5500,
                pickleball: 2500,
                axe_throw: 4000,
                archery: 3500
            }
        };
    }
    
    init() {
        super.init();
        this.setState({
            currentBooking: null,
            searchResults: [],
            isLoading: false
        });
    }
    
    render() {
        // Component is rendered by HTML template
        this.setupFormDefaults();
    }
    
    bindEvents() {
        // Create booking form
        this.addEventListener('create-booking-form', 'submit', (e) => this.handleCreateBooking(e));
        this.addEventListener('create-sport', 'change', () => this.updateCourtOptions());
        this.addEventListener('create-duration', 'change', () => this.calculateAmount());
        
        // Search functionality
        this.addEventListener('booking-id-input', 'keypress', (e) => {
            if (e.key === 'Enter') this.searchById();
        });
        this.addEventListener('phone-input', 'keypress', (e) => {
            if (e.key === 'Enter') this.searchByPhone();
        });
        
        // Form validation
        this.setupFormValidation();
    }
    
    setupFormDefaults() {
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + 90);
        
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = today.toISOString().split('T')[0];
            }
            input.min = today.toISOString().split('T')[0];
            input.max = maxDate.toISOString().split('T')[0];
        });
        
        this.setupCourtDropdowns();
    }
    
    setupCourtDropdowns() {
        ['create-court', 'edit-court'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Court</option>';
            }
        });
    }
    
    updateCourtOptions() {
        const sportSelect = document.getElementById('create-sport');
        const courtSelect = document.getElementById('create-court');
        
        if (!sportSelect || !courtSelect) return;
        
        const sport = sportSelect.value;
        courtSelect.innerHTML = '<option value="">Select Court</option>';
        
        if (sport && this.options.courtConfig[sport]) {
            this.options.courtConfig[sport].forEach(court => {
                const option = document.createElement('option');
                option.value = court.id;
                option.textContent = court.name;
                courtSelect.appendChild(option);
            });
        }
        
        this.calculateAmount();
    }
    
    calculateAmount() {
        const sportSelect = document.getElementById('create-sport');
        const durationInput = document.getElementById('create-duration');
        const amountInput = document.getElementById('create-amount');
        
        if (!sportSelect || !durationInput || !amountInput) return;
        
        const sport = sportSelect.value;
        const duration = parseFloat(durationInput.value) || 0;
        
        if (sport && duration > 0) {
            const hourlyRate = this.options.sportPricing[sport] || 2500;
            const amount = Math.round(hourlyRate * duration);
            amountInput.value = amount;
        } else {
            amountInput.value = '';
        }
    }
    
    setupFormValidation() {
        const form = document.getElementById('create-booking-form');
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.id.replace('create-', '');
        let error = '';
        
        if (field.hasAttribute('required') && !value) {
            error = `${fieldName.replace('-', ' ')} is required`;
        } else {
            switch (fieldName) {
                case 'player-phone':
                    if (value && !Utils.validatePhone(value)) {
                        error = 'Please enter a valid phone number';
                    }
                    break;
                case 'player-email':
                    if (value && !Utils.validateEmail(value)) {
                        error = 'Please enter a valid email address';
                    }
                    break;
                case 'duration':
                    if (value && (parseFloat(value) <= 0 || parseFloat(value) > 6)) {
                        error = 'Duration must be between 0.5 and 6 hours';
                    }
                    break;
            }
        }
        
        this.showFieldError(field, error);
        return !error;
    }
    
    showFieldError(field, error) {
        this.clearFieldError(field);
        
        if (error) {
            field.classList.add('error');
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.style.cssText = 'color: #dc3545; font-size: 0.8rem; margin-top: 0.25rem;';
            errorEl.textContent = error;
            field.parentNode.appendChild(errorEl);
        }
    }
    
    clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }
    
    async handleCreateBooking(event) {
        event.preventDefault();
        
        const formData = this.collectFormData(event.target);
        if (!this.validateBookingData(formData)) {
            return;
        }
        
        this.setState({ isLoading: true });
        const loadingToast = toast.loading('Creating booking...');
        
        try {
            const result = await api.post('/admin-create-booking', formData);
            
            if (result.success) {
                toast.success(`Booking created successfully! ID: ${result.bookingId}`);
                event.target.reset();
                this.calculateAmount();
                this.emit('booking-created', result);
            } else {
                throw new Error(result.message || 'Failed to create booking');
            }
        } catch (error) {
            toast.error(`Failed to create booking: ${error.message}`);
        } finally {
            toast.remove(loadingToast);
            this.setState({ isLoading: false });
        }
    }
    
    collectFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData) {
            // Convert form field names to API format
            const apiKey = key.replace('create-', '').replace(/-([a-z])/g, (_, letter) => 
                letter.toUpperCase()
            );
            data[apiKey] = value;
        }
        
        // Additional processing
        if (data.duration) {
            data.duration = parseFloat(data.duration);
        }
        if (data.totalAmount) {
            data.totalAmount = parseInt(data.totalAmount);
        }
        
        return data;
    }
    
    validateBookingData(data) {
        const requiredFields = [
            'sport', 'court', 'date', 'startTime', 'duration', 
            'playerName', 'playerPhone'
        ];
        
        const errors = Utils.validateRequired(requiredFields, data);
        
        if (errors.length > 0) {
            toast.error(`Please fill in all required fields: ${errors.join(', ')}`);
            return false;
        }
        
        return true;
    }
    
    async searchById() {
        const input = document.getElementById('booking-id-input');
        const id = input?.value.trim();
        
        if (!id) {
            toast.error('Please enter a booking ID');
            return;
        }
        
        await this.performSearch('id', id);
    }
    
    async searchByPhone() {
        const input = document.getElementById('phone-input');
        const phone = input?.value.trim();
        
        if (!phone) {
            toast.error('Please enter a phone number');
            return;
        }
        
        await this.performSearch('phone', phone);
    }
    
    async performSearch(method, value, startDate = null, endDate = null) {
        this.setState({ isLoading: true });
        const loadingToast = toast.loading('Searching...');
        
        try {
            const searchData = { method };
            if (method === 'date') {
                searchData.startDate = startDate;
                searchData.endDate = endDate;
            } else {
                searchData.value = value;
            }
            
            const result = await api.post('/search-bookings', searchData);
            
            if (result.success) {
                this.setState({ searchResults: result.bookings });
                this.displaySearchResults(result.bookings);
                toast.success(`Found ${result.bookings.length} booking(s)`);
            } else {
                throw new Error(result.message || 'Search failed');
            }
        } catch (error) {
            toast.error(`Search failed: ${error.message}`);
        } finally {
            toast.remove(loadingToast);
            this.setState({ isLoading: false });
        }
    }
    
    displaySearchResults(bookings) {
        const container = document.getElementById('results-container');
        const resultsSection = document.getElementById('search-results');
        
        if (!container || !resultsSection) return;
        
        if (bookings.length === 0) {
            container.innerHTML = this.getEmptyResultsHTML();
        } else {
            container.innerHTML = bookings.map(booking => 
                this.createBookingCard(booking)
            ).join('');
        }
        
        resultsSection.style.display = 'block';
        this.bindResultEvents();
    }
    
    getEmptyResultsHTML() {
        return `
            <div class="empty-results">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3 style="margin-bottom: 0.5rem; color: #666;">No bookings found</h3>
                <p style="color: #999;">Try adjusting your search criteria</p>
            </div>
        `;
    }
    
    createBookingCard(booking) {
        const statusClass = booking.status.replace('_', '-');
        const statusText = this.getStatusText(booking.status);
        
        return `
            <div class="booking-card" data-booking-id="${booking.id}">
                <div class="booking-header">
                    <div class="booking-id">Booking #${booking.id}</div>
                    <span class="status-badge status-${statusClass}">${statusText}</span>
                </div>
                
                <div class="booking-details">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Player</label>
                            <span>${booking.playerName || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Phone</label>
                            <span>${booking.playerPhone || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Sport & Court</label>
                            <span>${(booking.sport || 'Unknown').toUpperCase()} - ${booking.courtName || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Date & Time</label>
                            <span>${booking.formatted_time || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Amount</label>
                            <span>${Utils.formatCurrency(booking.totalAmount || 0)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Duration</label>
                            <span>${booking.duration || 0}h</span>
                        </div>
                    </div>
                </div>
                
                <div class="booking-actions">
                    <button class="action-btn edit-btn" data-booking-id="${booking.id}" data-action="edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" data-booking-id="${booking.id}" data-action="delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ${this.getStatusButtons(booking)}
                </div>
            </div>
        `;
    }
    
    getStatusButtons(booking) {
        const buttons = [];
        
        if (booking.status === 'pending_payment') {
            buttons.push(`
                <button class="action-btn confirm-btn" data-booking-id="${booking.id}" data-action="confirm">
                    <i class="fas fa-check"></i> Confirm
                </button>
            `);
        }
        
        if (booking.status === 'confirmed') {
            buttons.push(`
                <button class="action-btn cancel-btn" data-booking-id="${booking.id}" data-action="cancel">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            `);
        }
        
        return buttons.join('');
    }
    
    bindResultEvents() {
        const container = document.getElementById('results-container');
        if (!container) return;
        
        container.addEventListener('click', async (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;
            
            const bookingId = button.dataset.bookingId;
            const action = button.dataset.action;
            
            switch (action) {
                case 'edit':
                    this.editBooking(bookingId);
                    break;
                case 'delete':
                    await this.deleteBooking(bookingId);
                    break;
                case 'confirm':
                case 'cancel':
                    await this.performBookingAction(bookingId, action);
                    break;
            }
        });
    }
    
    editBooking(bookingId) {
        // Navigate to booking control with pre-selected booking
        window.location.href = `/admin/booking-control?booking=${bookingId}`;
    }
    
    async deleteBooking(bookingId) {
        const confirmed = confirm('Are you sure you want to delete this booking? This action cannot be undone.');
        if (!confirmed) return;
        
        const loadingToast = toast.loading('Deleting booking...');
        
        try {
            const result = await api.post('/delete-booking', { bookingId });
            
            if (result.success) {
                toast.success('Booking deleted successfully!');
                // Remove from UI
                const card = document.querySelector(`[data-booking-id="${bookingId}"]`);
                if (card) {
                    card.remove();
                }
                this.emit('booking-deleted', { bookingId });
            } else {
                throw new Error(result.message || 'Failed to delete booking');
            }
        } catch (error) {
            toast.error(`Failed to delete booking: ${error.message}`);
        } finally {
            toast.remove(loadingToast);
        }
    }
    
    async performBookingAction(bookingId, action) {
        const confirmed = confirm(`Are you sure you want to ${action} this booking?`);
        if (!confirmed) return;
        
        const loadingToast = toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing booking...`);
        
        try {
            const result = await api.post('/admin-booking-action', { bookingId, action });
            
            if (result.success) {
                toast.success(`Booking ${action}ed successfully!`);
                // Refresh the current search
                this.refreshCurrentSearch();
                this.emit('booking-updated', { bookingId, action });
            } else {
                throw new Error(result.message || `Failed to ${action} booking`);
            }
        } catch (error) {
            toast.error(`Failed to ${action} booking: ${error.message}`);
        } finally {
            toast.remove(loadingToast);
        }
    }
    
    refreshCurrentSearch() {
        // Re-run the last search if available
        if (this.state.searchResults.length > 0) {
            // Implementation depends on last search parameters
            // This is a simplified refresh
            setTimeout(() => {
                // You could store last search params in state
                this.displaySearchResults(this.state.searchResults);
            }, 1000);
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            'pending_payment': 'Pending Payment',
            'confirmed': 'Confirmed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('booking-control-container')) {
        window.bookingManager = new BookingManager('booking-control-container');
        console.log('✅ Booking Manager initialized');
    }
});
