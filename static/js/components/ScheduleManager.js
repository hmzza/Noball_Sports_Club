/**
 * Modern Schedule Manager Component
 * Handles schedule view with proper cell rendering and booking display
 */

class ScheduleManager extends BaseComponent {
    getDefaultOptions() {
        return {
            courtConfig: {
                padel: [
                    { id: "padel-1", name: "Court 1: Purple Mondo", pricing: 5500 },
                    { id: "padel-2", name: "Court 2: Teracotta Court", pricing: 5500 }
                ],
                cricket: [
                    { id: "cricket-1", name: "Court 1: 110x50ft", pricing: 3000 },
                    { id: "cricket-2", name: "Court 2: 130x60ft Multi", pricing: 3000 }
                ],
                futsal: [
                    { id: "futsal-1", name: "Court 1: 130x60ft Multi", pricing: 2500 }
                ],
                pickleball: [
                    { id: "pickleball-1", name: "Court 1: Professional", pricing: 2500 }
                ]
            },
            multiPurposeCourts: {
                "cricket-2": "multi-130x60",
                "futsal-1": "multi-130x60"
            },
            timeSlotHeight: 40,
            animationDuration: 300
        };
    }
    
    init() {
        super.init();
        this.setState({
            currentDate: new Date(),
            currentView: 'week',
            scheduleData: {},
            selectedSlot: null,
            isLoading: false,
            filters: {
                sport: null
            }
        });
        
        this.timeSlots = this.generateTimeSlots();
        this.setupInitialDate();
        setTimeout(() => this.loadScheduleData(), 100);
    }
    
    generateTimeSlots() {
        const slots = [];
        for (let hour = 6; hour < 24; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }
    
    setupInitialDate() {
        const dateInput = document.getElementById('schedule-date');
        if (dateInput) {
            dateInput.value = this.state.currentDate.toISOString().split('T')[0];
            this.updateDateDisplay();
            
            const today = new Date();
            const maxDate = new Date();
            maxDate.setDate(today.getDate() + 90);
            
            dateInput.min = today.toISOString().split('T')[0];
            dateInput.max = maxDate.toISOString().split('T')[0];
        }
    }
    
    bindEvents() {
        // Navigation
        this.addEventListener('prev-week', 'click', () => this.navigateDate(-7));
        this.addEventListener('next-week', 'click', () => this.navigateDate(7));
        this.addEventListener('schedule-date', 'change', (e) => this.handleDateChange(e));
        
        // View toggle
        this.addEventListener('week-view', 'click', () => this.switchView('week'));
        this.addEventListener('day-view', 'click', () => this.switchView('day'));
        
        // Filters and refresh
        this.addEventListener('sport-filter', 'change', () => this.applyFilters());
        this.addEventListener('refresh-schedule', 'click', () => this.refreshSchedule());
        
        // Modal controls
        this.addEventListener('close-modal', 'click', () => this.closeSlotModal());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateDate(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateDate(1);
                break;
            case 'r':
                e.preventDefault();
                this.refreshSchedule();
                break;
            case 'Escape':
                this.closeSlotModal();
                break;
        }
    }
    
    async loadScheduleData() {
        this.setState({ isLoading: true });
        this.showLoading(true);
        
        try {
            const dateRange = this.getDateRange();
            const requestData = {
                startDate: dateRange.start.toISOString().split('T')[0],
                endDate: dateRange.end.toISOString().split('T')[0],
                sport: this.state.filters.sport || ''
            };
            
            console.log('📅 Loading schedule data:', requestData);
            
            const result = await api.post('/schedule-data', requestData);
            
            if (result.success) {
                this.setState({ scheduleData: result.schedule || {} });
                this.renderSchedule();
                this.showScheduleStats();
            } else {
                throw new Error(result.message || 'Failed to load schedule');
            }
        } catch (error) {
            console.error('❌ Schedule loading error:', error);
            toast.error(`Failed to load schedule: ${error.message}`);
            this.setState({ scheduleData: {} });
            this.renderSchedule();
        } finally {
            this.setState({ isLoading: false });
            this.showLoading(false);
        }
    }
    
    getDateRange() {
        if (this.state.currentView === 'week') {
            const start = this.getWeekStartDate(this.state.currentDate);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return { start, end };
        } else {
            const date = new Date(this.state.currentDate);
            return { start: date, end: date };
        }
    }
    
    getWeekStartDate(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return start;
    }
    
    renderSchedule() {
        const grid = document.getElementById('schedule-grid');
        if (!grid) {
            console.error('❌ Schedule grid not found');
            return;
        }
        
        // Clear and setup grid
        grid.innerHTML = '';
        grid.className = `schedule-grid ${this.state.currentView}-view`;
        
        try {
            if (this.state.currentView === 'week') {
                this.renderWeekView(grid);
            } else {
                this.renderDayView(grid);
            }
            
            console.log('✅ Schedule rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering schedule:', error);
            this.renderErrorState(grid);
        }
    }
    
    renderWeekView(grid) {
        const startDate = this.getWeekStartDate(this.state.currentDate);
        const days = ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        // Setup grid layout
        grid.style.gridTemplateColumns = '100px repeat(7, 1fr)';
        grid.style.gridTemplateRows = `60px repeat(${this.timeSlots.length}, ${this.options.timeSlotHeight}px)`;
        
        // Render headers
        this.renderWeekHeaders(grid, days, startDate);
        
        // Render time slots
        this.renderWeekTimeSlots(grid, startDate);
    }
    
    renderWeekHeaders(grid, days, startDate) {
        days.forEach((day, index) => {
            const header = document.createElement('div');
            
            if (index === 0) {
                header.className = 'time-header';
                header.textContent = 'Time';
            } else {
                header.className = 'day-header';
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (index - 1));
                
                const isToday = this.isToday(date);
                if (isToday) header.classList.add('today');
                
                header.innerHTML = `
                    <div class="day-name">${day}</div>
                    <div class="day-date">${date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                    })}</div>
                `;
            }
            
            grid.appendChild(header);
        });
    }
    
