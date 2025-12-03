/**
 * Modern Admin Booking Control System
 * Professional, clean, and fully functional
 */

class ModernAdminBookingControl extends BaseComponent {
    constructor() {
        super('create-booking-card', {
            courtConfig: {
                padel: [
                    { id: "padel-1", name: "Court 1: Teracotta Court" },
                    { id: "padel-2", name: "Court 2: Purple Mondo" }
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
        });
        
        this.selectedBookings = new Set();
        this.currentEditBooking = null;
        this.statsData = {
            pendingToday: 0,
            totalBookings: 0,
            confirmedToday: 0,
            revenueToday: 0,
            hoursBooked: 0
        };
    }

    init() {
        this.setupInitialData();
        this.bindEvents();
        this.loadDashboardStats();
        console.log('✅ Modern Admin Booking Control initialized');
    }

    setupInitialData() {
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) input.value = today;
            input.min = today;
            input.max = maxDate;
        });

        this.setupCourtDropdowns();
    }

    bindEvents() {
        // Dashboard cards
        this.addEventListener('create-booking-card', 'click', () => this.showSection('create-booking-section'));
        this.addEventListener('search-booking-card', 'click', () => this.showSection('search-booking-section'));
        this.addEventListener('bulk-operations-card', 'click', () => this.showSection('bulk-operations-section'));

        // Close buttons
        this.addEventListener('close-create-section', 'click', () => this.hideSection('create-booking-section'));
        this.addEventListener('close-search-section', 'click', () => this.hideSection('search-booking-section'));
        this.addEventListener('close-bulk-section', 'click', () => this.hideSection('bulk-operations-section'));

        // Create booking form
        this.addEventListener('create-sport', 'change', () => this.updateCourtOptions());
        this.addEventListener('create-duration', 'change', () => this.calculateAmount());
        this.addEventListener('create-booking-form', 'submit', (e) => this.handleCreateBooking(e));

        // Search methods
        document.querySelectorAll('.modern-search-method').forEach(method => {
            method.addEventListener('click', (e) => {
                const methodType = e.currentTarget.dataset.method;
                this.switchSearchMethod(methodType);
            });
        });

        // Search inputs
        this.addEventListener('booking-id-input', 'keypress', (e) => {
            if (e.key === 'Enter') this.searchBookingById();
        });
        this.addEventListener('phone-input', 'keypress', (e) => {
            if (e.key === 'Enter') this.searchBookingByPhone();
        });
        this.addEventListener('name-input', 'keypress', (e) => {
            if (e.key === 'Enter') this.searchBookingByName();
        });

        // Edit modal
        this.addEventListener('close-edit-modal', 'click', () => this.closeEditModal());
        this.addEventListener('edit-booking-form', 'submit', (e) => this.handleUpdateBooking(e));
        this.addEventListener('edit-sport', 'change', () => this.updateEditCourtOptions());
    }

    async loadDashboardStats() {
        try {
            const response = await api.get('/admin/api/dashboard-stats');
            if (response.success) {
                this.updateDashboardStats(response.data);
            }
        } catch (error) {
            console.warn('Could not load dashboard stats:', error);
            // Show placeholder data
            this.updateDashboardStats(this.statsData);
        }
    }

    updateDashboardStats(data) {
        this.statsData = { ...this.statsData, ...data };
        
        const elements = {
            'pending-bookings-count': this.statsData.pendingToday,
            'total-bookings-count': this.statsData.totalBookings,
            'confirmed-bookings-count': this.statsData.confirmedToday,
            'revenue-today': `PKR ${this.statsData.revenueToday.toLocaleString()}`,
            'hours-booked': `${this.statsData.hoursBooked}h`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.style.opacity = '0';
                setTimeout(() => element.style.opacity = '1', 100);
            }
        });
    }

    showSection(sectionId) {
        // Hide all sections first
        document.querySelectorAll('.modern-card:not([id$="-card"])').forEach(section => {
            section.classList.add('modern-hidden');
        });

        // Show target section
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.remove('modern-hidden');
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('modern-hidden');
            
            // Clear forms
            section.querySelectorAll('form').forEach(form => form.reset());
            
            // Clear results
            const resultsContainer = document.getElementById('results-container');
            if (resultsContainer) resultsContainer.innerHTML = '';
            
            const searchResults = document.getElementById('search-results');
            if (searchResults) searchResults.classList.add('modern-hidden');
        }
    }

    setupCourtDropdowns() {
        const createCourtSelect = document.getElementById('create-court');
        const editCourtSelect = document.getElementById('edit-court');

        [createCourtSelect, editCourtSelect].forEach(select => {
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

    updateEditCourtOptions() {
        const sportSelect = document.getElementById('edit-sport');
        const courtSelect = document.getElementById('edit-court');

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
    }

    calculateAmount() {
        const sportSelect = document.getElementById('create-sport');
        const durationSelect = document.getElementById('create-duration');
        const amountDisplay = document.getElementById('amount-display');
        const amountValue = document.getElementById('create-amount-display');

        if (!sportSelect || !durationSelect || !amountDisplay || !amountValue) return;

        const sport = sportSelect.value;
        const duration = parseFloat(durationSelect.value) || 0;

        if (sport && duration > 0) {
            const hourlyRate = this.options.sportPricing[sport] || 2500;
            const amount = Math.round(hourlyRate * duration);
            
            amountValue.textContent = `PKR ${amount.toLocaleString()}`;
            amountDisplay.style.display = 'block';
            
            // Add animation
            amountDisplay.style.opacity = '0';
            amountDisplay.style.transform = 'translateY(10px)';
            setTimeout(() => {
                amountDisplay.style.opacity = '1';
                amountDisplay.style.transform = 'translateY(0)';
                amountDisplay.style.transition = 'all 0.3s ease';
            }, 50);
        } else {
            amountDisplay.style.display = 'none';
        }
    }

    async handleCreateBooking(event) {
        event.preventDefault();

        const formData = this.getFormData('create-');
        
        // Validate required fields
        const requiredFields = ['sport', 'court', 'date', 'startTime', 'duration', 'playerName', 'playerPhone'];
        const errors = this.validateFormData(formData, requiredFields);
        
        if (errors.length > 0) {
            toast.error(errors.join('<br>'));
            return;
        }

        try {
            const loadingToast = toast.loading('Creating booking...');

            const response = await api.post('/admin/api/admin-create-booking', formData);

            toast.remove(loadingToast);

            if (response.success) {
                toast.success(`Booking created successfully!<br>ID: ${response.bookingId}`);
                event.target.reset();
                this.calculateAmount();
                this.loadDashboardStats();
            } else {
                throw new Error(response.message || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Create booking error:', error);
            toast.error(`Failed to create booking: ${error.message}`);
        }
    }

    getFormData(prefix) {
        const fields = [
            'sport', 'court', 'date', 'startTime', 'duration',
            'playerName', 'playerPhone', 'playerEmail', 'playerCount',
            'status', 'paymentType', 'specialRequests'
        ];

        const data = {};
        fields.forEach(field => {
            const element = document.getElementById(`${prefix}${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
            if (element) {
                data[field] = element.value;
            }
        });

        return data;
    }

    validateFormData(data, requiredFields) {
        const errors = [];

        requiredFields.forEach(field => {
            if (!data[field] || String(data[field]).trim() === '') {
                errors.push(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`);
            }
        });

        // Additional validations
        if (data.playerName && data.playerName.length < 2) {
            errors.push('Player name must be at least 2 characters');
        }

        if (data.playerPhone && data.playerPhone.length < 10) {
            errors.push('Phone number must be at least 10 digits');
        }

        if (data.playerEmail && data.playerEmail && !this.validateEmail(data.playerEmail)) {
            errors.push('Please enter a valid email address');
        }

        return errors;
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    switchSearchMethod(method) {
        // Update active method
        document.querySelectorAll('.modern-search-method').forEach(m => {
            m.classList.toggle('active', m.dataset.method === method);
        });

        // Show corresponding form
        document.querySelectorAll('.modern-search-form').forEach(form => {
            form.classList.toggle('active', form.id === `search-by-${method}`);
        });

        // Clear previous results
        const searchResults = document.getElementById('search-results');
        if (searchResults) searchResults.classList.add('modern-hidden');
    }

    async searchBookingById() {
        const id = document.getElementById('booking-id-input')?.value?.trim();
        if (!id) {
            toast.error('Please enter a booking ID');
            return;
        }
        await this.performSearch('id', id);
    }

    async searchBookingByPhone() {
        const phone = document.getElementById('phone-input')?.value?.trim();
        if (!phone) {
            toast.error('Please enter a phone number');
            return;
        }
        await this.performSearch('phone', phone);
    }

    async searchBookingByName() {
        const name = document.getElementById('name-input')?.value?.trim();
        if (!name) {
            toast.error('Please enter a player name');
            return;
        }
        await this.performSearch('name', name);
    }

    async searchBookingByDate() {
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;

        if (!startDate || !endDate) {
            toast.error('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.error('Start date must be before end date');
            return;
        }

        await this.performSearch('date', null, startDate, endDate);
    }

    async performSearch(method, value, startDate = null, endDate = null) {
        try {
            const loadingToast = toast.loading('Searching...');

            const searchData = { method };
            if (method === 'date') {
                searchData.startDate = startDate;
                searchData.endDate = endDate;
            } else {
                searchData.value = value;
            }

            const response = await api.post('/admin/api/search-bookings', searchData);

            toast.remove(loadingToast);

            if (response.success) {
                this.displaySearchResults(response.bookings);
            } else {
                throw new Error(response.message || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error(`Search failed: ${error.message}`);
        }
    }

    displaySearchResults(bookings) {
        const resultsContainer = document.getElementById('results-container');
        const searchResults = document.getElementById('search-results');
        const resultsCount = document.getElementById('results-count');

        if (!resultsContainer || !searchResults) return;

        if (resultsCount) {
            resultsCount.textContent = `${bookings.length} result${bookings.length !== 1 ? 's' : ''} found`;
        }

        if (bookings.length === 0) {
            resultsContainer.innerHTML = `
                <div class="modern-empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>No bookings found matching your criteria.</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = bookings
                .map(booking => this.createResultCard(booking))
                .join('');
        }

        searchResults.classList.remove('modern-hidden');
    }

    createResultCard(booking) {
        const statusClass = booking.status.replace('_', '-');
        const statusText = this.getStatusText(booking.status);

        return `
            <div class="modern-result-card">
                <div class="modern-result-header">
                    <div class="modern-result-id">Booking #${booking.id}</div>
                    <span class="modern-status-badge modern-status-${statusClass}">${statusText}</span>
                </div>
                
                <div class="modern-result-content">
                    <div class="modern-result-info">
                        <div class="modern-info-item">
                            <span class="modern-info-label">Player</span>
                            <span class="modern-info-value">${booking.playerName || 'N/A'}</span>
                        </div>
                        <div class="modern-info-item">
                            <span class="modern-info-label">Phone</span>
                            <span class="modern-info-value">${booking.playerPhone || 'N/A'}</span>
                        </div>
                        <div class="modern-info-item">
                            <span class="modern-info-label">Court</span>
                            <span class="modern-info-value">${(booking.sport || 'Unknown').toUpperCase()} - ${booking.courtName || 'Unknown'}</span>
                        </div>
                        <div class="modern-info-item">
                            <span class="modern-info-label">Date & Time</span>
                            <span class="modern-info-value">${booking.formatted_time || 'N/A'}</span>
                        </div>
                        <div class="modern-info-item">
                            <span class="modern-info-label">Amount</span>
                            <span class="modern-info-value">PKR ${(booking.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        <div class="modern-info-item">
                            <span class="modern-info-label">Duration</span>
                            <span class="modern-info-value">${booking.duration || 0}h</span>
                        </div>
                    </div>
                </div>
                
                <div class="modern-result-actions">
                    <button class="modern-btn modern-btn-sm modern-btn-primary" onclick="window.modernAdminBookingControl.openEditModal('${booking.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="modern-btn modern-btn-sm modern-btn-danger" onclick="window.modernAdminBookingControl.deleteBooking('${booking.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ${booking.status === 'pending_payment' ? `
                        <button class="modern-btn modern-btn-sm modern-btn-success" onclick="window.modernAdminBookingControl.confirmBooking('${booking.id}')">
                            <i class="fas fa-check"></i> Confirm
                        </button>
                    ` : ''}
                    ${booking.status === 'confirmed' ? `
                        <button class="modern-btn modern-btn-sm modern-btn-warning" onclick="window.modernAdminBookingControl.cancelBooking('${booking.id}')">
                            <i class="fas fa-ban"></i> Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            pending_payment: 'Pending Payment',
            confirmed: 'Confirmed',
            cancelled: 'Cancelled'
        };
        return statusMap[status] || status;
    }

    async confirmBooking(bookingId) {
        await this.performBookingAction(bookingId, 'confirm', 'confirm this booking');
    }

    async cancelBooking(bookingId) {
        await this.performBookingAction(bookingId, 'cancel', 'cancel this booking');
    }

    async deleteBooking(bookingId) {
        if (confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
            await this.performDeleteBooking(bookingId);
        }
    }

    async performBookingAction(bookingId, action, confirmText) {
        if (!confirm(`Are you sure you want to ${confirmText}?`)) return;

        try {
            const loadingToast = toast.loading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing booking...`);

            const response = await api.post('/admin/api/admin-booking-action', { bookingId, action });

            toast.remove(loadingToast);

            if (response.success) {
                toast.success(`Booking ${action}ed successfully!`);
                this.performSearch('id', bookingId);
                this.loadDashboardStats();
            } else {
                throw new Error(response.message || `Failed to ${action} booking`);
            }
        } catch (error) {
            console.error(`${action} booking error:`, error);
            toast.error(`Failed to ${action} booking: ${error.message}`);
        }
    }

    async performDeleteBooking(bookingId) {
        try {
            const loadingToast = toast.loading('Deleting booking...');

            const response = await api.post('/admin/api/delete-booking', { bookingId });

            toast.remove(loadingToast);

            if (response.success) {
                toast.success('Booking deleted successfully!');
                
                // Remove from results
                const resultCards = document.querySelectorAll('.modern-result-card');
                resultCards.forEach(card => {
                    if (card.innerHTML.includes(`Booking #${bookingId}`)) {
                        card.remove();
                    }
                });

                this.loadDashboardStats();
            } else {
                throw new Error(response.message || 'Failed to delete booking');
            }
        } catch (error) {
            console.error('Delete booking error:', error);
            toast.error(`Failed to delete booking: ${error.message}`);
        }
    }

    async openEditModal(bookingId) {
        try {
            const loadingToast = toast.loading('Loading booking details...');

            const response = await api.post('/admin/api/search-bookings', { method: 'id', value: bookingId });

            toast.remove(loadingToast);

            if (response.success && response.bookings.length > 0) {
                const booking = response.bookings[0];
                this.populateEditForm(booking);
                modal.show('edit-booking-modal-overlay');
            } else {
                throw new Error('Booking not found');
            }
        } catch (error) {
            console.error('Edit modal error:', error);
            toast.error(`Failed to load booking details: ${error.message}`);
        }
    }

    populateEditForm(booking) {
        this.currentEditBooking = booking;

        const fields = {
            'edit-booking-id': booking.id,
            'edit-sport': booking.sport,
            'edit-court': booking.court,
            'edit-date': booking.date,
            'edit-start-time': booking.startTime,
            'edit-duration': booking.duration,
            'edit-player-name': booking.playerName,
            'edit-player-phone': booking.playerPhone,
            'edit-player-email': booking.playerEmail || '',
            'edit-player-count': booking.playerCount || '2',
            'edit-status': booking.status,
            'edit-total-amount': booking.totalAmount,
            'edit-special-requests': booking.specialRequests || ''
        };

        // Update court options first
        this.updateEditCourtOptions();

        // Populate all fields
        Object.entries(fields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.value = value;
            }
        });
    }

    closeEditModal() {
        modal.hide('edit-booking-modal-overlay');
        const form = document.getElementById('edit-booking-form');
        if (form) form.reset();
        this.currentEditBooking = null;
    }

    async handleUpdateBooking(event) {
        event.preventDefault();

        try {
            const formData = this.getFormData('edit-');
            formData.bookingId = document.getElementById('edit-booking-id')?.value;

            const loadingToast = toast.loading('Updating booking...');

            const response = await api.post('/admin/api/update-booking', formData);

            toast.remove(loadingToast);

            if (response.success) {
                toast.success('Booking updated successfully!');
                this.closeEditModal();
                this.performSearch('id', formData.bookingId);
                this.loadDashboardStats();
            } else {
                throw new Error(response.message || 'Failed to update booking');
            }
        } catch (error) {
            console.error('Update booking error:', error);
            toast.error(`Failed to update booking: ${error.message}`);
        }
    }
}

// Global functions for onclick handlers
window.closeCreateSection = () => window.modernAdminBookingControl?.hideSection('create-booking-section');
window.searchBookingById = () => window.modernAdminBookingControl?.searchBookingById();
window.searchBookingByPhone = () => window.modernAdminBookingControl?.searchBookingByPhone();
window.searchBookingByName = () => window.modernAdminBookingControl?.searchBookingByName();
window.searchBookingByDate = () => window.modernAdminBookingControl?.searchBookingByDate();
window.closeEditModal = () => window.modernAdminBookingControl?.closeEditModal();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Modern Admin Booking Control...');
    window.modernAdminBookingControl = new ModernAdminBookingControl();
});

console.log('✅ Modern Admin Booking Control script loaded');