    renderWeekTimeSlots(grid, startDate) {
        this.timeSlots.forEach((time, timeIndex) => {
            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = Utils.formatTime(time);
            grid.appendChild(timeLabel);
            
            // Day slots
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const slotDate = new Date(startDate);
                slotDate.setDate(startDate.getDate() + dayOffset);
                const dateStr = slotDate.toISOString().split('T')[0];
                
                const slot = this.createTimeSlot(dateStr, time, 'all-courts', timeIndex);
                grid.appendChild(slot);
            }
        });
    }
    
    renderDayView(grid) {
        const courts = this.getAllCourts();
        const dateStr = this.state.currentDate.toISOString().split('T')[0];
        
        // Setup grid layout
        grid.style.gridTemplateColumns = `120px repeat(${courts.length}, 1fr)`;
        grid.style.gridTemplateRows = `60px repeat(${this.timeSlots.length}, ${this.options.timeSlotHeight + 10}px)`;
        
        // Render headers
        this.renderDayHeaders(grid, courts);
        
        // Render time slots with booking data
        this.renderDayTimeSlots(grid, courts, dateStr);
    }
    
    renderDayHeaders(grid, courts) {
        // Time header
        const timeHeader = document.createElement('div');
        timeHeader.className = 'time-header';
        timeHeader.textContent = 'Time';
        grid.appendChild(timeHeader);
        
        // Court headers
        courts.forEach(court => {
            const courtHeader = document.createElement('div');
            courtHeader.className = 'court-header';
            courtHeader.innerHTML = `
                <div class="sport-name">${court.sport.toUpperCase()}</div>
                <div class="court-name">${court.name}</div>
                <div class="court-pricing">${Utils.formatCurrency(court.pricing)}/hr</div>
            `;
            grid.appendChild(courtHeader);
        });
    }
    
    renderDayTimeSlots(grid, courts, dateStr) {
        this.timeSlots.forEach((time, timeIndex) => {
            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = Utils.formatTime(time);
            
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const isCurrentTimeSlot = dateStr === now.toISOString().split('T')[0] && time === currentTime.substring(0, 5);
            
            if (isCurrentTimeSlot) {
                timeLabel.classList.add('current-time');
            }
            
            grid.appendChild(timeLabel);
            
            // Court slots
            courts.forEach(court => {
                const slot = this.createTimeSlot(dateStr, time, court.id, timeIndex);
                grid.appendChild(slot);
            });
        });
    }
    
    createTimeSlot(date, time, courtId, timeIndex) {
        const slot = document.createElement('div');
        slot.className = 'time-slot available';
        slot.dataset.date = date;
        slot.dataset.time = time;
        slot.dataset.court = courtId;
        slot.dataset.timeIndex = timeIndex;
        
        try {
            // Process booking data for this slot
            const bookingData = this.processSlotBookings(date, time, courtId);
            
            if (bookingData) {
                this.renderBookedSlot(slot, bookingData);
            } else {
                this.renderAvailableSlot(slot, time);
            }
            
            // Add click handler
            slot.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSlotClick(slot, bookingData);
            });
            
            // Add hover effects
            slot.addEventListener('mouseenter', () => this.handleSlotHover(slot, true));
            slot.addEventListener('mouseleave', () => this.handleSlotHover(slot, false));
            
        } catch (error) {
            console.error(`❌ Error creating slot for ${courtId} at ${time}:`, error);
            this.renderErrorSlot(slot);
        }
        
        return slot;
    }
    
    processSlotBookings(date, time, courtId) {
        const scheduleData = this.state.scheduleData;
        if (!scheduleData || !scheduleData[date]) {
            return null;
        }
        
        // Direct booking check
        if (courtId !== 'all-courts') {
            const courtData = scheduleData[date][courtId];
            if (courtData && courtData[time]) {
                return courtData[time];
            }
            
            // Check multi-purpose court conflicts
            return this.checkMultiPurposeConflict(date, time, courtId, scheduleData);
        }
        
        // Week view - check all courts
        return this.findBookingInAllCourts(date, time, scheduleData);
    }
    
    checkMultiPurposeConflict(date, time, courtId, scheduleData) {
        if (!this.options.multiPurposeCourts[courtId]) {
            return null;
        }
        
        const multiCourtType = this.options.multiPurposeCourts[courtId];
        const conflictingCourts = Object.keys(this.options.multiPurposeCourts)
            .filter(id => this.options.multiPurposeCourts[id] === multiCourtType && id !== courtId);
        
        for (const conflictCourt of conflictingCourts) {
            if (scheduleData[date][conflictCourt] && scheduleData[date][conflictCourt][time]) {
                const conflictData = scheduleData[date][conflictCourt][time];
                return {
                    ...conflictData,
                    status: 'booked-conflict',
                    title: `${conflictData.title} (${this.getSportFromCourt(conflictCourt)})`,
                    subtitle: `${conflictData.subtitle} - Multi Court Booked`
                };
            }
        }
        
        return null;
    }
    
    findBookingInAllCourts(date, time, scheduleData) {
        const allCourts = this.getAllCourts();
        
        for (const court of allCourts) {
            const booking = this.processSlotBookings(date, time, court.id);
            if (booking) {
                return {
                    ...booking,
                    title: `${booking.title} (${court.sport.toUpperCase()})`,
                    subtitle: `${booking.subtitle} - ${court.name}`
                };
            }
        }
        
        return null;
    }
    
    renderBookedSlot(slot, bookingData) {
        const statusClass = bookingData.status || 'booked-pending';
        slot.className = `time-slot ${statusClass}`;
        
        const statusColors = {
            'booked-pending': { bg: '#ffc107', border: '#e0a800' },
            'booked-confirmed': { bg: '#28a745', border: '#1e7e34' },
            'booked-conflict': { bg: '#dc3545', border: '#bd2130' },
            'booked-cancelled': { bg: '#6c757d', border: '#545b62' }
        };
        
        const colors = statusColors[statusClass] || statusColors['booked-pending'];
        
        slot.style.backgroundColor = colors.bg;
        slot.style.borderColor = colors.border;
        slot.style.color = 'white';
        slot.style.fontWeight = '600';
        
        slot.innerHTML = `
            <div class="slot-content">
                <div class="slot-title">${bookingData.title || 'Booked'}</div>
                ${bookingData.subtitle ? `<div class="slot-subtitle">${bookingData.subtitle}</div>` : ''}
                ${bookingData.duration ? `<div class="slot-duration">${bookingData.duration}h</div>` : ''}
            </div>
        `;
        
        // Add booking indicator
        slot.classList.add('booked');
    }
    
    renderAvailableSlot(slot, time) {
        slot.innerHTML = `
            <div class="slot-content">
                <div class="slot-title">Available</div>
                <div class="slot-time">${Utils.formatTime(time)}</div>
            </div>
        `;
        
        // Style available slots
        slot.style.backgroundColor = '#f8f9fa';
        slot.style.borderColor = '#dee2e6';
        slot.style.color = '#6c757d';
    }
    
    renderErrorSlot(slot) {
        slot.className = 'time-slot error';
        slot.innerHTML = `
            <div class="slot-content">
                <div class="slot-title" style="color: #dc3545;">Error</div>
            </div>
        `;
        slot.style.backgroundColor = '#f8d7da';
        slot.style.borderColor = '#f5c6cb';
    }
    
    renderErrorState(grid) {
        grid.innerHTML = `
            <div class="schedule-error">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;"></i>
                <h3>Error loading schedule</h3>
                <p>Please try refreshing the page</p>
                <button onclick="window.location.reload()" class="btn btn-primary">
                    <i class="fas fa-sync"></i> Refresh Page
                </button>
            </div>
        `;
    }
    
    handleSlotClick(slot, bookingData) {
        console.log('🖱️ Slot clicked:', { 
            date: slot.dataset.date, 
            time: slot.dataset.time, 
            court: slot.dataset.court,
            bookingData 
        });
        
        this.setState({ 
            selectedSlot: {
                element: slot,
                date: slot.dataset.date,
                time: slot.dataset.time,
                court: slot.dataset.court,
                data: bookingData
            }
        });
        
        this.openSlotModal(bookingData);
    }
    
    handleSlotHover(slot, isHover) {
        if (isHover) {
            slot.style.transform = 'scale(1.02)';
            slot.style.zIndex = '10';
        } else {
            slot.style.transform = 'scale(1)';
            slot.style.zIndex = '1';
        }
    }
    
    openSlotModal(slotData) {
        // Implementation for slot modal
        // This would show booking details or quick book form
        console.log('📱 Opening slot modal:', slotData);
        
        if (slotData) {
            this.showBookingModal(slotData);
        } else {
            this.showQuickBookModal();
        }
    }
    
    showBookingModal(bookingData) {
        // Show existing booking details
        modal.show('booking-details-modal');
        this.populateBookingModal(bookingData);
    }
    
    showQuickBookModal() {
        // Show quick booking form
        modal.show('quick-book-modal');
        this.setupQuickBookForm();
    }
    
    populateBookingModal(bookingData) {
        // Populate modal with booking details
        const elements = {
            'modal-booking-id': bookingData.bookingId,
            'modal-player-name': bookingData.playerName,
            'modal-phone': bookingData.playerPhone,
            'modal-amount': Utils.formatCurrency(bookingData.amount || 0),
            'modal-duration': `${bookingData.duration || 1} hours`,
            'modal-status': this.getStatusText(bookingData.status)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    closeSlotModal() {
        modal.closeAll();
        this.setState({ selectedSlot: null });
    }
    
    navigateDate(days) {
        const newDate = new Date(this.state.currentDate);
        newDate.setDate(newDate.getDate() + days);
        
        this.setState({ currentDate: newDate });
        this.updateDateInput();
        this.updateDateDisplay();
        this.loadScheduleData();
    }
    
    handleDateChange(event) {
        const newDate = new Date(event.target.value);
        this.setState({ currentDate: newDate });
        this.updateDateDisplay();
        this.loadScheduleData();
    }
    
    switchView(view) {
        if (this.state.currentView === view) return;
        
        this.setState({ currentView: view });
        
        // Update UI buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.updateDateDisplay();
        this.loadScheduleData();
    }
    
    updateDateInput() {
        const dateInput = document.getElementById('schedule-date');
        if (dateInput) {
            dateInput.value = this.state.currentDate.toISOString().split('T')[0];
        }
    }
    
    updateDateDisplay() {
        const display = document.getElementById('date-display');
        if (!display) return;
        
        if (this.state.currentView === 'week') {
            const startDate = this.getWeekStartDate(this.state.currentDate);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            
            display.textContent = `Week of ${startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })} - ${endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}`;
        } else {
            display.textContent = Utils.formatDate(this.state.currentDate.toISOString().split('T')[0]);
        }
    }
    
    applyFilters() {
        const sportFilter = document.getElementById('sport-filter');
        const sport = sportFilter?.value || null;
        
        this.setState({ 
            filters: { ...this.state.filters, sport }
        });
        
        this.loadScheduleData();
    }
    
    refreshSchedule() {
        const btn = document.getElementById('refresh-schedule');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.style.animation = 'spin 1s linear infinite';
                setTimeout(() => { icon.style.animation = ''; }, 1000);
            }
        }
        
        this.loadScheduleData();
    }
    
    showScheduleStats() {
        const scheduleData = this.state.scheduleData;
        let totalBookings = 0;
        
        Object.keys(scheduleData).forEach(date => {
            Object.keys(scheduleData[date] || {}).forEach(court => {
                totalBookings += Object.keys(scheduleData[date][court] || {}).length;
            });
        });
        
        if (totalBookings > 0) {
            toast.success(`Loaded ${totalBookings} bookings successfully`);
        }
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
                overlay.style.display = 'flex';
            } else {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }
        }
    }
    
    getAllCourts() {
        const sportFilter = this.state.filters.sport;
        let courts = [];
        
        if (sportFilter && this.options.courtConfig[sportFilter]) {
            courts = this.options.courtConfig[sportFilter].map(court => ({
                ...court,
                sport: sportFilter
            }));
        } else {
            const sportOrder = ['padel', 'cricket', 'futsal', 'pickleball'];
            sportOrder.forEach(sport => {
                if (this.options.courtConfig[sport]) {
                    this.options.courtConfig[sport].forEach(court => {
                        courts.push({ ...court, sport });
                    });
                }
            });
        }
        
        return courts;
    }
    
    getSportFromCourt(courtId) {
        for (const sport in this.options.courtConfig) {
            const court = this.options.courtConfig[sport].find(c => c.id === courtId);
            if (court) return sport.toUpperCase();
        }
        return 'UNKNOWN';
    }
    
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    
    getStatusText(status) {
        const statusMap = {
            'available': 'Available',
            'booked-pending': 'Pending Payment',
            'booked-confirmed': 'Confirmed',
            'booked-conflict': 'Multi-Court Booking',
            'booked-cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('schedule-container')) {
        window.scheduleManager = new ScheduleManager('schedule-container');
        console.log('✅ Schedule Manager initialized');
    }
});